import { PrefKey } from "@/enums/pref-keys";
import { BxEvent } from "@/utils/bx-event";
import { BX_FLAGS, NATIVE_FETCH, type BxFlags } from "@/utils/bx-flags";
import { STORAGE } from "@/utils/global";
import { CE, removeChildElements, createButton, ButtonStyle, escapeCssSelector } from "@/utils/html";
import type { BxHtmlSettingElement } from "@/utils/setting-element";
import { getPref, setPref, getPrefDefinition } from "@/utils/settings-storages/global-settings-storage";
import { t } from "@/utils/translation";
import { BxSelectElement } from "@/web-components/bx-select";
import type { SettingsDialog } from "../settings-dialog";
import type { RecommendedSettings, SuggestedSettingProfile } from "@/types/setting-definition";
import { DeviceVibrationMode, TouchControllerMode } from "@/enums/pref-values";
import { GhPagesUtils } from "@/utils/gh-pages";

export class SuggestionsSetting {
    static async renderSuggestions(this: SettingsDialog, e: Event) {
        const $btnSuggest = (e.target as HTMLElement).closest('div')!;
        $btnSuggest.toggleAttribute('bx-open');

        let $content = $btnSuggest.nextElementSibling as HTMLElement;
        if ($content) {
            BxEvent.dispatch($content.querySelector('select'), 'input');
            return;
        }

        // Get labels
        let settingTabGroup: keyof typeof this.SETTINGS_UI;
        for (settingTabGroup in this.SETTINGS_UI) {
            const settingTab = this.SETTINGS_UI[settingTabGroup];

            if (!settingTab || !settingTab.items || typeof settingTab.items === 'function') {
                continue;
            }

            for (const settingTabContent of settingTab.items) {
                if (!settingTabContent || settingTabContent instanceof HTMLElement || !settingTabContent.items) {
                    continue;
                }

                for (const setting of settingTabContent.items) {
                    let prefKey: PrefKey | undefined;

                    if (typeof setting === 'string') {
                        prefKey = setting;
                    } else if (typeof setting === 'object') {
                        prefKey = setting.pref as PrefKey;
                    }

                    if (prefKey) {
                        this.suggestedSettingLabels[prefKey] = settingTabContent.label;
                    }
                }
            }
        }

        // Get recommended settings for Android devices
        let recommendedDevice: string | null = '';

        if (BX_FLAGS.DeviceInfo.deviceType.includes('android')) {
            if (BX_FLAGS.DeviceInfo.androidInfo) {
                recommendedDevice = await SuggestionsSetting.getRecommendedSettings.call(this, BX_FLAGS.DeviceInfo.androidInfo);
            }
        }

        /*
        recommendedDevice = await this.getRecommendedSettings({
            manufacturer: 'Lenovo',
            board: 'kona',
            model: 'Lenovo TB-9707F',
        });
        */

        const hasRecommendedSettings = Object.keys(this.suggestedSettings.recommended).length > 0;

        // Add some specific setings based on device type
        const deviceType = BX_FLAGS.DeviceInfo.deviceType;
        if (deviceType === 'android-handheld') {
            // Disable touch
            SuggestionsSetting.addDefaultSuggestedSetting.call(this, PrefKey.TOUCH_CONTROLLER_MODE, TouchControllerMode.OFF);
            // Enable device vibration
            SuggestionsSetting.addDefaultSuggestedSetting.call(this, PrefKey.DEVICE_VIBRATION_MODE, DeviceVibrationMode.ON);
        } else if (deviceType === 'android') {
            // Enable device vibration
            SuggestionsSetting.addDefaultSuggestedSetting.call(this, PrefKey.DEVICE_VIBRATION_MODE, DeviceVibrationMode.AUTO);
        } else if (deviceType === 'android-tv') {
            // Disable touch
            SuggestionsSetting.addDefaultSuggestedSetting.call(this, PrefKey.TOUCH_CONTROLLER_MODE, TouchControllerMode.OFF);
        }

        // Set value for Default profile
        SuggestionsSetting.generateDefaultSuggestedSettings.call(this);

        // Start rendering
        const $suggestedSettings = CE('div', {class: 'bx-suggest-wrapper'});
        const $select = CE<HTMLSelectElement>('select', {},
            hasRecommendedSettings && CE('option', {value: 'recommended'}, t('recommended')),
            !hasRecommendedSettings && CE('option', {value: 'highest'}, t('highest-quality')),
            CE('option', {value: 'default'}, t('default')),
            CE('option', {value: 'lowest'}, t('lowest-quality')),
        );
        $select.addEventListener('input', e => {
            const profile = $select.value as SuggestedSettingProfile;

            // Empty children
            removeChildElements($suggestedSettings);
            const fragment = document.createDocumentFragment();

            let note: HTMLElement | string | undefined;
            if (profile === 'recommended') {
                note = t('recommended-settings-for-device', {device: recommendedDevice});
            } else if (profile === 'highest') {
                // Add note for "Highest quality" profile
                note = '⚠️ ' + t('highest-quality-note');
            }

            note && fragment.appendChild(CE('div', {class: 'bx-suggest-note'}, note));

            const settings = this.suggestedSettings[profile];
            let prefKey: PrefKey;
            for (prefKey in settings) {
                let suggestedValue;
                const definition = getPrefDefinition(prefKey);
                if (definition && definition.transformValue) {
                    suggestedValue = definition.transformValue.get.call(definition, settings[prefKey]);
                } else {
                    suggestedValue = settings[prefKey];
                }

                const currentValue = getPref(prefKey, false);
                const currentValueText = STORAGE.Global.getValueText(prefKey, currentValue);
                const isSameValue = currentValue === suggestedValue;

                let $child: HTMLElement;
                let $value: HTMLElement | string;
                if (isSameValue) {
                    // No changes
                    $value = currentValueText;
                } else {
                    const suggestedValueText = STORAGE.Global.getValueText(prefKey, suggestedValue);
                    $value = currentValueText + ' ➔ ' + suggestedValueText;
                }

                let $checkbox: HTMLInputElement;
                const breadcrumb = this.suggestedSettingLabels[prefKey] + ' ❯ ' + STORAGE.Global.getLabel(prefKey);
                const id = escapeCssSelector(`bx_suggest_${prefKey}`);

                $child = CE('div', {
                    class: `bx-suggest-row ${isSameValue ? 'bx-suggest-ok' : 'bx-suggest-change'}`,
                },
                    $checkbox = CE('input', {
                        type: 'checkbox',
                        tabindex: 0,
                        checked: true,
                        id: id,
                    }),
                    CE('label', {
                        for: id,
                    },
                        CE('div', {
                            class: 'bx-suggest-label',
                        }, breadcrumb),
                        CE('div', {
                            class: 'bx-suggest-value',
                        }, $value),
                    ),
                );

                if (isSameValue) {
                    $checkbox.disabled = true;
                    $checkbox.checked = true;
                }

                fragment.appendChild($child);
            }

            $suggestedSettings.appendChild(fragment);
        });

        BxEvent.dispatch($select, 'input');

        const onClickApply = () => {
            const profile = $select.value as SuggestedSettingProfile;
            const settings = this.suggestedSettings[profile];

            let prefKey: PrefKey;
            for (prefKey in settings) {
                let suggestedValue = settings[prefKey];

                const $checkBox = $content.querySelector<HTMLInputElement>(`#bx_suggest_${escapeCssSelector(prefKey)}`)!;
                if (!$checkBox.checked || $checkBox.disabled) {
                    continue;
                }

                const $control = this.settingElements[prefKey] as HTMLElement;

                // Set value directly if the control element is not available
                if (!$control) {
                    setPref(prefKey, suggestedValue);
                    continue;
                }

                // Transform value
                const settingDefinition = getPrefDefinition(prefKey);
                if (settingDefinition.transformValue) {
                    suggestedValue = settingDefinition.transformValue.get.call(settingDefinition, suggestedValue);
                }

                if ('setValue' in $control) {
                    ($control as BxHtmlSettingElement).setValue(suggestedValue);
                } else {
                    ($control as HTMLInputElement).value = suggestedValue;
                }

                BxEvent.dispatch($control, 'input', {
                    manualTrigger: true,
                });
            }

            // Refresh suggested settings
            BxEvent.dispatch($select, 'input');
        };

        // Apply button
        const $btnApply = createButton({
            label: t('apply'),
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: onClickApply,
        });

        $content = CE('div', {
            class: 'bx-sub-content-box bx-suggest-box',
            _nearby: {
                orientation: 'vertical',
            }
        },
            BxSelectElement.create($select, true),
            $suggestedSettings,
            $btnApply,

            BX_FLAGS.DeviceInfo.deviceType.includes('android') && CE('a', {
                class: 'bx-suggest-link bx-focusable',
                href: 'https://better-xcloud.github.io/guide/android-webview-tweaks/',
                target: '_blank',
                tabindex: 0,
            }, '🤓 ' + t('how-to-improve-app-performance')),

            BX_FLAGS.DeviceInfo.deviceType.includes('android') && !hasRecommendedSettings && CE('a', {
                class: 'bx-suggest-link bx-focusable',
                href: 'https://github.com/redphx/better-xcloud-devices',
                target: '_blank',
                tabindex: 0,
            }, t('suggest-settings-link')),
        );

        $btnSuggest.insertAdjacentElement('afterend', $content);
    }

