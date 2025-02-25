import { GamepadKey } from "@/enums/mkb";
import { ButtonPressHandler } from "./button-press-handler";
import { TimingUtils } from "./timing-utils";
import { LoopManager } from "./loop-manager";
import {
  type LoopConfig,
  FO76AutomationModes,
  type FO76AutomationState,
  type FO76AutomationStateObserver,
} from "./types";

/**
 * Manages automation modes and their execution
 */
export class AutomationManager {
  private enabled: boolean = false;
  private modes: Map<string, LoopConfig> = new Map();
  private observers: Set<FO76AutomationStateObserver> = new Set();
  private buttonHandler: ButtonPressHandler;
  private loopManager: LoopManager;

  constructor(
    pressButton: (buttonCode: number, isPressed: boolean) => void,
    private defaultActionInterval: number,
    private defaultPauseDuration: number,
    private pivotActionInterval: number,
    private pivotPauseDuration: number,
    private vatsPauseDuration: number,
    private interactActionInterval: number
  ) {
    this.buttonHandler = new ButtonPressHandler(pressButton);
    this.loopManager = new LoopManager();
    this.initializeDefaultModes();
  }

  /**
   * Initialize default automation modes
   */
  private initializeDefaultModes(): void {
    // Add default modes with their configurations
    this.modes.set(FO76AutomationModes.HEAL, {
      isRunning: false,
      actionInterval: this.defaultActionInterval,
      pauseDuration: this.defaultPauseDuration,
      action: async () => {
        await this.buttonHandler.pressButtonWithRandomDelay(
          GamepadKey.RIGHT,
          100
        );
      },
    });

    this.modes.set(FO76AutomationModes.PIVOT, {
      isRunning: false,
      actionInterval: this.pivotActionInterval,
      pauseDuration: this.pivotPauseDuration,
      action: async () => {
        await this.buttonHandler.pressButtonWithRandomDelay(
          GamepadKey.RS_RIGHT,
          100
        );
        await TimingUtils.delay(500);
        await this.buttonHandler.pressButtonWithRandomDelay(
          GamepadKey.RS_LEFT,
          100
        );
      },
    });

    this.modes.set(FO76AutomationModes.VATS, {
      isRunning: false,
      actionInterval: this.defaultActionInterval,
      pauseDuration: this.vatsPauseDuration,
      action: async () => {
        await this.buttonHandler.pressButtonWithRandomDelay(GamepadKey.LB, 100);
        await TimingUtils.delay(500);
        await this.buttonHandler.pressButtonWithRandomDelay(GamepadKey.RT, 100);
      },
    });

    this.modes.set(FO76AutomationModes.INTERACT, {
      isRunning: false,
      actionInterval: this.interactActionInterval,
      pauseDuration: 0,
      action: async () => {
        await this.buttonHandler.pressButtonWithRandomDelay(GamepadKey.A, 50);
      },
    });
  }

  /**
   * Subscribe an observer to state changes
   */
  subscribe(observer: FO76AutomationStateObserver): void {
    this.observers.add(observer);
  }

  /**
   * Unsubscribe an observer from state changes
   */
  unsubscribe(observer: FO76AutomationStateObserver): void {
    this.observers.delete(observer);
  }

  /**
   * Notify all observers of state changes
   */
  private notifyObservers(): void {
    const state: FO76AutomationState = {
      enabled: this.enabled,
      modes: this.modes,
    };
    this.observers.forEach((observer) => observer.update(state));
  }

  /**
   * Get all automation modes
   */
  getModes(): Map<string, LoopConfig> {
    return this.modes;
  }

  /**
   * Toggle a specific automation mode
   */
  toggleMode(mode: FO76AutomationModes, config?: Partial<LoopConfig>): void {
    const currentConfig = this.modes.get(mode);
    if (!currentConfig) return;

    if (currentConfig.isRunning) {
      this.stopMode(mode);
    } else {
      this.startMode(mode, config);
    }

    this.notifyObservers();
  }

  /**
   * Start a specific automation mode
   */
  private async startMode(
    mode: FO76AutomationModes,
    config?: Partial<LoopConfig>
  ): Promise<void> {
    const currentConfig = this.modes.get(mode);
    if (!currentConfig || !this.enabled) return;

    // Update config with provided values
    if (config) {
      Object.assign(currentConfig, config);
    }

    currentConfig.isRunning = true;
    await this.loopManager.startLoop(currentConfig, mode);
  }

  /**
   * Stop a specific automation mode
   */
  private stopMode(mode: FO76AutomationModes): void {
    const config = this.modes.get(mode);
    if (!config) return;

    this.loopManager.stopLoop(config, mode);
  }

  /**
   * Stop all automation modes
   */
  stopAllModes(): void {
    for (const [mode] of this.modes) {
      this.stopMode(mode as FO76AutomationModes);
    }
    this.notifyObservers();
  }

  /**
   * Enable/disable automation
   */
  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.stopAllModes();
    }
    this.notifyObservers();
  }

  /**
   * Check if automation is enabled
   */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Update the default interval for all modes
   */
  updateDefaultInterval(increment?: boolean, decrement?: boolean): void {
    const change = increment ? 1000 : decrement ? -1000 : 0;
    this.defaultActionInterval = Math.max(
      1000,
      Math.min(10000, this.defaultActionInterval + change)
    );

    // Update all modes using the default interval
    for (const config of this.modes.values()) {
      if (config.actionInterval === this.defaultActionInterval - change) {
        config.actionInterval = this.defaultActionInterval;
      }
    }

    this.notifyObservers();
  }
}
