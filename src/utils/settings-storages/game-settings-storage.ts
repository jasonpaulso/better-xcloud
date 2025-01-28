import { StorageKey, type StreamPref } from "@/enums/pref-keys";
import { BaseSettingsStorage } from "./base-settings-storage";
import { StreamSettingsStorage } from "./stream-settings-storage";

export class GameSettingsStorage extends BaseSettingsStorage<StreamPref> {
    constructor(id: number) {
        super(`${StorageKey.STREAM}.${id}`, StreamSettingsStorage.DEFINITIONS);
    }

    deleteSetting(pref: StreamPref) {
        if (this.hasSetting(pref)) {
            delete this.settings[pref];
            this.saveSettings();

            return true;
        }

        return false;
    }
}
