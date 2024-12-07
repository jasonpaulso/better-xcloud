import { t } from "@/utils/translation";
import { BaseProfileManagerDialog } from "./base-profile-manager-dialog";
import { CE } from "@/utils/html";
import { GamepadKey, GamepadKeyName } from "@/enums/gamepad";
import { PrefKey } from "@/enums/pref-keys";
import { PrompFont } from "@/enums/prompt-font";
import { ShortcutAction } from "@/enums/shortcut-actions";
import { deepClone } from "@/utils/global";
import { setNearby } from "@/utils/navigation-utils";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { BxSelectElement } from "@/web-components/bx-select";
import type { ControllerShortcutPresetData, ControllerShortcutPresetRecord } from "@/types/presets";
import { ControllerShortcutsTable } from "@/utils/local-db/controller-shortcuts-table";
import { BxEvent } from "@/utils/bx-event";
import { StreamSettings } from "@/utils/stream-settings";
import { SHORTCUT_ACTIONS } from "@/modules/shortcuts/shortcut-actions";

export class ControllerShortcutsManagerDialog extends BaseProfileManagerDialog<ControllerShortcutPresetRecord> {
    private static instance: ControllerShortcutsManagerDialog;
    public static getInstance = () => ControllerShortcutsManagerDialog.instance ?? (ControllerShortcutsManagerDialog.instance = new ControllerShortcutsManagerDialog(t('controller-shortcuts')));
    // private readonly LOG_TAG = 'ControllerShortcutsManagerDialog';

    protected $content: HTMLElement;
    private selectActions: Partial<Record<GamepadKey, [HTMLSelectElement, HTMLSelectElement | null]>> = {};

    protected readonly BLANK_PRESET_DATA = {
        mapping: {},
    };

    private readonly BUTTONS_ORDER = [
        GamepadKey.Y, GamepadKey.A, GamepadKey.X, GamepadKey.B,
        GamepadKey.UP, GamepadKey.DOWN, GamepadKey.LEFT, GamepadKey.RIGHT,
        GamepadKey.SELECT, GamepadKey.START,
        GamepadKey.LB, GamepadKey.RB,
        GamepadKey.LT, GamepadKey.RT,
        GamepadKey.L3, GamepadKey.R3,
    ];

    constructor(title: string) {
        super(title, ControllerShortcutsTable.getInstance());

        const PREF_CONTROLLER_FRIENDLY_UI = getPref(PrefKey.UI_CONTROLLER_FRIENDLY);

        // Read actions from localStorage
        // ControllerShortcut.ACTIONS = ControllerShortcut.getActionsFromStorage();

        const $baseSelect = CE<HTMLSelectElement>('select', { autocomplete: 'off' }, CE('option', { value: '' }, '---'));
        for (const groupLabel in SHORTCUT_ACTIONS) {
            const items = SHORTCUT_ACTIONS[groupLabel];
            if (!items) {
                continue;
            }

            const $optGroup = CE<HTMLOptGroupElement>('optgroup', { label: groupLabel });
            for (const action in items) {
                const crumbs = items[action as keyof typeof items];
                if (!crumbs) {
                    continue;
                }

                const label = crumbs.join(' ❯ ');
                const $option = CE<HTMLOptionElement>('option', { value: action }, label);
                $optGroup.appendChild($option);
            }

            $baseSelect.appendChild($optGroup);
        }

        const $content = CE('div', {
            class: 'bx-controller-shortcuts-manager-container',
        });

        const onActionChanged = (e: Event) => {
            const $target = e.target as HTMLSelectElement;

            // const profile = $selectProfile.value;
            // const button: unknown = $target.dataset.button;
            const action = $target.value as ShortcutAction;

            if (!PREF_CONTROLLER_FRIENDLY_UI) {
                const $fakeSelect = $target.previousElementSibling! as HTMLSelectElement;
                let fakeText = '---';
                if (action) {
                    const $selectedOption =  $target.options[$target.selectedIndex];
                    const $optGroup = $selectedOption.parentElement as HTMLOptGroupElement;
                    fakeText = $optGroup.label + ' ❯ ' + $selectedOption.text;
                }
                ($fakeSelect.firstElementChild as HTMLOptionElement).text = fakeText;
            }

            // Update preset
            if (!(e as any).ignoreOnChange) {
                this.updatePreset();
            }
        };

        const fragment = document.createDocumentFragment();
        fragment.appendChild(CE('p', { class: 'bx-shortcut-note' },
            CE('span', { class: 'bx-prompt' }, PrompFont.HOME),
            ': ' + t('controller-shortcuts-xbox-note'),
        ));

        for (const button of this.BUTTONS_ORDER) {
            const prompt = GamepadKeyName[button][1];

            const $row = CE('div', {
                class: 'bx-shortcut-row',
                _nearby: {
                    orientation: 'horizontal',
                },
            });
            const $label = CE('label', { class: 'bx-prompt' }, `${PrompFont.HOME}${prompt}`);
            const $div = CE('div', { class: 'bx-shortcut-actions' });

            let $fakeSelect: HTMLSelectElement | null = null;
            if (!PREF_CONTROLLER_FRIENDLY_UI) {
                $fakeSelect = CE<HTMLSelectElement>('select', { autocomplete: 'off' },
                    CE('option', {}, '---'),
                );

                $div.appendChild($fakeSelect);
            }

            const $select = BxSelectElement.create($baseSelect.cloneNode(true) as HTMLSelectElement);
            $select.dataset.button = button.toString();
            $select.classList.add('bx-full-width');
            $select.addEventListener('input', onActionChanged);

            this.selectActions[button] = [$select, $fakeSelect];

            $div.appendChild($select);
            setNearby($row, {
                focus: $select,
            });

            $row.append($label, $div);
            fragment.appendChild($row);
        }

        $content.appendChild(fragment);

        this.$content = $content;
    }

    protected switchPreset(id: number): void {
        const preset = this.allPresets.data[id];
        if (!preset) {
            this.currentPresetId = 0;
            return;
        }

        this.currentPresetId = id;
        const isDefaultPreset = id <= 0;
        const actions = preset.data;

        // Reset selects' values
        let button: unknown;
        for (button in this.selectActions) {
            const [$select, $fakeSelect] = this.selectActions[button as GamepadKey]!;
            $select.value = actions.mapping[button as GamepadKey] || '';
            $select.disabled = isDefaultPreset;
            $fakeSelect && ($fakeSelect.disabled = isDefaultPreset);

            BxEvent.dispatch($select, 'input', {
                ignoreOnChange: true,
                manualTrigger: true,
            });
        }

        super.updateButtonStates();
    }

    private updatePreset() {
        const newData: ControllerShortcutPresetData = deepClone(this.BLANK_PRESET_DATA);

        let button: unknown;
        for (button in this.selectActions) {
            const [$select, _] = this.selectActions[button as GamepadKey]!;

            const action = $select.value;
            if (!action) {
                continue;
            }

            newData.mapping[button as GamepadKey] = action as ShortcutAction;
        }

        const preset = this.allPresets.data[this.currentPresetId];
        preset.data = newData;
        this.presetsDb.updatePreset(preset);

        StreamSettings.refreshControllerSettings();
    }
}
