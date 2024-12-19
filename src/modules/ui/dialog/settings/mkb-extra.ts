import { ButtonStyle, CE, createButton, createSettingRow, renderPresetsList } from "@/utils/html";
import type { SettingsDialog } from "../settings-dialog";
import { MkbMappingPresetsTable } from "@/utils/local-db/mkb-mapping-presets-table";
import { BxSelectElement } from "@/web-components/bx-select";
import { t } from "@/utils/translation";
import { getPref, setPref } from "@/utils/settings-storages/global-settings-storage";
import { PrefKey } from "@/enums/pref-keys";
import { StreamSettings } from "@/utils/stream-settings";
import { MkbMappingManagerDialog } from "../profile-manger/mkb-mapping-manager-dialog";
import { KeyboardShortcutsManagerDialog } from "../profile-manger/keyboard-shortcuts-manager-dialog";
import { KeyboardShortcutsTable } from "@/utils/local-db/keyboard-shortcuts-table";
import { SettingElement } from "@/utils/setting-element";
import { STORAGE } from "@/utils/global";
import { EmulatedMkbHandler } from "@/modules/mkb/mkb-handler";

export class MkbExtraSettings extends HTMLElement {
    private $mappingPresets!: BxSelectElement;
    private $shortcutsPresets!: BxSelectElement;

    private updateLayout!: typeof MkbExtraSettings['updateLayout'];
    private saveMkbSettings!: typeof MkbExtraSettings['saveMkbSettings'];
    private saveShortcutsSettings!: typeof MkbExtraSettings['saveShortcutsSettings'];

    static renderSettings(this: SettingsDialog): HTMLElement {
        const $container = document.createDocumentFragment() as unknown as MkbExtraSettings;

        $container.updateLayout = MkbExtraSettings.updateLayout.bind($container);
        $container.saveMkbSettings = MkbExtraSettings.saveMkbSettings.bind($container);
        $container.saveShortcutsSettings = MkbExtraSettings.saveShortcutsSettings.bind($container);

        const $mappingPresets = BxSelectElement.create(CE<HTMLSelectElement>('select', {
            autocomplete: 'off',
            _on: {
                input: $container.saveMkbSettings,
            },
        }));

        const $shortcutsPresets = BxSelectElement.create(CE<HTMLSelectElement>('select', {
            autocomplete: 'off',
            _on: {
                input: $container.saveShortcutsSettings,
            },
        }));

        $container.append(
            ...(getPref(PrefKey.MKB_ENABLED) ? [
                createSettingRow(
                    t('virtual-controller'),
                    CE('div', {
                        class: 'bx-preset-row',
                        _nearby: {
                            orientation: 'horizontal',
                        },
                    },
                        $mappingPresets,
                        createButton({
                            label: t('manage'),
                            style: ButtonStyle.FOCUSABLE,
                            onClick: () => MkbMappingManagerDialog.getInstance().show({
                                id: parseInt($container.$mappingPresets.value),
                            }),
                        }),
                    ),
                    { multiLines: true },
                ),

                createSettingRow(
                    t('virtual-controller-slot'),
                    SettingElement.fromPref(PrefKey.MKB_P1_SLOT, STORAGE.Global, () => {
                        EmulatedMkbHandler.getInstance()?.updateGamepadSlots();
                    }),
                ),
            ] : []),

            createSettingRow(
                t('keyboard-shortcuts-in-game'),
                CE('div', {
                    class: 'bx-preset-row',
                    _nearby: {
                        orientation: 'horizontal',
                    },
                },
                    $shortcutsPresets,
                    createButton({
                        label: t('manage'),
                        style: ButtonStyle.FOCUSABLE,
                        onClick: () => KeyboardShortcutsManagerDialog.getInstance().show({
                            id: parseInt($container.$shortcutsPresets.value),
                        }),
                    }),
                ),
                { multiLines: true },
            ),
        );

        $container.$mappingPresets = $mappingPresets;
        $container.$shortcutsPresets = $shortcutsPresets;

        $container.updateLayout();
        // Refresh layout when parent dialog is shown
        this.onMountedCallbacks.push(() => {
            $container.updateLayout();
        });

        return $container;
    }

    private static async updateLayout(this: MkbExtraSettings) {
        // Render shortcut presets
        const mappingPresets = await MkbMappingPresetsTable.getInstance().getPresets();
        renderPresetsList(this.$mappingPresets, mappingPresets, getPref<MkbPresetId>(PrefKey.MKB_P1_MAPPING_PRESET_ID));

        // Render shortcut presets
        const shortcutsPresets = await KeyboardShortcutsTable.getInstance().getPresets();
        renderPresetsList(this.$shortcutsPresets, shortcutsPresets, getPref<MkbPresetId>(PrefKey.KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID), { addOffValue: true });
    }

    private static async saveMkbSettings(this: MkbExtraSettings) {
        const presetId = parseInt(this.$mappingPresets.value);
        setPref<MkbPresetId>(PrefKey.MKB_P1_MAPPING_PRESET_ID, presetId);

        StreamSettings.refreshMkbSettings();
    }

    private static async saveShortcutsSettings(this: MkbExtraSettings) {
        const presetId = parseInt(this.$shortcutsPresets.value);
        setPref<KeyboardShortcutsPresetId>(PrefKey.KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID, presetId);

        StreamSettings.refreshKeyboardShortcuts();
    }
}
