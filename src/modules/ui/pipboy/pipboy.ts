import { AwayModeHandler } from '../../away-mode/away-mode-handler'

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
      display: flex;
      align-items: center;
      justify-content: center;
      height: 4rem;
      padding: 0.6rem;
    `,
    '.btn svg': css`
      height: 100%;
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
          <button class="btn" data-screen="COFFEE" data-action="coffee" disabled>COFFEE</button>
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
    const coffeeButton = Array.from(this.buttons!).find((btn) => btn.dataset.action === 'coffee')
    if (coffeeButton) {
      coffeeButton.innerHTML = svg
    }

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
      AwayModeHandler.getInstance().toggleAwayMode('heal')
    )
    pivotButton?.addEventListener('click', () =>
      AwayModeHandler.getInstance().toggleAwayMode('pivot')
    )
    coffeeButton?.addEventListener('click', () =>
      AwayModeHandler.getInstance().toggleAwayMode('coffee')
    )
    viewButton?.addEventListener('click', () =>
      AwayModeHandler.getInstance().toggleAwayMode('awayMode')
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
    AwayModeHandler.getInstance().toggle()
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

// define an svg icon
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 51.67 88.98"><script xmlns=""/><defs><style>.cls-1{fill:#f5cb5b;fill-rule:evenodd;}.cls-2{fill:none;stroke:#231f20;stroke-linecap:square;stroke-miterlimit:6.29;stroke-width:1.5px;}</style></defs><path class="cls-1" d="M5,79Q.91,61.58,1,50.37l.21-4.83-.11-1q0-4.2,5.24-7.24A26.39,26.39,0,0,1,18.2,34.33l-1.57,2.72L9,38.73q-4.08,1.68-4.08,4.09T9,46.91a27.88,27.88,0,0,0,10.49,1.78,26.74,26.74,0,0,0,10.27-1.78q4.19-1.57,4.19-4.09t-4.19-4.09l-5.45-1.47.1-.1,1.68-1.36.1-.21.42-.53,5.66,2.2q5.35,3,5.35,7.24l-.11,1,.21,4.83v1.78a12.88,12.88,0,0,1,5.77-2.31l3.67.32L49.22,52a10.44,10.44,0,0,1,1.89,7.45l-2,7.75a47.59,47.59,0,0,1-5.35,10.17L42.31,79.3A8.17,8.17,0,0,1,38.11,81l-4.4-.73-.31-.11-1.26,4.2a20.35,20.35,0,0,1-12.79,4.29A20.77,20.77,0,0,1,6.46,84.33L5,79M45.87,65.46,47.44,60a8.34,8.34,0,0,0-.94-5.24l-.84-1.05L44,53.62a9.88,9.88,0,0,0-4.08,1.57l-2,2-.52.42a154,154,0,0,1-2.94,18l.21.21,1,.94a1.23,1.23,0,0,0,1,.42,3.55,3.55,0,0,0,3-.94l1.67-1.89,4.51-8.91" transform="translate(-0.26 -0.4)"/><path class="cls-2" d="M5,79Q.91,61.58,1,50.37l.21-4.83-.11-1q0-4.2,5.24-7.24A26.39,26.39,0,0,1,18.2,34.33l-1.57,2.72L9,38.73q-4.08,1.68-4.08,4.09T9,46.91a27.88,27.88,0,0,0,10.49,1.78,26.74,26.74,0,0,0,10.27-1.78q4.19-1.57,4.19-4.09t-4.19-4.09l-5.45-1.47.1-.1,1.68-1.36.1-.21.42-.53,5.66,2.2q5.35,3,5.35,7.24l-.11,1,.21,4.83v1.78a12.88,12.88,0,0,1,5.77-2.31l3.67.32L49.22,52a10.44,10.44,0,0,1,1.89,7.45l-2,7.75a47.59,47.59,0,0,1-5.35,10.17L42.31,79.3A8.17,8.17,0,0,1,38.11,81l-4.4-.73-.31-.11-1.26,4.2a20.35,20.35,0,0,1-12.79,4.29A20.77,20.77,0,0,1,6.46,84.33L5,79M45.87,65.46,47.44,60a8.34,8.34,0,0,0-.94-5.24l-.84-1.05L44,53.62a9.88,9.88,0,0,0-4.08,1.57l-2,2-.52.42a154,154,0,0,1-2.94,18l.21.21,1,.94a1.23,1.23,0,0,0,1,.42,3.55,3.55,0,0,0,3-.94l1.67-1.89,4.51-8.91" transform="translate(-0.26 -0.4)"/><path class="cls-1" d="M21.45,7.18,19,11.06,18,14.94l.73,2.72,1.47,3.67,2.93,3.57,1.47,3.46a9,9,0,0,1-1.05,6.7l-4.08,4.82L16.94,42.3l-1.26.21.95-1.58,3-6.39A15.62,15.62,0,0,0,20.29,29q-.2-2.4-3.77-7.65c-2.23-3.14-3.25-5.69-3-7.65a9.37,9.37,0,0,1,1.78-4.3,24.63,24.63,0,0,1,9.44-8l.42.84L21.87,6.87l-.42.31" transform="translate(-0.26 -0.4)"/><path class="cls-2" d="M21.45,7.18,19,11.06,18,14.94l.73,2.72,1.47,3.67,2.93,3.57,1.47,3.46a9,9,0,0,1-1.05,6.7l-4.08,4.82L16.94,42.3l-1.26.21.95-1.58,3-6.39A15.62,15.62,0,0,0,20.29,29q-.2-2.4-3.77-7.65c-2.23-3.14-3.25-5.69-3-7.65a9.37,9.37,0,0,1,1.78-4.3,24.63,24.63,0,0,1,9.44-8l.42.84L21.87,6.87Z" transform="translate(-0.26 -0.4)"/></svg>
`
