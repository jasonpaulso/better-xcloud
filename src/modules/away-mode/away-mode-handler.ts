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

const AwayModeButtonIndexKey = {
  HEAL: GamepadKey.RIGHT,
} as const

interface AwayModeMode {
  name: AwayModes
  interval: number
  pause: number
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
  #state: AwayModeState | {} = {
    awayModeEnabled: false,
  }

  setModeState = (mode: AwayModes, interval: number, pause: number, enabled: boolean) => {
    this.#state = {
      ...this.#state,
      awayModeMode: {
        name: mode,
        interval,
        pause,
        enabled,
      },
    }
  }

  handleAwayModeEvent = (state: AwayModeState) => {
    this.#state = state
    if (state.hasOwnProperty('awayModeMode')) {
      if (!this.#enabled) {
        this.toggle(true)
        BXCState.setState({ awayModeEnabled: true })
      }
      switch (state.awayModeMode?.name) {
        case 'heal':
          if (state.awayModeMode.enabled) {
            this.toggleCustomHealLoop(state.awayModeMode.interval || 500)
          } else {
            this.stopButtonLoop('heal')
          }
          break
        case 'vats':
          if (state.awayModeMode.enabled) {
            this.toggleCustomVatsLoop(state.awayModeMode.interval || 5000)
          } else {
            this.stopButtonLoop('vats')
          }
          break
        case 'pivot':
          if (state.awayModeMode.enabled) {
            this.toggleButtonLoop('pivot')
          } else {
            this.stopButtonLoop('pivot')
          }

          break
        case 'awayMode':
          if (state.awayModeMode.enabled) {
            this.toggleButtonLoop('awayMode')
          } else {
            this.stopButtonLoop('awayMode')
          }
          break
        default:
          break
      }
    }
  }

  init = () => {
    this.setupEventListeners()
    BXCState.setState(this.#state)
    BxLogger.info('AwayModeHandler', 'Initialized', BXCState.getState())
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

  // this.#enabled = Boolean(force) || !this.#enabled
  // if (this.#enabled) {
  //   this.#mkbHandler.start()
  //   this.#onPointerLockExited()
  // } else {
  //   this.stopRunningLoops()
  //   this.#mkbHandler.stop()
  //   this.#mkbHandler.hideMessage()
  // }
  // Toast.show('Away Mode', this.#enabled ? 'Activated' : 'Deactivated', { instant: true })
  // }

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
        Toast.show('Away Mode', 'Healing', { instant: true })
        this.#pressButton(GamepadKey.RIGHT, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.RIGHT, false)
      },
    },
    pivot: {
      actionInterval: 1000,
      pauseDuration: 15000,
      action: async () => {
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_RIGHT, 1000)
        // BxLogger.info('AwayModeHandler', 'Pivoting right')
        await this.#delay(500)
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_LEFT, 1000)
        // BxLogger.info('AwayModeHandler', 'Pivoting left')
        await this.#delay(500)
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_UP, 500)
        // BxLogger.info('AwayModeHandler', 'Pivoting up')
        await this.#delay(500)
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_DOWN, 500)
        // BxLogger.info('AwayModeHandler', 'Pivoting down')
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

  toggleCustomLoop(mode: string, config: any) {
    // stop the loop if it's already running and the config is the same
    if (this.#loopConfigs[mode] === config) {
      this.stopButtonLoop(mode)
      return
    }
    // stop the loop if it's already running and the config is different
    if (this.#loopConfigs[mode] && this.#loopModes[mode]) {
      this.stopButtonLoop(mode)
    }
    // start the loop
    this.#loopConfigs[mode] = config
    this.toggleButtonLoop(mode as AwayModes)
  }

  toggleCustomHealLoop(interval: number) {
    this.toggleCustomLoop(
      'Medic',
      this.generateCustomLoopConfig(interval, 0, async () => {
        this.#pressButton(AwayModeButtonIndexKey.HEAL, true)
        await this.#delay(500)
        this.#pressButton(AwayModeButtonIndexKey.HEAL, false)
      })
    )
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
        BxLogger.info('AwayModeHandler', `vats every ${interval}ms`)
        this.#pressButtonWithRandomDelay(GamepadKey.RIGHT, 60000)
      },
    }
    this.toggleCustomLoop('vats', config)
  }

  #delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  toggleButtonLoop(mode: AwayModes) {
    BxLogger.info('AwayModeHandler', `${mode} button loop toggled`)
    this.#loopModes[mode] = !this.#loopModes[mode]
    if (this.#loopModes[mode]) {
      this.startButtonLoop(mode)
    } else {
      this.stopButtonLoop(mode)
    }
  }

  private startButtonLoop(mode: string) {
    BxLogger.info('AwayModeHandler', `${mode} loop started`)
    const config = this.#loopConfigs[mode]

    if (config) {
      const loopFunction = async () => {
        if (this.#loopModes[mode]) {
          await config.action()
          await this.#delay(config.pauseDuration)

          this.#loopIntervals[mode] = window.setTimeout(loopFunction, config.actionInterval)
          // display a toast as we countdown to the next iteration
          Toast.show('Away Mode', `${mode} loop in ${config.actionInterval / 1000} seconds`, {
            instant: true,
          })
        }
      }
      loopFunction()
    }
  }

  private stopButtonLoop(mode: string) {
    BxLogger.info('AwayModeHandler', `${mode} loop stopped`)
    this.#loopModes[mode] = false
    if (this.#loopIntervals[mode] !== null) {
      clearTimeout(this.#loopIntervals[mode]!)
      this.#loopIntervals[mode] = null
    }
  }

  private stopRunningLoops() {
    for (const mode in this.#loopModes) {
      if (this.#loopModes[mode]) this.stopButtonLoop(mode)
    }
  }

  // Single function to toggle away modes
  toggleAwayMode(mode: AwayModes) {
    this.toggleButtonLoop(mode)
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
  }
}

if (process.env.NODE_ENV === 'development') {
  window.awayModeHandler = AwayModeHandler.getInstance()
  window.window.addEventListener('DOMContentLoaded', () => {
    window.awayModeHandler.init()
  })
}
