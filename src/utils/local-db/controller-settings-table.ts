import { BaseLocalTable } from "./base-table";
import { LocalDb } from "./local-db";
import { ControllerShortcutDefaultId } from "./controller-shortcuts-table";
import { deepClone } from "../global";

export class ControllerSettingsTable extends BaseLocalTable<ControllerSettingsRecord> {
    private static instance: ControllerSettingsTable;
    public static getInstance = () => ControllerSettingsTable.instance ?? (ControllerSettingsTable.instance = new ControllerSettingsTable(LocalDb.TABLE_CONTROLLER_SETTINGS));

    static readonly DEFAULT_DATA: ControllerSettingsRecord['data'] = {
        shortcutPresetId: ControllerShortcutDefaultId.DEFAULT,
        vibrationIntensity: 50,
    };

    async getControllerData(id: string): Promise<ControllerSettingsRecord['data']> {
        const setting = await this.get(id);
        if (!setting) {
            return deepClone(ControllerSettingsTable.DEFAULT_DATA);
        }

        return setting.data;
    }

    async getControllersData() {
        const all = await this.getAll();
        const results: {[key: string]: ControllerSettingsRecord['data']} = {};

        for (const key in all) {
            const settings = all[key].data;
            // Pre-calculate virabtionIntensity
            settings.vibrationIntensity /= 100;

            results[key] = settings;
        }

        return results;
    }
}
