import { EmulatedMkbHandler } from '../mkb/mkb-handler'

const css = (strings: TemplateStringsArray, ...values: any[]) =>
  String.raw({ raw: strings }, ...values)

class PipBoy {
  private static instance: PipBoy

  private $pipBoy: PipBoyCore

  private constructor() {
    this.$pipBoy = PipBoyCore.getInstance()
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
}

export { PipBoy }

class PipBoyCore extends HTMLElement {
  private static instance: PipBoyCore

  public static getInstance(): PipBoyCore {
    if (!PipBoyCore.instance) {
      PipBoyCore.instance = new PipBoyCore()
    }

    return PipBoyCore.instance
  }

  private activeButtons: Set<string>
  private isPowerOn: boolean
  private powerSwitch: HTMLElement | null

  private screen: HTMLElement | null
  private buttons: NodeListOf<HTMLButtonElement> | null

  private styles: { [key: string]: string } = {
    ':host': css`
      display: block;
      font-family: monospace;
      position: fixed;
      right: var(--pipboy-left, 20px);
      bottom: var(--pipboy-top, 20px);
      z-index: var(--pipboy-z-index, 1000);
    `,
    '.pipboy': css`
      background-color: #000;
      border: 4px solid #2a2a2a;
      border-radius: 10px;
      padding: 10px;
      width: 300px;
      box-shadow: 0 0 20px #0f380f;
      position: relative;
      opacity: 0.05;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: opacity 0.3s ease;
    `,
    '.pipboy.hovered,.pipboy.on': css`
      opacity: 0.7;
    `,
    '.pipboy-content': css`
      display: flex;
      flex-direction: column;
      gap: 10px;
    `,
    '.status-bar': css`
      display: flex;
      justify-content: space-between;
      align-items: center;
    `,
    '.screen': css`
      background-color: #000;
      border: 2px solid #0f0;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #0f0;
      font-size: 20px;
      text-shadow: 0 0 5px #0f0;
      font-family: monospace;
      padding: 10px;
    `,
    '.buttons': css`
      display: flex;
      justify-content: space-between;
      gap: 10px;
    `,
    '.btn': css`
      background-color: #1a1a1a;
      border: 2px solid #0f0;
      border-radius: 5px;
      padding: 5px;
      cursor: pointer;
      font-family: monospace;
      font-size: 16px;
      color: #0f0;
      transition: all 0.3s ease;
      outline: none;
      width: 100%;
    `,
    '.btn:hover': css`
      background-color: #2a2a2a;
      box-shadow: 0 0 10px #0f0;
    `,
    '.btn:active': css`
      background-color: #0f0;
      color: #000;
      // pulse effect
      animation: pulse 0.5s infinite;
    `,

    '.btn.active': css`
      background-color: #0f0;
      color: #000;
      box-shadow: 0 0 15px #0f0;
    `,
    '.btn:disabled': css`
      opacity: 0.5;
      cursor: not-allowed;
    `,
    '.power-switch': css`
      position: relative;
      width: 32px;
      height: 16px;
      background-color: #2a2a2a;
      border: 2px solid #0f0;
      border-radius: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
    `,
    '.power-switch::after': css`
      content: '';
      background-color: #0f0;
      border-radius: 50%;
      transition: all 0.3s;
      height: 100%;
      width: 50%;
    `,
    '.on .power-switch::after': css`
      transform: translateX(100%);
    `,
    '.led': css`
      // position: absolute;
      top: 10px;
      left: 10px;
      width: 10px;
      height: 10px;
      background-color: #300;
      border-radius: 50%;
      transition: all 0.3s;
    `,
    '.on .led': css`
      background-color: #f00;
      box-shadow: 0 0 5px #f00;
    `,
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.activeButtons = new Set<string>()
    this.isPowerOn = false
    this.powerSwitch = null

    this.screen = null
    this.buttons = null
  }

  connectedCallback(): void {
    this.render()
    this.setupEventListeners()
    this.animateLED()
  }

