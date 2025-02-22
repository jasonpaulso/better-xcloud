import { GamepadKey } from '@/enums/gamepad'
import { generateVirtualControllerMapping } from '@/utils/gamepad'
import { FO76_AUTOMATION_EVENTS, FO76AutomationModes } from '../game-automation/game-automation-handler'

export enum ShortcutAction {
    BETTER_XCLOUD_SETTINGS_SHOW = 'bx.settings.show',
    CONTROLLER_XBOX_BUTTON_PRESS = 'controller.xbox.press',
    STREAM_VIDEO_TOGGLE = 'stream.video.toggle',
    STREAM_SCREENSHOT_CAPTURE = 'stream.screenshot.capture',
    STREAM_MENU_SHOW = 'stream.menu.show',
    STREAM_STATS_TOGGLE = 'stream.stats.toggle',
    STREAM_SOUND_TOGGLE = 'stream.sound.toggle',
    STREAM_MICROPHONE_TOGGLE = 'stream.microphone.toggle',
    STREAM_VOLUME_INC = 'stream.volume.inc',
    STREAM_VOLUME_DEC = 'stream.volume.dec',
    DEVICE_SOUND_TOGGLE = 'device.sound.toggle',
    DEVICE_VOLUME_INC = 'device.volume.inc',
    DEVICE_VOLUME_DEC = 'device.volume.dec',
    DEVICE_BRIGHTNESS_INC = 'device.brightness.inc',
    DEVICE_BRIGHTNESS_DEC = 'device.brightness.dec',
    MKB_TOGGLE = 'mkb.toggle',
    TRUE_ACHIEVEMENTS_OPEN = 'ta.open',
    FO76_AUTOMATION_TOGGLE = 'fo76.automation.toggle',
    FO76_MODE_TOGGLE = 'fo76.mode.toggle'
}

export class ControllerShortcut {
    private static buttonsCache: { [key: string]: boolean[] } = {}
    private static buttonsStatus: { [key: string]: boolean[] } = {}

    static reset(index: number) {
        ControllerShortcut.buttonsCache[index] = []
        ControllerShortcut.buttonsStatus[index] = []
    }

    static handle(gamepad: Gamepad): boolean {
        const gamepadIndex = gamepad.index

        // Move the buttons status from the previous frame to the cache
        ControllerShortcut.buttonsCache[gamepadIndex] = ControllerShortcut.buttonsStatus[gamepadIndex]?.slice(0) || []
        // Clear the buttons status
        ControllerShortcut.buttonsStatus[gamepadIndex] = []

        const pressed: boolean[] = []
        let otherButtonPressed = false

        const entries = gamepad.buttons.entries()
        let index: GamepadKey
        let button: GamepadButton
        for ([index, button] of entries) {
            // Only add the newly pressed button to the array (holding doesn't count)
            if (button.pressed && index !== GamepadKey.HOME) {
                otherButtonPressed = true
                pressed[index] = true

                // If this is newly pressed button -> run action
                if (!ControllerShortcut.buttonsCache[gamepadIndex]?.[index]) {
                    // Handle FO76 automation shortcuts
                    if (index === GamepadKey.LB) {
                        const event = new CustomEvent(FO76_AUTOMATION_EVENTS.TOGGLE_AUTOMATION)
                        window.dispatchEvent(event)
                    } else if (index === GamepadKey.RB) {
                        const event = new CustomEvent(FO76_AUTOMATION_EVENTS.TOGGLE_MODE, {
                            detail: {
                                name: FO76AutomationModes.HEAL,
                                enabled: true,
                                toggle: true
                            }
                        })
                        window.dispatchEvent(event)
                    }
                }
            }
        }

        ControllerShortcut.buttonsStatus[gamepadIndex] = pressed
        return otherButtonPressed
    }

    static pressXboxButton(): void {
        const streamSession = window.BX_EXPOSED.streamSession
        if (!streamSession) {
            return
        }

        const released = generateVirtualControllerMapping(0)
        const pressed = generateVirtualControllerMapping(0, {
            Nexus: 1,
            VirtualPhysicality: 1024, // Home
        })

        streamSession.onVirtualGamepadInput('systemMenu', performance.now(), [pressed])
        setTimeout(() => {
            streamSession.onVirtualGamepadInput('systemMenu', performance.now(), [released])
        }, 100)
    }
} 