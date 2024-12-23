import { BxEvent } from "@/utils/bx-event";
import { getUniqueGamepadNames } from "@/utils/gamepad";
import { CE, removeChildElements, createButton, ButtonStyle, createSettingRow, renderPresetsList, calculateSelectBoxes } from "@/utils/html";
import { t } from "@/utils/translation";
import { BxSelectElement } from "@/web-components/bx-select";
import { ControllerShortcutsManagerDialog } from "../profile-manger/controller-shortcuts-manager-dialog";
import type { SettingsDialog } from "../settings-dialog";
import { ControllerShortcutsTable } from "@/utils/local-db/controller-shortcuts-table";
import { ControllerSettingsTable } from "@/utils/local-db/controller-settings-table";
import { StreamSettings } from "@/utils/stream-settings";
import { ControllerCustomizationsTable } from "@/utils/local-db/controller-customizations-table";
import { ControllerCustomizationsManagerDialog } from "../profile-manger/controller-customizations-manager-dialog";
import { BxIcon } from "@/utils/bx-icon";

export class ControllerExtraSettings extends HTMLElement {
    currentControllerId!: string;
    controllerIds!: string[];

    $selectControllers!: BxSelectElement;
    $selectShortcuts!: BxSelectElement;
    $selectCustomization!: BxSelectElement;
    $summaryCustomization!: HTMLElement;

    updateLayout!: typeof ControllerExtraSettings['updateLayout'];
    switchController!: typeof ControllerExtraSettings['switchController'];
    getCurrentControllerId!: typeof ControllerExtraSettings['getCurrentControllerId'];
    saveSettings!: typeof ControllerExtraSettings['saveSettings'];
    updateCustomizationSummary!: typeof ControllerExtraSettings['updateCustomizationSummary'];

    static renderSettings(this: SettingsDialog): HTMLElement {
        const $container = CE('label', {
            class: 'bx-settings-row bx-controller-extra-settings',
        }) as unknown as ControllerExtraSettings;

        $container.updateLayout = ControllerExtraSettings.updateLayout.bind($container);
        $container.switchController = ControllerExtraSettings.switchController.bind($container);
        $container.getCurrentControllerId = ControllerExtraSettings.getCurrentControllerId.bind($container);
        $container.saveSettings = ControllerExtraSettings.saveSettings.bind($container);

        const $selectControllers = BxSelectElement.create(CE('select', {
            class: 'bx-full-width',
            autocomplete: 'off',
            _on: {
                input: (e: Event) => {
                    $container.switchController($selectControllers.value);
                },
            },
        }));

        const $selectShortcuts = BxSelectElement.create(CE('select', {
            autocomplete: 'off',
            _on: { input: $container.saveSettings },
        }));

        const $selectCustomization = BxSelectElement.create(CE('select', {
            autocomplete: 'off',
            _on: {
                input: async () => {
                    // Update summary
                    ControllerExtraSettings.updateCustomizationSummary.call($container);
                    // Save settings
                    $container.saveSettings();
                },
            },
        }));

        const $rowCustomization = createSettingRow(
            t('in-game-controller-customization'),
            CE('div', {
                class: 'bx-preset-row',
                _nearby: { orientation: 'horizontal' },
            },
                $selectCustomization,
                createButton({
                    title: t('manage'),
                    icon: BxIcon.MANAGE,
                    style: ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY | ButtonStyle.AUTO_HEIGHT,
                    onClick: () => ControllerCustomizationsManagerDialog.getInstance().show({
                        id: $container.$selectCustomization.value ? parseInt($container.$selectCustomization.value) : null,
                    }),
                }),
            ),
            {
                multiLines: true,
            },
        );
        $rowCustomization.appendChild(
            $container.$summaryCustomization = CE('div'),
        );

        $container.append(
            CE('span', false, t('no-controllers-connected')),
            CE('div', { class: 'bx-controller-extra-wrapper' },
                $selectControllers,

                CE('div', { class: 'bx-sub-content-box' },
                    createSettingRow(
                        t('in-game-controller-shortcuts'),
                        CE('div', {
                            class: 'bx-preset-row',
                            _nearby: { orientation: 'horizontal' },
                        },
                            $selectShortcuts,
                            createButton({
                                title: t('manage'),
                                icon: BxIcon.MANAGE,
                                style: ButtonStyle.FOCUSABLE | ButtonStyle.PRIMARY | ButtonStyle.AUTO_HEIGHT,
                                onClick: () => ControllerShortcutsManagerDialog.getInstance().show({
                                    id: parseInt($container.$selectShortcuts.value),
                                }),
                            }),
                        ),
                        { multiLines: true },
                    ),

                    $rowCustomization,
                ),
            ),
        );

        $container.$selectControllers = $selectControllers;
        $container.$selectShortcuts = $selectShortcuts;
        $container.$selectCustomization = $selectCustomization;

        $container.updateLayout();

        // Detect when gamepad connected/disconnect
        window.addEventListener('gamepadconnected', $container.updateLayout);
        window.addEventListener('gamepaddisconnected', $container.updateLayout);

        // Refresh layout when parent dialog is shown
        this.onMountedCallbacks.push(() => {
            $container.updateLayout();
        });

        return $container;
    }

