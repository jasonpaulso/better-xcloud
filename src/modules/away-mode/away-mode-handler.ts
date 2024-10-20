import { BxLogger } from '@/utils/bx-logger'

declare global {
  interface Window {
    awayModeHandler: AwayModeHandler
  }
}
import { Toast } from '@/utils/toast'
import { EmulatedMkbHandler } from '../mkb/mkb-handler'
import { GamepadKey } from '@/enums/mkb'
import { BxEvent } from '@/utils/bx-event'
import { SoundShortcut } from '../shortcuts/shortcut-sound'
import { BXCState, type StateType } from '@/utils/shared-state'

export type AwayModes = 'heal' | 'pivot' | 'crouch' | 'awayMode' | 'coffee' | 'vats' | 'custom'

export const AWAY_MODE_EVENTS = {
  TOGGLE_AWAY: 'away-mode-toggle',
  TOGGLE_MODE: 'away-mode-toggle-mode',
}

interface AwayModeMode {
  name: AwayModes
  interval?: number
  pause?: number
  enabled: boolean
}

interface AwayModeState extends StateType {
  awayMode?: boolean
  awayModeMode?: AwayModeMode
  awayModeInterval?: number
  awayModePause?: number
  awayModeEnabled?: boolean
}

export const HEAL_MODE_INTERVALS = [5000, 10000, 15000, 20000, 30000, 60000]
/**
 * @class AwayModeHandler
 * @description Handles the away mode functionality
 */
export class AwayModeHandler {
  static #instance: AwayModeHandler
  #windowFocused = true
  #enabled = false
  #mkbHandler = EmulatedMkbHandler.getInstance()
  #pressButton = this.#mkbHandler.pressButton.bind(this.#mkbHandler)
  #onPointerLockExited = this.#mkbHandler.onPointerLockExited.bind(this.#mkbHandler)

  handleAwayModeEvent = (modeState: AwayModeState) => {
    if (modeState.hasOwnProperty('awayModeMode')) {
      const mode = modeState.awayModeMode

      if (!mode) {
        return
      }

      if (!this.#enabled && mode.enabled) {
        this.toggle(true)
        BXCState.setState({ awayModeEnabled: true })
      }

      if (!mode.enabled) {
        this.stopButtonLoop(mode.name)
        return
      }

      switch (mode.name) {
        case 'heal':
          this.toggleCustomHealLoop(mode.interval || 500)
          break
        case 'vats':
          this.toggleCustomVatsLoop(mode.interval || 5000)
          break
        default:
          this.startButtonLoop(mode.name)
          break
      }
    }
  }

