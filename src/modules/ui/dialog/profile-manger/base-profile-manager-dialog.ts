import { ButtonStyle, CE, createButton, renderPresetsList } from "@/utils/html";
import { NavigationDialog } from "../navigation-dialog";
import { BxIcon } from "@/utils/bx-icon";
import { t } from "@/utils/translation";
import type { AllPresets, PresetRecord } from "@/types/presets";
import type { BasePresetsTable } from "@/utils/local-db/base-presets-table";
import { BxSelectElement } from "@/web-components/bx-select";

export abstract class BaseProfileManagerDialog<T extends PresetRecord> extends NavigationDialog {
    $container!: HTMLElement;

    private title: string;
    protected presetsDb: BasePresetsTable<T>;
    protected allPresets!: AllPresets<T>;
    protected currentPresetId: number = 0;

    private $presets!: HTMLSelectElement;
    private $header!: HTMLElement;
    private $defaultNote!: HTMLElement;
    protected $content!: HTMLElement;

    private $btnRename!: HTMLButtonElement;
    private $btnDelete!: HTMLButtonElement;

    protected abstract readonly BLANK_PRESET_DATA: T['data'];

    constructor(title: string, presetsDb: BasePresetsTable<T>) {
        super();

        this.title = title;
        this.presetsDb = presetsDb;
    }

    protected abstract switchPreset(id: number): void;

    protected updateButtonStates() {
        const isDefaultPreset = this.currentPresetId <= 0;
        this.$btnRename.disabled = isDefaultPreset;
        this.$btnDelete.disabled = isDefaultPreset;
        this.$defaultNote.classList.toggle('bx-gone', !isDefaultPreset);
    }

    private async renderPresetsList() {
        this.allPresets = await this.presetsDb.getPresets();
        if (!this.currentPresetId) {
           this.currentPresetId = this.allPresets.default[0];
        }

        renderPresetsList<T>(this.$presets, this.allPresets, this.currentPresetId);
    }

    private promptNewName(action: string,value='') {
        let newName: string | null = '';
        while (!newName) {
            newName = prompt(`[${action}] ${t('prompt-preset-name')}`, value);
            if (newName === null) {
                return false;
            }
            newName = newName.trim();
        }

        return newName ? newName : false;
    };

    private async renderDialog() {
        this.$presets = CE<HTMLSelectElement>('select', { tabindex: -1 });

        const $select = BxSelectElement.create(this.$presets);
        $select.classList.add('bx-full-width');
        $select.addEventListener('input', e => {
            this.switchPreset(parseInt(($select as HTMLSelectElement).value));
        });

        const $header = CE('div', {
            class: 'bx-dialog-preset-tools',
            _nearby: {
                orientation: 'horizontal',
                focus: $select,
            },
        },
            $select,

            // Rename button
            this.$btnRename = createButton({
                title: t('rename'),
                icon: BxIcon.CURSOR_TEXT,
                style: ButtonStyle.FOCUSABLE,
                onClick: async () => {
                    const preset = this.allPresets.data[this.currentPresetId];

                    const newName = this.promptNewName(t('rename'), preset.name);
                    if (!newName) {
                        return;
                    }

                    // Update preset with new name
                    preset.name = newName;

                    await this.presetsDb.updatePreset(preset);
                    await this.refresh();
                },
            }),

            // Delete button
            this.$btnDelete = createButton({
                icon: BxIcon.TRASH,
                title: t('delete'),
                style: ButtonStyle.DANGER | ButtonStyle.FOCUSABLE,
                onClick: async (e) => {
                    if (!confirm(t('confirm-delete-preset'))) {
                        return;
                    }

                    await this.presetsDb.deletePreset(this.currentPresetId);
                    delete this.allPresets.data[this.currentPresetId];
                    this.currentPresetId = parseInt(Object.keys(this.allPresets.data)[0]);

                    await this.refresh();
                },
            }),

            // New button
            createButton({
                icon: BxIcon.NEW,
                title: t('new'),
                style: ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY,
                onClick: async (e) => {
                    const newName = this.promptNewName(t('new'));
                    if (!newName) {
                        return;
                    }

                    // Create new preset selected name
                    const newId = await this.presetsDb.newPreset(newName, this.BLANK_PRESET_DATA);
                    this.currentPresetId = newId;

                    await this.refresh();
                },
            }),

            // Copy button
            createButton({
                icon: BxIcon.COPY,
                title: t('copy'),
                style: ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY,
                onClick: async (e) => {
                    const preset = this.allPresets.data[this.currentPresetId];

                    const newName = this.promptNewName(t('copy'), `${preset.name} (2)`);
                    if (!newName) {
                        return;
                    }

                    // Create new preset with selected name
                    const newId = await this.presetsDb.newPreset(newName, preset.data);
                    this.currentPresetId = newId;

                    await this.refresh();
                },
            }),
        );
        this.$header = $header;

        this.$container = CE('div', { class: 'bx-centered-dialog' },
            CE('div', { class: 'bx-dialog-title' },
                CE('p', {}, this.title),
                createButton({
                    icon: BxIcon.CLOSE,
                    style: ButtonStyle.FOCUSABLE | ButtonStyle.CIRCULAR | ButtonStyle.GHOST,
                    onClick: e => this.hide(),
                }),
            ),
            CE('div', {},
                $header,
                this.$defaultNote = CE('div', { class: 'bx-default-preset-note bx-gone' }, t('default-preset-note')),
            ),
            CE('div', { class: 'bx-dialog-content bx-hide-scroll-bar' }, this.$content),
        );
    }

    async refresh() {
        await this.renderPresetsList();
        this.switchPreset(this.currentPresetId);
    }

    async onBeforeMount(configs:{ id?: number }={}) {
        if (configs?.id) {
            this.currentPresetId = configs.id;
        }

        // Select first preset
        this.refresh();
    }

    getDialog(): NavigationDialog {
        return this;
    }

    getContent(): HTMLElement {
        if (!this.$container) {
            this.renderDialog();
        }

        return this.$container;
    }

    focusIfNeeded(): void {
        this.dialogManager.focus(this.$header);
    }
}