    private static async getRecommendedSettings(this: SettingsDialog, androidInfo: BxFlags['DeviceInfo']['androidInfo']): Promise<string | null> {
        function normalize(str: string) {
            return str.toLowerCase()
                .trim()
                .replaceAll(/\s+/g, '-')
                .replaceAll(/-+/g, '-');
        }

        // Get recommended settings from GitHub
        try {
            let {brand, board, model} = androidInfo!;
            brand = normalize(brand);
            board = normalize(board);
            model = normalize(model);

            const url = GhPagesUtils.getUrl(`devices/${brand}/${board}-${model}.json`);
            const response = await NATIVE_FETCH(url);
            const json = (await response.json()) as RecommendedSettings;
            const recommended: PartialRecord<PrefKey, any> = {};

            // Only supports schema version 2
            if (json.schema_version !== 2) {
                return null;
            }

            const scriptSettings = json.settings.script;

            // Set base settings
            if (scriptSettings._base) {
                let base = typeof scriptSettings._base === 'string' ? [scriptSettings._base] : scriptSettings._base;
                for (const profile of base) {
                    Object.assign(recommended, this.suggestedSettings[profile]);
                }

                delete scriptSettings._base;
            }

            // Override settings
            let key: Exclude<keyof typeof scriptSettings, '_base'>;
            // @ts-ignore
            for (key in scriptSettings) {
                recommended[key] = scriptSettings[key];
            }

            // Update device type in BxFlags
            BX_FLAGS.DeviceInfo.deviceType = json.device_type;

            this.suggestedSettings.recommended = recommended;

            return json.device_name;
        } catch (e) {}

        return null;
    }

    private static addDefaultSuggestedSetting(this: SettingsDialog, prefKey: PrefKey, value: any) {
        let key: keyof typeof this.suggestedSettings;
        for (key in this.suggestedSettings) {
            if (key !== 'default' && !(prefKey in this.suggestedSettings)) {
                this.suggestedSettings[key][prefKey] = value;
            }
        }
    }

    private static generateDefaultSuggestedSettings(this: SettingsDialog) {
        let key: keyof typeof this.suggestedSettings;
        for (key in this.suggestedSettings) {
            if (key === 'default') {
                continue;
            }

            let prefKey: PrefKey;
            for (prefKey in this.suggestedSettings[key]) {
                if (!(prefKey in this.suggestedSettings.default)) {
                    this.suggestedSettings.default[prefKey] = getPrefDefinition(prefKey).default;
                }
            }
        }
    }
}
