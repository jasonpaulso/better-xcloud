import type { PrefKey } from "@/enums/pref-keys";
import type { SettingElementType } from "@/utils/setting-element";

export type SuggestedSettingProfile = 'recommended' | 'lowest' | 'highest' | 'default';
export type RecommendedSettings = {
    schema_version: 2,
    device_name: string,
    device_type: 'android' | 'android-tv' | 'android-handheld' | 'webos',
    settings: {
        app: any,
        script: {
            _base?: 'lowest' | 'highest',
        } & PartialRecord<PrefKey, any>,
    },
};

export type SettingAction = 'get' | 'set';

interface BaseSettingDefinition {
    default: any;

    label?: string;
    note?: string | (() => HTMLElement) | HTMLElement;
    experimental?: boolean;
    unsupported?: boolean;
    unsupportedValue?: SettingDefinition['default'];
    unsupportedNote?: string | (() => HTMLElement);
    suggest?: PartialRecord<SuggestedSettingProfile, any>,
    ready?: (setting: SettingDefinition) => void;
    requiredVariants?: BuildVariant | Array<BuildVariant>;
    transformValue?: {
        get: Exclude<any, undefined>;
        set: Exclude<any, undefined>;
    };
};

interface OptionsSettingDefinition extends BaseSettingDefinition {
    options: { [index: string]: string };
    optionsGroup?: string;
};

interface MultipleOptionsSettingDefinition extends BaseSettingDefinition {
    multipleOptions: { [index: string]: string };
    params: MultipleOptionsParams;
};

interface NumberStepperSettingDefinition extends BaseSettingDefinition {
    min: number;
    max: number;
    params: NumberStepperParams;

    transformValue?: {
        get(this: Extract<SettingDefinition, { max: number }>, value: any): Exclude<any, undefined>;
        set(this: Extract<SettingDefinition, { max: number }>, value: any): Exclude<any, undefined>;
    };
}

export type SettingDefinition = BaseSettingDefinition | OptionsSettingDefinition | MultipleOptionsSettingDefinition | NumberStepperSettingDefinition;

export type SettingDefinitions = { [index in PrefKey]: SettingDefinition };

export type MultipleOptionsParams = Partial<{
    size?: number;
}>

export type NumberStepperParams = Partial<{
    steps: number;

    suffix: string;
    disabled: boolean;
    hideSlider: boolean;

    ticks: number;
    exactTicks: number;

    customTextValue: (value: any, min?: number, max?: number) => string | null;
    reverse: boolean;
}>

export type DualNumberStepperParams = {
    min: number;
    minDiff: number;
    max: number;

    steps?: number;
    suffix?: string;
    disabled?: boolean;
    customTextValue?: (values: [number, number], min?: number, max?: number) => string | null;
};
