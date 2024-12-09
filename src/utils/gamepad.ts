import { VIRTUAL_GAMEPAD_ID } from "@modules/mkb/mkb-handler";
import { t } from "@utils/translation";
import { Toast } from "@utils/toast";
import { BxLogger } from "@utils/bx-logger";
import { PrefKey } from "@/enums/pref-keys";
import { getPref } from "./settings-storages/global-settings-storage";

// Show a toast when connecting/disconecting controller
export function showGamepadToast(gamepad: Gamepad) {
    // Don't show Toast for virtual controller
    if (gamepad.id === VIRTUAL_GAMEPAD_ID) {
        return;
    }

    BxLogger.info('Gamepad', gamepad);
    let text = '🎮';

    if (getPref(PrefKey.LOCAL_CO_OP_ENABLED)) {
        text += ` #${gamepad.index + 1}`;
    }

    // Remove "(STANDARD GAMEPAD Vendor: xxx Product: xxx)" from ID
    const gamepadId = gamepad.id.replace(/ \(.*?Vendor: \w+ Product: \w+\)$/, '');
    text += ` - ${gamepadId}`;

    let status;
    if (gamepad.connected) {
        const supportVibration = !!gamepad.vibrationActuator;
        status = (supportVibration ? '✅' : '❌') + ' ' + t('vibration-status');
    } else {
        status = t('disconnected');
    }

    Toast.show(text, status, { instant: false });
}

export function getUniqueGamepadNames() {
    const gamepads = window.navigator.getGamepads();
    const names: string[] = [];

    for (const gamepad of gamepads) {
        if (gamepad?.connected && gamepad.id !== VIRTUAL_GAMEPAD_ID) {
            !names.includes(gamepad.id) && names.push(gamepad.id);
        }
    }

    return names;
}

export function hasGamepad() {
    const gamepads = window.navigator.getGamepads();
    for (const gamepad of gamepads) {
        if (gamepad?.connected) {
            return true;
        }
    }

    return false;
}

export function generateVirtualControllerMapping(override: {}={}) {
    const mapping = {
        GamepadIndex: 0,
        A: 0,
        B: 0,
        X: 0,
        Y: 0,
        LeftShoulder: 0,
        RightShoulder: 0,
        LeftTrigger: 0,
        RightTrigger: 0,
        View: 0,
        Menu: 0,
        LeftThumb: 0,
        RightThumb: 0,
        DPadUp: 0,
        DPadDown: 0,
        DPadLeft: 0,
        DPadRight: 0,
        Nexus: 0,
        LeftThumbXAxis: 0,
        LeftThumbYAxis: 0,
        RightThumbXAxis: 0,
        RightThumbYAxis: 0,
        PhysicalPhysicality: 0,
        VirtualPhysicality: 0,
        Dirty: false,
        Virtual: false,
    };

    return Object.assign({}, mapping, override);
}
