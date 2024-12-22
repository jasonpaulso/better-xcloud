interface BaseRecord {
    id: any;
    data: any;
};

interface ControllerSettingsRecord extends BaseRecord {
    id: string;
    data: {
        shortcutPresetId: number;
        customizationPresetId: number;
    };
};
