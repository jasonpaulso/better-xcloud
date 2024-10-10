import { CE, createButton } from '@/utils/html'
import {
  AWAY_MODE_EVENTS,
  AwayModeHandler,
  type AwayModes,
} from '../../away-mode/away-mode-handler'
import { BxEvent } from '@/utils/bx-event'
import { BxLogger } from '@/utils/bx-logger'

interface PipBoyState {
  power: boolean
  screen: string
  buttonsDisabled: boolean
  actionButtons: PipBoyActionButton[]
}

interface PipBoyActionButton {
  action: AwayModes
  active?: boolean
  htmlElement?: HTMLElement
  label: string
  data?: any
}

const PipBoyActionButtons: PipBoyActionButton[] = [
  { action: 'heal', label: 'MEDIC' },
  { action: 'pivot', label: 'PIVOT' },
  { action: 'vats', label: 'VATS' },
  { action: 'awayMode', label: 'VIEW' },
]

class PipBoy {
  private static instance: PipBoy

  private $pipBoy: HTMLElement

  // create a state object for the PipBoy

  private state: PipBoyState = {
    power: false,
    screen: 'INACTIVE',
    buttonsDisabled: true,
    actionButtons: [],
  }

  private updateState = (newState: PipBoyState): void => {
    this.state = { ...this.state, ...newState }
  }

  private createButtons = (buttonData: PipBoyActionButton[]): void => {
    const buttons = buttonData.map(({ action, label }) => {
      return createButton({
        classes: ['btn'],
        disabled: this.state.buttonsDisabled,
        label: label,
        onClick: (e) => {
          e.preventDefault()
          e.stopPropagation()
          this.handleButtonClick(e.currentTarget as HTMLElement)
        },
        attributes: {
          'data-action': action,
          'data-active': false,
        },
      })
    })
    const buttonState = buttonData.map(({ action, label }, index) => ({
      action,
      active: false,
      enabled: true,
      label,
      htmlElement: buttons[index],
    }))
    this.updateState({
      ...this.state,
      actionButtons: buttonState,
    })
  }

  private updateButtonState = (action: string, active?: boolean): void => {
    const button = this.state.actionButtons.find((btn) => btn.action === action)
    if (button) {
      button.active = active ?? button.active
    }
    const newButtons = this.state.actionButtons.map((btn) =>
      btn.action === action ? { ...btn, active } : btn
    )
    this.updateState({ ...this.state, actionButtons: newButtons })
  }

  private toggleButtonState = (action: string): void => {
    BxLogger.info(`Toggling button state:`, action)
    const button = this.state.actionButtons.find((btn) => btn.action === action)
    if (button) {
      this.updateButtonState(action, !button.active)
      document.querySelector(`.btn[data-action="${action}"]`)?.classList.toggle('active')
    }
  }

  private constructor() {
    this.createButtons(PipBoyActionButtons)
    BxLogger.info(`PipBoy created:`, this.state.actionButtons)
    this.$pipBoy = this.createPipBoy()
    this.setupEventListeners(
      this.$pipBoy.querySelector('.pipboy')!,
      this.$pipBoy.querySelector('.power-switch')!,
      this.$pipBoy.querySelector('.screen')!,
      Array.from(this.$pipBoy.querySelectorAll('.btn'))
    )
    AwayModeHandler.getInstance().init()
  }

  public static getInstance(): PipBoy {
    if (!PipBoy.instance) {
      PipBoy.instance = new PipBoy()
    }

    return PipBoy.instance
  }

  public render(): void {
    document.documentElement.appendChild(this.$pipBoy)
  }

  private handleButtonClick = (button: HTMLElement): void => {
    const action = button.getAttribute('data-action')
    BxEvent.dispatch(window, AWAY_MODE_EVENTS.TOGGLE_MODE, {
      action: action,
    })
  }

  private createPipBoy(): HTMLElement {
    const led = CE('div', { class: 'led' })
    const powerSwitch = CE('div', { class: 'power-switch' })
    const statusBar = CE('div', { class: 'status-bar' }, led, powerSwitch)

    const screen = CE('div', { class: 'screen' }, 'INACTIVE')
    const buttons = this.state.actionButtons.map((btn) => btn.htmlElement)
    const buttonsContainer = CE('div', { class: 'buttons' }, ...buttons)

    const content = CE('div', { class: 'pipboy-content' }, screen, buttonsContainer)

    const pipboy = CE('div', { class: 'pipboy' }, statusBar, content)
    const rootElement = CE('div', { class: 'pipboy-root' }, pipboy)

    return rootElement
  }

  private setupEventListeners(
    pipboy: HTMLElement,
    powerSwitch: HTMLElement,
    screen: HTMLElement,
    buttons?: HTMLElement[]
  ): void {
    pipboy.addEventListener('mouseover', () => pipboy.classList.add('hovered'))
    pipboy.addEventListener('mouseout', () => pipboy.classList.remove('hovered'))

    buttons &&
      powerSwitch.addEventListener('click', () => this.togglePower(pipboy, screen, buttons))

    window.addEventListener(AWAY_MODE_EVENTS.TOGGLE_MODE, (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      const pipboyButtonEvent = (event as any).action
      this.toggleButtonState(pipboyButtonEvent)
    })
  }

  private togglePower(pipboy: HTMLElement, screen: HTMLElement, buttons: HTMLElement[]): void {
    const isPowerOn = pipboy.classList.toggle('on')

    buttons.forEach((btn) => ((btn as HTMLButtonElement).disabled = !isPowerOn))
    if (!isPowerOn) {
      buttons.forEach((btn) => btn.classList.remove('active'))
    }
    BxEvent.dispatch(window, AWAY_MODE_EVENTS.TOGGLE_AWAY)
    this.updateState({ ...this.state, power: isPowerOn, buttonsDisabled: !isPowerOn })
    this.updateScreen(screen, buttons)
  }

  private updateScreen(screen: HTMLElement, buttons: HTMLElement[]): void {
    const screenText = this.state.power ? 'ACTIVE' : 'INACTIVE'
    screen.textContent = screenText
  }
}

export { PipBoy }
