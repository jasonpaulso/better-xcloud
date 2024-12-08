import type { PrefKey, StorageKey } from "@/enums/pref-keys";
import { BX_FLAGS } from "./bx-flags";
import { BxLogger } from "./bx-logger";
import { AppInterface } from "./global";

type EventCallback<T = any> = (payload: T) => void;

type ScriptEvents = {
    'xcloud.server.ready': {};
    'xcloud.server.unavailable': {};

    'dialog.shown': {},
    'dialog.dismissed': {},

    'titleInfo.ready': {};
    'setting.changed': {
        storageKey: StorageKey;
        settingKey: PrefKey;
        settingValue: any;
    };

    'mkb.setting.updated': {};
    'keyboardShortcuts.updated': {};
    'deviceVibration.updated': {};

    // GH pages
    'list.forcedNativeMkb.updated': {
        data: {
            data: any;
        };
    };
};

type StreamEvents = {
    'state.loading': {};
    'state.starting': {};
    'state.playing': { $video?: HTMLVideoElement };
    'state.stopped': {};
    'state.error': {};

    dataChannelCreated: { dataChannel: RTCDataChannel };
};

export class BxEventBus<TEvents extends Record<string, any>> {
    private listeners: Map<keyof TEvents, Set<EventCallback<any>>> = new Map();
    private group: string;
    private appJsInterfaces: { [key in keyof TEvents]?: string };

    static readonly Script = new BxEventBus<ScriptEvents>('script', {
        'dialog.shown': 'onDialogShown',
        'dialog.dismissed': 'onDialogDismissed',
    });
    static readonly Stream = new BxEventBus<StreamEvents>('stream', {
        'state.loading': 'onStreamPlaying',
        'state.playing': 'onStreamPlaying',
        'state.stopped': 'onStreamStopped',
    });

    constructor(group: string, appJsInterfaces: { [key in keyof TEvents]?: string }) {
        this.group = group;
        this.appJsInterfaces = appJsInterfaces;
    }

    on<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        BX_FLAGS.Debug && BxLogger.warning('EventBus', 'on', event, callback);
    }

    once<K extends keyof TEvents>(event: string, callback: EventCallback<TEvents[K]>): void {
        const wrapper = (...args: any[]) => {
            // @ts-ignore
            callback(...args);
            this.off(event, wrapper);
        };

        this.on(event, wrapper);
    }

    off<K extends keyof TEvents>(event: K, callback: EventCallback<TEvents[K]> | null): void {
        BX_FLAGS.Debug && BxLogger.warning('EventBus', 'off', event, callback);

        if (!callback) {
            // Remove all listener callbacks
            this.listeners.delete(event);
            return;
        }

        const callbacks = this.listeners.get(event);
        if (!callbacks) {
            return;
        }

        callbacks.delete(callback);
        if (callbacks.size === 0) {
            this.listeners.delete(event);
        }
    }

    offAll(): void {
        this.listeners.clear();
    }

    emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
        const callbacks = this.listeners.get(event) || [];
        for (const callback of callbacks) {
            callback(payload);
        }

        // Call method inside Android app
        if (AppInterface) {
            if (event in this.appJsInterfaces) {
                const method = this.appJsInterfaces[event];
                AppInterface[method] && AppInterface[method]();
            } else {
                AppInterface.onEventBus(this.group + '.' + (event as string));
            }
        }

        BX_FLAGS.Debug && BxLogger.warning('EventBus', 'emit', event, payload);
    }
}

window.BxEventBus = BxEventBus;
