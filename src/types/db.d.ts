interface BaseRecord {
    id: any;
    data: any;
};

interface ControllerSettingsRecord extends BaseRecord {
    id: string;
    data: {
        vibrationIntensity: number;
        shortcutPresetId: number;
    };
};
