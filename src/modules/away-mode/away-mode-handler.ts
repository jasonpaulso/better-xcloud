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

export type AwayModes = 'heal' | 'pivot' | 'awayMode' | 'vats'

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
  #enabled: boolean = false
  #mkbHandler: EmulatedMkbHandler
  #windowFocused: boolean = true
  #pressButton: (buttonCode: number, isPressed: boolean) => void
  #onPointerLockExited: () => void = () => {}
  static #instance: AwayModeHandler

  private constructor() {
    this.#mkbHandler = EmulatedMkbHandler.getInstance()
    this.#pressButton = this.#mkbHandler.pressButton.bind(this.#mkbHandler)
    this.#onPointerLockExited = this.#mkbHandler.onPointerLockExited.bind(this)
  }

  private loopConfigs: Map<
    string,
    {
      actionInterval: number
      pauseDuration: number
      action: () => Promise<void>
      isRunning: boolean
    }
  > = new Map()

  private intervals: Map<string, number> = new Map()

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new AwayModeHandler()
    }
    return this.#instance
  }

  init = () => {
    BxLogger.info('AwayModeHandler', 'Initializing away mode handler')
    this.setupEventListeners()
    this.initializeDefaultConfigs()
  }

  private initializeDefaultConfigs() {
    this.updateMode('heal', {
      actionInterval: 1000,
      pauseDuration: 0,
      action: async () => {
        this.#pressButton(GamepadKey.RIGHT, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.RIGHT, false)
      },
    })

    this.updateMode('pivot', {
      actionInterval: 2500,
      pauseDuration: 15000,
      action: async () => {
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_RIGHT, 1000)
        await this.#delay(500)
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_LEFT, 1000)
      },
    })

    this.updateMode('awayMode', {
      actionInterval: 1000,
      pauseDuration: 15000,
      action: async () => {
        this.#pressButton(GamepadKey.L3, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.L3, false)
      },
    })

    this.updateMode('vats', {
      actionInterval: 1000,
      pauseDuration: 0,
      action: async () => {
        this.#pressButton(GamepadKey.LB, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.LB, false)
        this.#pressButton(GamepadKey.RT, true)
        await this.#delay(2000)
        this.#pressButton(GamepadKey.RT, false)
      },
    })
  }

  updateMode(
    modeName: string,
    config: {
      actionInterval: number
      pauseDuration: number
      action: () => Promise<void>
      enabled?: boolean
    }
  ) {
    this.stopButtonLoop(modeName)
    this.loopConfigs.set(modeName, { ...config, isRunning: false })
    if (config.enabled) {
      this.startButtonLoop(modeName)
    }
  }

  private startButtonLoop(mode: string) {
    const config = this.loopConfigs.get(mode)
    if (!config) return

    config.isRunning = true

    const loopFunction = async () => {
      if (!config.isRunning) return

      BxLogger.info('AwayModeHandler', `Running ${mode} loop`)
      await config.action()
      await this.#delay(config.pauseDuration)

      if (config.isRunning) {
        this.intervals.set(mode, window.setTimeout(loopFunction, config.actionInterval))
      }
    }

    loopFunction()
    this.startCountdown(mode)
  }

  private stopButtonLoop(mode: string) {
    const interval = this.intervals.get(mode)
    if (interval) {
      clearTimeout(interval)
      this.intervals.delete(mode)
    }

    const config = this.loopConfigs.get(mode)
    if (config) {
      config.isRunning = false
    }
  }

  private startCountdown(mode: string) {
    const config = this.loopConfigs.get(mode)
    if (!config) return

    let countdown = (config.actionInterval + config.pauseDuration) / 1000
    const logInterval = setInterval(() => {
      if (config.isRunning) {
        BxLogger.info('AwayModeHandler', `Loop ${mode} will run again in ${countdown} seconds`)
        Toast.show('Away Mode', `${mode} will run again in ${countdown} seconds`, { instant: true })
        countdown--
        if (countdown < 0) {
          countdown = (config.actionInterval + config.pauseDuration) / 1000
        }
      } else {
        clearInterval(logInterval)
      }
    }, 1000)
  }

  toggle = (toggle: boolean) => {
    BxLogger.info('AwayModeHandler', `Toggling away mode: ${toggle}`)
    toggle ? this.activate() : this.deactivate()
  }

  activate = () => {
    if (this.#enabled) {
      BxLogger.warning('AwayModeHandler', 'Away mode is already activated')
      return
    }
    this.#enabled = true
    this.#mkbHandler.start()
    this.#onPointerLockExited()
    this.#mkbHandler.hideMessage()
    Toast.show('Away Mode', 'Activated', { instant: true })

    // // Start all configured loops
    // for (const [mode] of this.loopConfigs) {
    //   this.startButtonLoop(mode)
    // }
  }

  deactivate = () => {
    if (!this.#enabled) {
      BxLogger.warning('AwayModeHandler', 'Away mode is already deactivated')
      return
    }
    this.#enabled = false
    this.stopAllLoops()
    this.#mkbHandler.stop()
    this.#mkbHandler.hideMessage()

    Toast.show('Away Mode', 'Deactivated', { instant: true })
  }

  destroy = () => {
    this.#enabled = false
    this.stopAllLoops()
    this.#mkbHandler.destroy()
  }

  private stopAllLoops() {
    for (const [mode] of this.loopConfigs) {
      this.stopButtonLoop(mode)
    }
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

  #delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
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

    setInterval(checkWindowFocused, 200)

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

    window.addEventListener('keydown', (e) => {
      if (e.metaKey && e.key === 'r') {
        window.location.reload()
      }
    })

    BXCState.subscribe((state: AwayModeState) => {
      BxLogger.info('AwayModeHandler', `State update: `, state)
      const mode = state.awayModeMode
      if (mode) {
        BxLogger.info('AwayModeHandler', `Away mode mode: `, mode)
        this.handleAwayModeEvent(state)
      }
      const enabled = state.awayModeEnabled
      if (enabled !== undefined && enabled !== this.#enabled) {
        BxLogger.info('AwayModeHandler', `Away mode enabled: ${enabled}`)
        this.toggle(enabled)
      }
    })
  }

  handleAwayModeEvent(state: AwayModeState) {
    const mode = state.awayModeMode
    if (mode && mode.name) {
      if (!this.#enabled) {
        this.activate()
      }
      const existingConfig = this.loopConfigs.get(mode.name)
      this.updateMode(mode.name, {
        actionInterval: mode.interval || existingConfig?.actionInterval || 1000,
        pauseDuration: existingConfig?.pauseDuration || 0,
        action: existingConfig?.action || (async () => {}),
        enabled: mode.enabled,
      })
    }
  }
}

;() => {
  window.addEventListener(BxEvent.STREAM_PLAYING, (_e) => {
    AwayModeHandler.getInstance().init()
  })
  window.addEventListener(BxEvent.STREAM_STOPPED, (_e) => {
    AwayModeHandler.getInstance().destroy()
  })
  // Development-only code
  if (process.env.NODE_ENV === 'development') {
    ;(window as any).awayModeHandler = AwayModeHandler.getInstance()
  }
}
