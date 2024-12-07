import { Toast } from "@/utils/toast";
import { PointerClient } from "./pointer-client";
import { AppInterface, STATES } from "@/utils/global";
import { MkbHandler } from "./base-mkb-handler";
import { t } from "@/utils/translation";
import { BxEvent } from "@/utils/bx-event";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "@/utils/settings-storages/global-settings-storage";
import { BxLogger } from "@/utils/bx-logger";
import { MkbPopup } from "./mkb-popup";
import { KeyHelper } from "./key-helper";
import { StreamSettings } from "@/utils/stream-settings";
import { ShortcutAction } from "@/enums/shortcut-actions";
import { NativeMkbMode } from "@/enums/pref-values";

type NativeMouseData = {
    X: number,
    Y: number,
    Buttons: number,
    WheelX: number,
    WheelY: number,
    Type?: 0,  // 0: Relative, 1: Absolute
}

type XcloudInputSink = {
    onMouseInput: (data: NativeMouseData) => void;
}

export class NativeMkbHandler extends MkbHandler {
    private static instance: NativeMkbHandler | null | undefined;
    public static getInstance(): typeof NativeMkbHandler['instance'] {
        if (typeof NativeMkbHandler.instance === 'undefined') {
            if (NativeMkbHandler.isAllowed()) {
                NativeMkbHandler.instance = new NativeMkbHandler();
            } else {
                NativeMkbHandler.instance = null;
            }
        }

        return NativeMkbHandler.instance;
    }
    private readonly LOG_TAG = 'NativeMkbHandler';

    static isAllowed = () => {
        return STATES.browser.capabilities.emulatedNativeMkb && getPref<NativeMkbMode>(PrefKey.NATIVE_MKB_MODE) === NativeMkbMode.ON;
    }

    private pointerClient: PointerClient | undefined;
    private enabled = false;

    private mouseButtonsPressed = 0;
    private mouseWheelX = 0;
    private mouseWheelY = 0;

    private mouseVerticalMultiply = 0;
    private mouseHorizontalMultiply = 0;

    private inputSink: XcloudInputSink | undefined;

    private popup!: MkbPopup;

    private constructor() {
        super();
        BxLogger.info(this.LOG_TAG, 'constructor()');

        this.popup = MkbPopup.getInstance();
        this.popup.attachMkbHandler(this);
    }

    private onKeyboardEvent(e: KeyboardEvent) {
        if (e.type === 'keyup' && e.code === 'F8') {
            e.preventDefault();
            this.toggle();
            return;
        }
    }

    private onPointerLockRequested(e: Event) {
        AppInterface.requestPointerCapture();
        this.start();
    }

    private onPointerLockExited(e: Event) {
        AppInterface.releasePointerCapture();
        this.stop();
    }

    private onPollingModeChanged = (e: Event) => {
        const move = window.BX_STREAM_SETTINGS.xCloudPollingMode !== 'none';
        this.popup.moveOffscreen(move);
    }

    private onDialogShown = () => {
        document.pointerLockElement && document.exitPointerLock();
    }

    handleEvent(event: Event) {
        switch (event.type) {
            case 'keyup':
                this.onKeyboardEvent(event as KeyboardEvent);
                break;

            case BxEvent.XCLOUD_DIALOG_SHOWN:
                this.onDialogShown();
                break;

            case BxEvent.POINTER_LOCK_REQUESTED:
                this.onPointerLockRequested(event);
                break;
            case BxEvent.POINTER_LOCK_EXITED:
                this.onPointerLockExited(event);
                break;

            case BxEvent.XCLOUD_POLLING_MODE_CHANGED:
                this.onPollingModeChanged(event);
                break;
        }
    }

