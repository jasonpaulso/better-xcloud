import { BxLogger } from '@/utils/bx-logger'
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
  #state: StateType = {}

  init = () => {
    this.setupEventListeners()
    this.#state = BXCState.getState()
    BxLogger.info('AwayModeHandler', 'Initialized', this.#state)
  }

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new AwayModeHandler()
    }
    return this.#instance
  }

  toggle = (force?: boolean) => {
    this.#enabled = Boolean(force) || !this.#enabled
    if (this.#enabled) {
      this.#mkbHandler.start()
      this.#onPointerLockExited()
    } else {
      this.stopRunningLoops()
      this.#mkbHandler.stop()
      this.#mkbHandler.hideMessage()
    }
    Toast.show('Away Mode', this.#enabled ? 'Activated' : 'Deactivated', { instant: true })
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
    this.#loopConfigs[mode] = config
    this.toggleButtonLoop(mode as AwayModes)
  }

  toggleCustomHealLoop(interval: number) {
    this.toggleCustomLoop(
      'custom',
      this.generateCustomLoopConfig(interval, 0, async () => {
        this.#pressButton(AwayModeButtonIndexKey.HEAL, true)
        await this.#delay(500)
        this.#pressButton(AwayModeButtonIndexKey.HEAL, false)
      })
    )
  }

  #delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  toggleButtonLoop(mode: AwayModes) {
    BxLogger.info('AwayModeHandler', `${mode} button loop toggled`)
    this.#loopModes[mode] = !this.#loopModes[mode]
    if (!this.#enabled) {
      this.toggle()
    }
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
        if (this.#loopModes[mode] && this.#enabled) {
          await config.action()
          await this.#delay(config.pauseDuration)
          this.#loopIntervals[mode] = window.setTimeout(loopFunction, config.actionInterval)
          Toast.show('Away Mode', `${mode} loop running`, { instant: true })
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
      BXCState.setState(customEvent.detail)
    })

    BXCState.subscribe(
      (state: { pipboyAction?: { awayModeAction: AwayModes; active: boolean } }) => {
        if (state.pipboyAction) {
          this.toggleAwayMode(state.pipboyAction.awayModeAction)
        }
      }
    )
  }
}