  init = () => {
    this.setupEventListeners()

    BXCState.subscribe((state: AwayModeState) => {
      this.handleAwayModeEvent(state)
    })
  }

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new AwayModeHandler()
    }
    return this.#instance
  }

  toggle = (toggle: boolean) => {
    if (toggle && !this.#enabled) {
      this.activate()
    } else {
      this.deactivate()
    }
  }

  activate = () => {
    this.#enabled = true
    this.#mkbHandler.start()
    this.#onPointerLockExited()
    Toast.show('Away Mode', 'Activated', { instant: true })
  }

  deactivate = () => {
    this.#enabled = false
    this.stopRunningLoops()
    this.#mkbHandler.stop()
    this.#mkbHandler.hideMessage()
    Toast.show('Away Mode', 'Deactivated', { instant: true })
  }

  destroy = () => {
    this.#enabled = false
    this.#mkbHandler.destroy()
  }

  async #pressButtonWithRandomDelay(buttonCode: number, maxDelay: number) {
    this.#pressButton(buttonCode, true)
    await this.#randomDelay(maxDelay)
    this.#pressButton(buttonCode, false)
  }

  #randomDelay(maxMs: number): Promise<void> {
    const delay = Math.random() * maxMs
    return new Promise((resolve) => setTimeout(resolve, delay))
  }

  #loopModes: { [key: string]: boolean } = {
    heal: false,
    pivot: false,
    crouch: false,
    awayMode: false,
    coffee: false,
    vats: false,
    custom: false,
  }

  #loopIntervals: { [key: string]: number | null } = {
    heal: null,
    pivot: null,
    crouch: null,
    awayMode: null,
    coffee: null,
    vats: null,
    custom: null,
  }

  #loopConfigs: {
    [key: string]: { actionInterval: number; pauseDuration: number; action: () => Promise<void> }
  } = {
    heal: {
      actionInterval: 1000,
      pauseDuration: 0,
      action: async () => {
        this.#pressButton(GamepadKey.RIGHT, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.RIGHT, false)
      },
    },
    pivot: {
      actionInterval: 1000,
      pauseDuration: 15000,
      action: async () => {
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_RIGHT, 5000)
        await this.#delay(500)
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_LEFT, 5000)
      },
    },
    crouch: {
      actionInterval: 1000,
      pauseDuration: 5000,
      action: async () => {
        await this.#pressButtonWithRandomDelay(GamepadKey.R3, 1000)
      },
    },
    awayMode: {
      actionInterval: 500,
      pauseDuration: 60000 * 3,
      action: async () => {
        this.#pressButton(GamepadKey.SELECT, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.SELECT, false)
      },
    },
    vats: {
      actionInterval: 5000,
      pauseDuration: 0,
      action: async () => {
        this.#pressButton(GamepadKey.LB, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.LB, false)
        this.#pressButton(GamepadKey.RT, true)
        await this.#delay(1000)
        this.#pressButton(GamepadKey.RT, false)
        this.#pressButtonWithRandomDelay(GamepadKey.RIGHT, 60000)
      },
    },
  }

  generateCustomLoopConfig(
    actionInterval: number,
    pauseDuration: number,
    action: () => Promise<void>
  ) {
    return {
      actionInterval,
      pauseDuration,
      action,
    }
  }

  toggleCustomHealLoop(interval: number) {
    const config = this.generateCustomLoopConfig(interval, 0, async () => {
      this.#pressButton(GamepadKey.RIGHT, true)
      await this.#delay(500)
      this.#pressButton(GamepadKey.RIGHT, false)
    })
    this.#loopConfigs['heal'] = config
    this.#loopModes['heal'] = true
    this.startButtonLoop('heal')
  }

  toggleCustomVatsLoop(interval: number) {
    const config = {
      actionInterval: interval,
      pauseDuration: 0,
      action: async () => {
        this.#pressButton(GamepadKey.LB, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.LB, false)
        this.#pressButton(GamepadKey.RT, true)
        await this.#delay(1000)
        this.#pressButton(GamepadKey.RT, false)
        this.#pressButtonWithRandomDelay(GamepadKey.RIGHT, 60000)
      },
    }
    this.#loopConfigs['vats'] = config
    this.#loopModes['vats'] = true
    this.startButtonLoop('vats')
  }

  #delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private startButtonLoop(mode: string) {
    BxLogger.info('AwayModeHandler', `attempting to start ${mode} loop`)

    const config = this.#loopConfigs[mode]

    if (config) {
      this.#loopModes[mode] = true
      const loopFunction = async () => {
        BxLogger.info('AwayModeHandler', `running ${mode} loop`)
        await config.action()
        await this.#delay(config.pauseDuration)
        if (this.#loopModes[mode])
          this.#loopIntervals[mode] = window.setTimeout(loopFunction, config.actionInterval)
      }
      loopFunction()

      // Countdown to the next iteration including pauseDuration
      let countdown = (config.actionInterval + config.pauseDuration) / 1000 // Convert milliseconds to seconds
      const logInterval = setInterval(() => {
        if (this.#loopModes[mode]) {
          BxLogger.info('AwayModeHandler', `loop ${mode} will run again in ${countdown} seconds`)
          Toast.show('Away Mode', `${mode} will run again in ${countdown} seconds`, {
            instant: true,
          })
          countdown--
          if (countdown < 0) {
            countdown = (config.actionInterval + config.pauseDuration) / 1000 // Reset countdown
          }
        } else {
          clearInterval(logInterval)
        }
      }, 1000)
    }
  }

  public stopButtonLoop(mode: string) {
    if (this.#loopModes[mode]) {
      this.#loopModes[mode] = false
      if (this.#loopIntervals[mode] !== null) {
        clearTimeout(this.#loopIntervals[mode]!)
        this.#loopIntervals[mode] = null
        Toast.show('Away Mode', `${mode} loop stopped`, { instant: true })
      } else {
        BxLogger.warning('AwayModeHandler', `${mode} loop interval was already null`)
      }
    } else {
      BxLogger.warning('AwayModeHandler', `${mode} loop was not running`)
    }
  }

  private stopRunningLoops() {
    for (const mode in this.#loopModes) {
      if (this.#loopModes[mode]) this.stopButtonLoop(mode)
    }
  }

  toggleGamepads() {
    window.navigator.getGamepads = () =>
      !this.#windowFocused ? [] : this.#mkbHandler.patchedGetGamepads()
  }

  setupEventListeners() {
    const checkWindowFocused = () => {
      if (document.hasFocus()) {
        BxEvent.dispatch(window, 'window-focused')
      } else {
        BxEvent.dispatch(window, 'window-blurred')
      }
    }

    setInterval(checkWindowFocused, 200) // 👉️ check if focused every

    window.addEventListener('blur', () => {
      window.navigator.getGamepads = () => this.#mkbHandler.getVirtualGamepads()
      SoundShortcut.mute(true)
      BxLogger.info('AwayModeHandler', 'Window blurred')
    })

    window.addEventListener('focus', () => {
      window.navigator.getGamepads = () => this.#mkbHandler.patchedGetGamepads()
      const prefVolume = SoundShortcut.getPrefVolume()
      if (prefVolume > 0) {
        SoundShortcut.unmute()
      }
      BxLogger.info('AwayModeHandler', 'Window focused')
    })

    window.addEventListener('ReactStateUpdate', (event: Event) => {
      const customEvent = event as CustomEvent
      console.log('🚌 ~ window.addEventListener ~ customEvent:', customEvent)
      BXCState.setState(customEvent.detail)
    })

    window.addEventListener(BxEvent.STREAM_STOPPED, () => {
      this.deactivate()
    })
  }
}

if (process.env.NODE_ENV === 'development') {
  window.awayModeHandler = AwayModeHandler.getInstance()
  window.window.addEventListener('DOMContentLoaded', () => {
    window.awayModeHandler.init()
  })
}
