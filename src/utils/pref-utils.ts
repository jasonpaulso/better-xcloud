import { ALL_PREFS, GlobalPref, StreamPref, type AnyPref } from "@/enums/pref-keys";
import type { PrefInfo, SettingActionOrigin } from "@/types/setting-definition";
import { GlobalSettingsStorage } from "./settings-storages/global-settings-storage";
import { StreamSettingsStorage } from "./settings-storages/stream-settings-storage";

export const STORAGE = {
    Global: new GlobalSettingsStorage(),
    Stream: new StreamSettingsStorage(),
};

const streamSettingsStorage = STORAGE.Stream;
export const getStreamPrefDefinition = streamSettingsStorage.getDefinition.bind(streamSettingsStorage);
export const getStreamPref = streamSettingsStorage.getSetting.bind(streamSettingsStorage);
export const setStreamPref = streamSettingsStorage.setSetting.bind(streamSettingsStorage);
export const getGamePref = streamSettingsStorage.getSettingByGame.bind(streamSettingsStorage);
export const setGamePref = streamSettingsStorage.setSettingByGame.bind(streamSettingsStorage);
export const setGameIdPref = streamSettingsStorage.setGameId.bind(streamSettingsStorage);
export const hasGamePref = streamSettingsStorage.hasGameSetting.bind(streamSettingsStorage);
STORAGE.Stream = streamSettingsStorage;

const globalSettingsStorage = STORAGE.Global;
export const getGlobalPrefDefinition = globalSettingsStorage.getDefinition.bind(globalSettingsStorage);
export const getGlobalPref = globalSettingsStorage.getSetting.bind(globalSettingsStorage);
export const setGlobalPref = globalSettingsStorage.setSetting.bind(globalSettingsStorage);


export function isGlobalPref(prefKey: AnyPref): prefKey is GlobalPref {
    return ALL_PREFS.global.includes(prefKey as GlobalPref);
}

export function isStreamPref(prefKey: AnyPref): prefKey is StreamPref {
    return ALL_PREFS.stream.includes(prefKey as StreamPref);
}

export function getPrefInfo(prefKey: AnyPref): PrefInfo {
    if (isGlobalPref(prefKey)) {
        return {
            storage: STORAGE.Global,
            definition: getGlobalPrefDefinition(prefKey as GlobalPref),
            // value: getGlobalPref(prefKey as GlobalPref),
        }
    } else if (isStreamPref(prefKey)) {
        return {
            storage: STORAGE.Stream,
            definition: getStreamPrefDefinition(prefKey as StreamPref),
            // value: getStreamPref(prefKey as StreamPref),
        }
    }

    alert('Missing pref definition: ' + prefKey);
    return {} as PrefInfo;
}

export function setPref(prefKey: AnyPref, value: any, origin: SettingActionOrigin) {
    if (isGlobalPref(prefKey)) {
        setGlobalPref(prefKey as GlobalPref, value, origin);
    } else if (isStreamPref(prefKey)) {
        setStreamPref(prefKey as StreamPref, value, origin);
    }
}
