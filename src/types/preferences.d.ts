export type PreferenceSetting = {
    default: any;
    options?: {[index: string]: string};
    multipleOptions?: {[index: string]: string};
    unsupported?: string | boolean;
    note?: string | HTMLElement;
    type?: SettingElementType;
    ready?: (setting: PreferenceSetting) => void;
    migrate?: (savedPrefs: any, value: any) => {};
    min?: number;
    max?: number;
    steps?: number;
    experimental?: boolean;
    params?: any;
    label?: string;
};

export type PreferenceSettings = {[index in PrefKey]: PreferenceSetting};
