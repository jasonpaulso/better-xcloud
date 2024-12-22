import type { BxExposed } from "@/utils/bx-exposed";
import type { AllPresets, ControllerShortcutPresetRecord } from "./presets";
import type { PrefKey } from "@/enums/pref-keys";
import type { StreamSettings, type StreamSettingsData } from "@/utils/stream-settings";
import type { BxEvent } from "@/utils/bx-event";
import type { BxEventBus } from "@/utils/bx-event-bus";
import type { BxLogger } from "@/utils/bx-logger";

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

        BX_FETCH: typeof window['fetch'];

        BxEvent: typeof BxEvent;
        BxEventBus: typeof BxEventBus;
        BxLogger: typeof BxLogger;
        localRedirect: (path: stringn) => void;
        testTouchLayout: (layout: any) => void;

        chrome?: any;

        // xCloud properties
        xbcUser?: {
            isSignedIn: boolean;
        };
        MSA: any;
        MeControl: any;
        adobe: any;
    }

    interface Navigator {
        orgUserAgent?: string;
        orgUserAgentData?: any;
    }
}
