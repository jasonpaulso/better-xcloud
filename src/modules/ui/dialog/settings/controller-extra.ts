import { BxEvent } from "@/utils/bx-event";
import { getUniqueGamepadNames } from "@/utils/gamepad";
import { CE, removeChildElements, createButton, ButtonStyle, createSettingRow, renderPresetsList } from "@/utils/html";
import { t } from "@/utils/translation";
import { BxSelectElement } from "@/web-components/bx-select";
import { ControllerShortcutsManagerDialog } from "../profile-manger/controller-shortcuts-manager-dialog";
import type { SettingsDialog } from "../settings-dialog";
import { ControllerShortcutsTable } from "@/utils/local-db/controller-shortcuts-table";
import { BxNumberStepper } from "@/web-components/bx-number-stepper";
import { ControllerSettingsTable } from "@/utils/local-db/controller-settings-table";
import { StreamSettings } from "@/utils/stream-settings";

export class ControllerExtraSettings extends HTMLElement {
    currentControllerId!: string;
    controllerIds!: string[];

    $selectControllers!: BxSelectElement;
    $selectShortcuts!: BxSelectElement;
    $vibrationIntensity!: BxNumberStepper;

    updateLayout!: () => void;
    switchController!: (id: string) => void;
    getCurrentControllerId!: () => string | null;
    saveSettings!: () => void;

    static renderSettings(this: SettingsDialog): HTMLElement {
        const $container = CE<ControllerExtraSettings>('label', {
            class: 'bx-settings-row bx-controller-extra-settings',
        });

        $container.updateLayout = ControllerExtraSettings.updateLayout.bind($container);
        $container.switchController = ControllerExtraSettings.switchController.bind($container);
        $container.getCurrentControllerId = ControllerExtraSettings.getCurrentControllerId.bind($container);
        $container.saveSettings = ControllerExtraSettings.saveSettings.bind($container);

        const $selectControllers = BxSelectElement.create(CE<HTMLSelectElement>('select', {
            autocomplete: 'off',
            _on: {
                input: (e: Event) => {
                    $container.switchController($selectControllers.value);
                },
            },
        }));
        $selectControllers.classList.add('bx-full-width');

        const $selectShortcuts = BxSelectElement.create(CE<HTMLSelectElement>('select', {
            autocomplete: 'off',
            _on: {
                input: $container.saveSettings,
            },
        }));

        const $vibrationIntensity = BxNumberStepper.create('controller_vibration_intensity', 50, 0, 100, {
            steps: 10,
            suffix: '%',
            exactTicks: 20,
            customTextValue: (value: any) => {
                value = parseInt(value);
                return value === 0 ? t('off') : value + '%';
            },
        }, $container.saveSettings);

        $container.append(
            CE('span', {}, t('no-controllers-connected')),
            CE('div', { class: 'bx-controller-extra-wrapper' },
                $selectControllers,

                CE('div', { class: 'bx-sub-content-box' },
                    createSettingRow(
                        t('controller-shortcuts-in-game'),
                        CE('div', {
                            class: 'bx-preset-row',
                            _nearby: {
                                orientation: 'horizontal',
                            },
                        },
                            $selectShortcuts,
                            createButton({
                                label: t('manage'),
                                style: ButtonStyle.FOCUSABLE,
                                onClick: () => ControllerShortcutsManagerDialog.getInstance().show({
                                    id: parseInt($container.$selectShortcuts.value),
                                }),
                            }),
                        ),
                        { multiLines: true },
                    ),

                    createSettingRow(
                        t('vibration-intensity'),
                        $vibrationIntensity,
                    ),
                ),
            ),
        );

        $container.$selectControllers = $selectControllers;
        $container.$selectShortcuts = $selectShortcuts;
        $container.$vibrationIntensity = $vibrationIntensity;

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

    private static async updateLayout(this: ControllerExtraSettings, e?: GamepadEvent) {
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
            const $option = CE<HTMLOptionElement>('option', { value: name }, name);
            $fragment.appendChild($option);
        }

        this.$selectControllers.appendChild($fragment);

        // Render shortcut presets
        const allShortcutPresets = await ControllerShortcutsTable.getInstance().getPresets();
        renderPresetsList(this.$selectShortcuts, allShortcutPresets, null, { addOffValue: true });

        for (const name of this.controllerIds) {
            const $option = CE<HTMLOptionElement>('option', { value: name }, name);
            $fragment.appendChild($option);
        }

        BxEvent.dispatch(this.$selectControllers, 'input');
    }

    private static async switchController(this: ControllerExtraSettings, id: string) {
        this.currentControllerId = id;
        if (!this.getCurrentControllerId()) {
            return;
        }

        const controllerSettings = await ControllerSettingsTable.getInstance().getControllerData(this.currentControllerId);

        // Update UI
        this.$selectShortcuts.value = controllerSettings.shortcutPresetId.toString();
        this.$vibrationIntensity.value = controllerSettings.vibrationIntensity.toString();
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
                vibrationIntensity: parseInt(this.$vibrationIntensity.value),
            },
        };

        await ControllerSettingsTable.getInstance().put(data);

        StreamSettings.refreshControllerSettings();
    }
}
