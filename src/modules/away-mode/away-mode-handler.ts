import { BxLogger } from '@/utils/bx-logger'
import { Toast } from '@/utils/toast'
import { EmulatedMkbHandler } from '../mkb/mkb-handler'
import { GamepadKey } from '@/enums/mkb'

type AwayModes = 'heal' | 'pivot' | 'crouch' | 'awayMode' | 'coffee'

export class AwayModeHandler {
  static #instance: AwayModeHandler
  #enabled = false
  #mkbHandler = EmulatedMkbHandler.getInstance()
  #pressButton = this.#mkbHandler.pressButton.bind(this.#mkbHandler)
  #onPointerLockExited = this.#mkbHandler.onPointerLockExited.bind(this.#mkbHandler)

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new AwayModeHandler()
    }
    return this.#instance
  }

  toggle = () => {
    this.#enabled = !this.#enabled
    if (this.#enabled) {
      this.#mkbHandler.start()
      this.#onPointerLockExited()
      Toast.show('Away Mode', 'Enabled', { instant: true })
    } else {
      this.#mkbHandler.stop()
      Toast.show('Away Mode', 'Disabled', { instant: true })
      this.#mkbHandler.hideMessage()
    }
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
  }

  #loopIntervals: { [key: string]: number | null } = {
    heal: null,
    pivot: null,
    crouch: null,
    awayMode: null,
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
      pauseDuration: 60000,
      action: async () => {
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_RIGHT, 1000)
        await this.#delay(500)
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_RIGHT, 1000)
        await this.#pressButtonWithRandomDelay(GamepadKey.X, 50)
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
    coffee: {
      actionInterval: 10000,
      pauseDuration: 0,
      action: async () => {
        this.#pressButton(GamepadKey.UP, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.UP, false)
        this.#pressButton(GamepadKey.RS_DOWN, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.RS_DOWN, false)
        this.#pressButton(GamepadKey.A, true)
        await this.#delay(500)
        this.#pressButton(GamepadKey.A, false)
      },
    },
  }

  #delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  toggleButtonLoop(mode: AwayModes) {
    BxLogger.info('AwayModeHandler', `${mode} button loop toggled`)
    this.#loopModes[mode] = !this.#loopModes[mode]

    if (this.#enabled) {
      if (this.#loopModes[mode]) {
        this.startButtonLoop(mode)
      } else {
        this.stopButtonLoop(mode)
      }
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

  // Single function to toggle away modes
  toggleAwayMode(mode: AwayModes) {
    this.toggleButtonLoop(mode)
  }
}