    private static async updateCustomizationSummary(this: ControllerExtraSettings) {
        const presetId = parseInt(this.$selectCustomization.value);
        const $summaryContent = await ControllerCustomizationsManagerDialog.getInstance().renderSummary(presetId);

        removeChildElements(this.$summaryCustomization);
        if ($summaryContent) {
            this.$summaryCustomization.appendChild($summaryContent);
        }
    }

    private static async updateLayout(this: ControllerExtraSettings) {
        this.controllerIds = getUniqueGamepadNames();

        this.dataset.hasGamepad = (this.controllerIds.length > 0).toString();
        if (this.controllerIds.length === 0) {
            // No gamepads
            return;
        }

        const $fragment = document.createDocumentFragment();

        // Remove old controllers
        removeChildElements(this.$selectControllers);

        // Render controller list
        for (const name of this.controllerIds) {
            const $option = CE('option', { value: name }, name);
            $fragment.appendChild($option);
        }

        this.$selectControllers.appendChild($fragment);

        // Render shortcut presets
        const allShortcutPresets = await ControllerShortcutsTable.getInstance().getPresets();
        renderPresetsList(this.$selectShortcuts, allShortcutPresets, null, { addOffValue: true });

        // Render customization presets
        const allCustomizationPresets = await ControllerCustomizationsTable.getInstance().getPresets();
        renderPresetsList(this.$selectCustomization, allCustomizationPresets, null, { addOffValue: true });

        for (const name of this.controllerIds) {
            const $option = CE('option', { value: name }, name);
            $fragment.appendChild($option);
        }

        BxEvent.dispatch(this.$selectControllers, 'input');
        calculateSelectBoxes(this);
    }

    private static async switchController(this: ControllerExtraSettings, id: string) {
        this.currentControllerId = id;
        if (!this.getCurrentControllerId()) {
            return;
        }

        const controllerSettings = await ControllerSettingsTable.getInstance().getControllerData(this.currentControllerId);

        // Update UI
        this.$selectShortcuts.value = controllerSettings.shortcutPresetId.toString();
        this.$selectCustomization.value = controllerSettings.customizationPresetId.toString();

        // Update summary
        ControllerExtraSettings.updateCustomizationSummary.call(this);
    }

    private static getCurrentControllerId(this: ControllerExtraSettings) {
        // Validate current ID
        if (this.currentControllerId) {
            if (this.controllerIds.includes(this.currentControllerId)) {
                return this.currentControllerId;
            }

            this.currentControllerId = '';
        }

        // Get first ID
        if (!this.currentControllerId) {
            this.currentControllerId = this.controllerIds[0];
        }

        if (this.currentControllerId) {
            return this.currentControllerId;
        }

        return null;
    }

    private static async saveSettings(this: ControllerExtraSettings) {
        if (!this.getCurrentControllerId()) {
            return;
        }

        const data: ControllerSettingsRecord = {
            id: this.currentControllerId,
            data: {
                shortcutPresetId: parseInt(this.$selectShortcuts.value),
                customizationPresetId: parseInt(this.$selectCustomization.value),
            },
        };

        await ControllerSettingsTable.getInstance().put(data);

        StreamSettings.refreshControllerSettings();
    }
}
