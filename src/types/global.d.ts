import type { BxExposed } from "@/utils/bx-exposed";
import type { AllPresets, ControllerShortcutPresetRecord } from "./presets";
import type { PrefKey } from "@/enums/pref-keys";
import type { StreamSettings, type StreamSettingsData } from "@/utils/stream-settings";

export {};

declare global {
    interface Window {
        AppInterface: any;
        BX_FLAGS?: BxFlags;
        BX_CE: (elmName: string, props: { [index: string]: any }={}) => HTMLElement;
        BX_EXPOSED: typeof BxExposed & Partial<{
            shouldShowSensorControls: boolean;
            stopTakRendering: boolean;
            dialogRoutes: {
                closeAll: () => void;
            };
            showStreamMenu: () => void;
            inputSink: any;
            streamSession: any;
            touchLayoutManager: any;
        }>;

        BX_REMOTE_PLAY_CONFIG: BxStates.remotePlay.config;
        BX_STREAM_SETTINGS: StreamSettingsData;
    }
}