    init() {
        this.pointerClient = PointerClient.getInstance();
        this.inputSink = window.BX_EXPOSED.inputSink;

        // Stop keyboard input at startup
        this.updateInputConfigurationAsync(false);

        try {
            this.pointerClient.start(STATES.pointerServerPort, this);
        } catch (e) {
            Toast.show('Cannot enable Mouse & Keyboard feature');
        }

        this.mouseVerticalMultiply = getPref(PrefKey.NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY);
        this.mouseHorizontalMultiply = getPref(PrefKey.NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY);

        window.addEventListener('keyup', this);

        window.addEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this);
        window.addEventListener(BxEvent.POINTER_LOCK_REQUESTED, this);
        window.addEventListener(BxEvent.POINTER_LOCK_EXITED, this);
        window.addEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this);

        const shortcutKey = StreamSettings.findKeyboardShortcut(ShortcutAction.MKB_TOGGLE);
        if (shortcutKey) {
            const msg = t('press-key-to-toggle-mkb', { key: `<b>${KeyHelper.codeToKeyName(shortcutKey)}</b>` });
            Toast.show(msg, t('native-mkb'), { html: true });
        }

        this.waitForMouseData(false);
    }

    toggle(force?: boolean) {
        let setEnable: boolean;
        if (typeof force !== 'undefined') {
            setEnable = force;
        } else {
            setEnable = !this.enabled;
        }

        if (setEnable) {
            document.documentElement.requestPointerLock();
        } else {
            document.exitPointerLock();
        }
    }

    private updateInputConfigurationAsync(enabled: boolean) {
        window.BX_EXPOSED.streamSession.updateInputConfigurationAsync({
            enableKeyboardInput: enabled,
            enableMouseInput: enabled,
            enableAbsoluteMouse: false,
            enableTouchInput: false,
        });
    }

    start() {
        this.resetMouseInput();
        this.enabled = true;

        this.updateInputConfigurationAsync(true);

        window.BX_EXPOSED.stopTakRendering = true;
        this.waitForMouseData(false);

        Toast.show(t('native-mkb'), t('enabled'), { instant: true });
    }

    stop() {
        this.resetMouseInput();
        this.enabled = false;
        this.updateInputConfigurationAsync(false);

        this.waitForMouseData(true);
    }

    destroy(): void {
        this.pointerClient?.stop();
        window.removeEventListener('keyup', this);

        window.removeEventListener(BxEvent.XCLOUD_DIALOG_SHOWN, this);
        window.removeEventListener(BxEvent.POINTER_LOCK_REQUESTED, this);
        window.removeEventListener(BxEvent.POINTER_LOCK_EXITED, this);
        window.removeEventListener(BxEvent.XCLOUD_POLLING_MODE_CHANGED, this);

        this.waitForMouseData(false);
    }

    handleMouseMove(data: MkbMouseMove): void {
        this.sendMouseInput({
            X: data.movementX,
            Y: data.movementY,
            Buttons: this.mouseButtonsPressed,
            WheelX: this.mouseWheelX,
            WheelY: this.mouseWheelY,
        });
    }

    handleMouseClick(data: MkbMouseClick): void {
        const { pointerButton, pressed } = data;

        if (pressed) {
            this.mouseButtonsPressed |= pointerButton!;
        } else {
            this.mouseButtonsPressed ^= pointerButton!;
        }
        this.mouseButtonsPressed = Math.max(0, this.mouseButtonsPressed);

        this.sendMouseInput({
            X: 0,
            Y: 0,
            Buttons: this.mouseButtonsPressed,
            WheelX: this.mouseWheelX,
            WheelY: this.mouseWheelY,
        });
    }

    handleMouseWheel(data: MkbMouseWheel): boolean {
        const { vertical, horizontal } = data;

        this.mouseWheelX = horizontal;
        if (this.mouseHorizontalMultiply && this.mouseHorizontalMultiply !== 1) {
            this.mouseWheelX *= this.mouseHorizontalMultiply;
        }

        this.mouseWheelY = vertical;
        if (this.mouseVerticalMultiply && this.mouseVerticalMultiply !== 1) {
            this.mouseWheelY *= this.mouseVerticalMultiply;
        }

        this.sendMouseInput({
            X: 0,
            Y: 0,
            Buttons: this.mouseButtonsPressed,
            WheelX: this.mouseWheelX,
            WheelY: this.mouseWheelY,
        });

        return true;
    }

    setVerticalScrollMultiplier(vertical: number) {
        this.mouseVerticalMultiply = vertical;
    }

    setHorizontalScrollMultiplier(horizontal: number) {
        this.mouseHorizontalMultiply = horizontal;
    }

    waitForMouseData(showPopup: boolean) {
        this.popup.toggleVisibility(showPopup);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    private sendMouseInput(data: NativeMouseData) {
        data.Type = 0;  // Relative
        this.inputSink?.onMouseInput(data);
    }

    private resetMouseInput() {
        this.mouseButtonsPressed = 0;
        this.mouseWheelX = 0;
        this.mouseWheelY = 0;

        this.sendMouseInput({
            X: 0,
            Y: 0,
            Buttons: 0,
            WheelX: 0,
            WheelY: 0,
        });
    }
}