  private render(): void {
    const style = document.createElement('style')
    style.textContent = Object.entries(this.styles)
      .map(([selector, rules]) => `${selector} { ${rules} }`)
      .join('\n')

    const html = `
      <div class="pipboy">
        <div class="status-bar">
          <div class="led"></div>
          <div class="power-switch"></div>
        </div>
       <div class="pipboy-content">
        <div class="screen">INACTIVE</div>
        <div class="buttons">
          <button class="btn" data-screen="MEDIC" data-action="medic" disabled>MEDIC</button>
          <button class="btn" data-screen="PIVOT" data-action="pivot" disabled>PIVOT</button>
          <button class="btn" data-screen="CROUCH" data-action="crouch" disabled>CROUCH</button>
          <button class="btn" data-screen="VIEW" data-action="view" disabled>VIEW</button>
        </div>
       </div>
      </div>
    `

    this.shadowRoot!.innerHTML = `${style.outerHTML}${html}`
  }

  private setupEventListeners(): void {
    this.powerSwitch = this.shadowRoot!.querySelector('.power-switch')

    this.screen = this.shadowRoot!.querySelector('.screen')
    this.buttons = this.shadowRoot!.querySelectorAll('.btn')
    const pipboy = this.shadowRoot!.querySelector('.pipboy') as HTMLElement

    // find medic button by dataset
    const medicButton = Array.from(this.buttons!).find((btn) => btn.dataset.action === 'medic')

    // find pivot button by dataset
    const pivotButton = Array.from(this.buttons!).find((btn) => btn.dataset.action === 'pivot')

    // find crouch button by dataset
    const crouchButton = Array.from(this.buttons!).find((btn) => btn.dataset.action === 'crouch')

    // find view button by dataset
    const viewButton = Array.from(this.buttons!).find((btn) => btn.dataset.action === 'view')

    this.addEventListener('mouseover', () => {
      pipboy.classList.add('hovered')
    })
    this.addEventListener('mouseout', () => {
      pipboy.classList.remove('hovered')
    })

    this.powerSwitch!.addEventListener('click', () => this.togglePower())

    medicButton?.addEventListener('click', () =>
      EmulatedMkbHandler.getInstance().toggleAwayMode('heal')
    )
    pivotButton?.addEventListener('click', () =>
      EmulatedMkbHandler.getInstance().toggleAwayMode('pivot')
    )
    crouchButton?.addEventListener('click', () =>
      EmulatedMkbHandler.getInstance().toggleAwayMode('crouch')
    )
    viewButton?.addEventListener('click', () =>
      EmulatedMkbHandler.getInstance().toggleAwayMode('awayMode')
    )

    this.buttons!.forEach((button) => {
      button.addEventListener('click', () => this.toggleButton(button))
    })
  }

  private togglePower(): void {
    const pipboy = this.shadowRoot!.querySelector('.pipboy') as HTMLElement
    this.isPowerOn = !this.isPowerOn
    pipboy.classList.toggle('on')

    this.buttons!.forEach((btn) => (btn.disabled = !this.isPowerOn))
    if (!this.isPowerOn) {
      this.activeButtons.clear()
      this.buttons!.forEach((btn) => btn.classList.remove('active'))
    }
    EmulatedMkbHandler.getInstance().toggleAway()
    this.updateScreen()
  }

  private toggleButton(button: HTMLButtonElement): void {
    if (this.isPowerOn) {
      button.classList.toggle('active')
      if (button.classList.contains('active')) {
        this.activeButtons.add(button.dataset.screen!)
      } else {
        this.activeButtons.delete(button.dataset.screen!)
      }
      this.updateScreen()
    }
  }

  private updateScreen(): void {
    if (!this.isPowerOn) {
      this.screen!.textContent = 'AFK-Boy 3000'
    } else if (this.activeButtons.size === 0) {
      this.screen!.textContent = 'INACTIVE'
    } else {
      this.screen!.textContent = Array.from(this.activeButtons).join(' + ')
    }
  }

  private animateLED(): void {
    const led = this.shadowRoot!.querySelector('.led') as HTMLElement

    led.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
      {
        duration: 1000,
        iterations: Infinity,
      }
    )
  }
}

customElements.define('pip-boy-core', PipBoyCore)
