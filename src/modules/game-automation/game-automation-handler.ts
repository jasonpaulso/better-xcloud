import { BxLogger } from "@/utils/bx-logger";
import { Toast } from "@/utils/toast";
import { EmulatedMkbHandler } from "../mkb/mkb-handler";
import { GamepadKey } from "@/enums/mkb";
import { BxEvent } from "@/utils/bx-event";
import { SoundShortcut } from "../shortcuts/shortcut-sound";

export enum FO76AutomationModes {
  HEAL = "heal",
  PIVOT = "pivot",
  AUTOMATION = "automation",
  VATS = "vats",
  INTERACT = "interact",
}

export const FO76_AUTOMATION_EVENTS = {
  TOGGLE_AUTOMATION: "automation-toggle",
  TOGGLE_MODE: "automation-toggle-mode",
  CHANGE_INTERVAL: "automation-change-interval",
};

interface FO76AutomationMode {
  name?: FO76AutomationModes;
  interval?: number;
  pause?: number;
  enabled?: boolean;
  toggle?: boolean;
}

interface FO76AutomationState {
  automation?: boolean;
  automationMode?: FO76AutomationMode;
  automationInterval?: number;
  automationPause?: number;
  automationEnabled?: boolean;
}

interface FO76AutomationStateObserver {
  update(state: FO76AutomationState): void;
}

interface LoopConfig {
  name: string;
  actionInterval: number;
  pauseDuration: number;
  action: () => Promise<void>;
  isRunning: boolean;
  enabled?: boolean;
}

/**
 * @class FO76AutomationHandler
 * @description Handles the game automation functionality
 */
export class FO76AutomationHandler {
  private _enabled: boolean = false;
  private mkbHandler: EmulatedMkbHandler;
  private _windowFocused: boolean = true;
  private pressButton: (buttonCode: number, isPressed: boolean) => void;
  private onPointerLockExited: () => void = () => {};

  static instance: FO76AutomationHandler;
  private afkObserver: AfkObserver = new AfkObserver();
  private idleHandler: IdleHandler = new IdleHandler();

  private loopConfigs: Map<string, LoopConfig> = new Map();
  private buttonPressHandler: ButtonPressHandler;
  private loopManager: LoopManager;
  private observers: Set<FO76AutomationStateObserver> = new Set();

  private constructor() {
    this.mkbHandler = EmulatedMkbHandler.getInstance();
    this.pressButton = this.mkbHandler.pressButton.bind(this.mkbHandler);
    this.onPointerLockExited = this.mkbHandler.onPointerLockExited.bind(this);
    this.buttonPressHandler = new ButtonPressHandler(this.pressButton);
    this.loopManager = new LoopManager();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new FO76AutomationHandler();
    }
    return this.instance;
  }

  subscribe(observer: FO76AutomationStateObserver): void {
    this.observers.add(observer);
  }

  unsubscribe(observer: FO76AutomationStateObserver): void {
    this.observers.delete(observer);
  }

  private notifyObservers(): void {
    const state: FO76AutomationState = {
      automation: this._enabled,
      automationMode: this.getCurrentMode(),
      automationInterval: this.getCurrentInterval(),
      automationPause: this.getCurrentPause(),
      automationEnabled: this._enabled,
    };
    this.observers.forEach((observer) => observer.update(state));
  }

  private getCurrentMode(): FO76AutomationMode | undefined {
    // Implement logic to get the current automation mode
    return undefined;
  }

  private getCurrentInterval(): number | undefined {
    // Implement logic to get the current interval
    return undefined;
  }

  private getCurrentPause(): number | undefined {
    // Implement logic to get the current pause duration
    return undefined;
  }

  init = () => {
    console.log(
      "FO76AutomationHandler",
      "Initializing game automation handler"
    );
    EventManager.registerEventListeners(this);
    this.initializeDefaultConfigs();
    this.afkObserver.startObserving();
    this.idleHandler.init();
  };

  // Getter and Setter for enabled
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  // Getter and Setter for windowFocused
  get windowFocused(): boolean {
    return this._windowFocused;
  }

  set windowFocused(value: boolean) {
    this._windowFocused = value;
  }

  // Constants
  private DEFAULT_ACTION_INTERVAL = 1000;
  DEFAULT_PAUSE_DURATION = 0;
  PIVOT_ACTION_INTERVAL = 2500;
  PIVOT_PAUSE_DURATION = 15000;
  VATS_PAUSE_DURATION = 2000;
  INTERACT_ACTION_INTERVAL = 50;

  private initializeDefaultConfigs() {
    const defaultConfigs = [
      {
        name: FO76AutomationModes.HEAL,
        actionInterval: this.DEFAULT_ACTION_INTERVAL,
        pauseDuration: this.DEFAULT_PAUSE_DURATION,
        action: async () => {
          this.pressButton(GamepadKey.RIGHT, true);
          await this.delay(500);
          this.pressButton(GamepadKey.RIGHT, false);
        },
      },
      {
        name: FO76AutomationModes.PIVOT,
        actionInterval: this.PIVOT_ACTION_INTERVAL,
        pauseDuration: this.PIVOT_PAUSE_DURATION,
        action: async () => {
          await this.pressButtonWithRandomDelay(
            GamepadKey.RS_RIGHT,
            this.DEFAULT_ACTION_INTERVAL
          );
          await this.delay(500);
          await this.pressButtonWithRandomDelay(
            GamepadKey.RS_LEFT,
            this.DEFAULT_ACTION_INTERVAL
          );
        },
      },
      {
        name: FO76AutomationModes.AUTOMATION,
        actionInterval: this.DEFAULT_ACTION_INTERVAL,
        pauseDuration: this.PIVOT_PAUSE_DURATION,
        action: async () => {
          this.pressButton(GamepadKey.L3, true);
          await this.delay(500);
          this.pressButton(GamepadKey.L3, false);
        },
      },
      {
        name: FO76AutomationModes.VATS,
        actionInterval: this.DEFAULT_ACTION_INTERVAL,
        pauseDuration: this.DEFAULT_PAUSE_DURATION,
        action: async () => {
          this.pressButton(GamepadKey.LB, true);
          await this.delay(500);
          this.pressButton(GamepadKey.LB, false);
          this.pressButton(GamepadKey.RT, true);
          await this.delay(this.VATS_PAUSE_DURATION);
          this.pressButton(GamepadKey.RT, false);
        },
      },
      {
        name: FO76AutomationModes.INTERACT,
        actionInterval: this.INTERACT_ACTION_INTERVAL,
        pauseDuration: this.DEFAULT_PAUSE_DURATION,
        action: async () => {
          this.pressButton(GamepadKey.A, true);
          await this.delay(50);
          this.pressButton(GamepadKey.A, false);
        },
      },
    ];

    defaultConfigs.forEach((config) => this.updateMode(config.name, config));
  }

  updateMode(
    modeName: string,
    config: {
      actionInterval: number;
      pauseDuration: number;
      action: () => Promise<void>;
      enabled?: boolean;
    }
  ): void {
    this.stopButtonLoop(modeName);
    this.loopConfigs.set(modeName, {
      ...config,
      name: modeName,
      isRunning: false,
      enabled: config.enabled,
    });
    if (config.enabled) {
      this.startButtonLoop(modeName);
    }
  }

  private startButtonLoop(mode: string): void {
    Toast.show("Game FO76Automation", `Starting ${mode} loop`, {
      instant: true,
    });
    this.setButtonLoop(mode, true);
  }

  private stopButtonLoop(mode: string): void {
    Toast.show("Game FO76Automation", `Stopping ${mode} loop`, {
      instant: true,
    });
    this.setButtonLoop(mode, false);
  }

  /**
   * Starts or stops the button loop for a given mode.
   * @param mode - The name of the automation mode.
   * @param shouldStart - Whether to start or stop the loop.
   */
  private setButtonLoop(mode: string, shouldStart: boolean): void {
    const config = this.loopConfigs.get(mode);
    if (!config) return;

    if (shouldStart) {
      this.loopManager.startLoop(config, mode, this);
    } else {
      this.loopManager.stopLoop(config, mode);
    }
    this.notifyObservers();
  }

  /**
   * Starts a countdown for the next loop iteration.
   * @param mode - The name of the automation mode.
   */
  startCountdown(mode: string): void {
    const config = this.loopConfigs.get(mode);
    if (!config) return;

    let countdown = (config.actionInterval + config.pauseDuration) / 1000;
    const logIntervalId = setInterval((): void => {
      if (config.isRunning) {
        console.log(
          "FO76AutomationHandler",
          `Loop ${mode} will run again in ${countdown} seconds`
        );
        Toast.show(
          "Game FO76Automation",
          `${mode} will run again in ${countdown} seconds`,
          {
            instant: true,
          }
        );
        countdown--;
        if (countdown < 0) {
          countdown = (config.actionInterval + config.pauseDuration) / 1000;
        }
      } else {
        clearInterval(logIntervalId);
      }
    }, 1000);
  }

  toggle = () => {
    console.log("FO76AutomationHandler", "Toggling game automation");
    !this.enabled ? this.activate() : this.deactivate();
  };

  activate = () => {
    if (this.enabled) {
      BxLogger.warning(
        "FO76AutomationHandler",
        "Game automation is already activated"
      );
      return;
    }
    console.log("FO76AutomationHandler", "Activating game automation");
    this.enabled = true;
    this.startFO76Automation();
    this.notifyObservers();
  };

  deactivate = () => {
    if (!this.enabled) {
      BxLogger.warning(
        "FO76AutomationHandler",
        "Game automation is already deactivated"
      );
      return;
    }
    console.log("FO76AutomationHandler", "Deactivating game automation");
    this.enabled = false;
    this.stopFO76Automation();
    this.notifyObservers();
  };

  private startFO76Automation() {
    this.startMkbHandler();
    this.showActivationMessage();
  }

  private stopFO76Automation() {
    this.stopAllLoops();
    this.stopMkbHandler();
    this.showDeactivationMessage();
  }

  private startMkbHandler() {
    this.mkbHandler.start();
    this.onPointerLockExited();
    this.mkbHandler.hideMessage();
  }

  private stopMkbHandler() {
    this.mkbHandler.stop();
    this.mkbHandler.hideMessage();
  }

  private showActivationMessage() {
    Toast.show("Game FO76Automation", "Activated", { instant: true });
  }

  private showDeactivationMessage() {
    Toast.show("Game FO76Automation", "Deactivated", { instant: true });
  }

  destroy = () => {
    this.enabled = false;
    this.stopAllLoops();
    this.mkbHandler.destroy();
  };

  private stopAllLoops() {
    for (const [mode] of this.loopConfigs) {
      this.stopButtonLoop(mode);
    }
  }

  async pressButtonWithRandomDelay(buttonCode: number, maxDelay: number) {
    await this.buttonPressHandler.pressButtonWithRandomDelay(
      buttonCode,
      maxDelay
    );
  }

  private async delay(ms: number): Promise<void> {
    await TimingUtils.delay(ms);
  }

  toggleGamepads() {
    window.navigator.getGamepads = () =>
      !this.windowFocused ? [] : this.mkbHandler.patchedGetGamepads();
  }

  handleWindowBlur = () => {
    window.navigator.getGamepads = () => this.mkbHandler.getVirtualGamepads();
    SoundShortcut.mute(true);
    console.log("FO76AutomationHandler", "Window blurred");
  };

  handleWindowFocus = () => {
    window.navigator.getGamepads = () => this.mkbHandler.patchedGetGamepads();
    const prefVolume = SoundShortcut.getPrefVolume();
    if (prefVolume > 0) {
      SoundShortcut.unmute();
    }
    console.log("FO76AutomationHandler", "Window focused");
  };

  handleStreamStopped = () => {
    this.deactivate();
  };

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === "r") {
      window.location.reload();
    }
  };

  handleToggleFO76AutomationEvent = async (event: Event) => {
    const customEvent = event as CustomEvent;
    this.toggle();
    console.log(
      "FO76AutomationHandler",
      `Toggle automation event (FO76_AUTOMATION_EVENTS.TOGGLE_AUTOMATION): `,
      customEvent
    );
    console.log("FO76AutomationHandler", `Toggle automation event: `, event);

    // Respond with the status
    if (
      customEvent.detail &&
      typeof customEvent.detail.callback === "function"
    ) {
      customEvent.detail.callback({
        status: "success",
        automationActive: this.enabled,
      });
    }
  };

  handleToggleModeEvent = async (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log(
      "FO76AutomationHandler",
      `Toggle mode event (FO76_AUTOMATION_EVENTS.TOGGLE_MODE): `,
      event
    );
    const mode = customEvent.detail as FO76AutomationMode;

    const response = await this.handleFO76AutomationEvent({
      automationMode: mode,
    });

    // Respond with the status
    if (
      customEvent.detail &&
      typeof customEvent.detail.callback === "function"
    ) {
      customEvent.detail.callback(response);
    }
  };

  private isConfigChanged(
    mode: FO76AutomationMode,
    existingConfig: LoopConfig
  ): boolean {
    const changeLog = {
      actionInterval: {
        old: existingConfig.actionInterval,
        new: mode.interval,
        changed: mode.interval !== existingConfig.actionInterval,
      },
      pauseDuration: {
        old: existingConfig.pauseDuration,
        new: mode.pause,
        changed: mode.pause !== existingConfig.pauseDuration,
      },
      enabled: {
        old: existingConfig.enabled,
        new: mode.enabled,
        changed: mode.enabled !== existingConfig.enabled,
      },
    };

    console.log(
      "FO76AutomationHandler",
      `Change log for ${mode.name}: `,
      changeLog
    );

    const isConfigChanged = Object.values(changeLog).some((value) => {
      return value.changed;
    });

    console.log(
      "FO76AutomationHandler",
      `Is config changed for ${mode.name}: `,
      isConfigChanged
    );

    return isConfigChanged;
  }

  handleFO76AutomationEvent = async (state: {
    automationMode: FO76AutomationMode;
  }): Promise<{
    status: string;
    message: string;
    mode?: FO76AutomationMode;
    modeStatus?: {
      actionInterval: number;
      pauseDuration: number;
      action: () => Promise<void>;
      isRunning: boolean;
    };
  }> => {
    // if an event is being started or updated ensure that the automator is enabled, otherwise disable it
    if (state.automationMode) {
      this.activate();
    } else {
      this.deactivate();
    }

    try {
      const mode = state.automationMode;
      if (mode && mode.name) {
        const existingConfig = this.loopConfigs.get(mode.name);
        if (mode.toggle) {
          if (existingConfig) {
            this.updateMode(mode.name, {
              actionInterval: mode.interval || existingConfig.actionInterval,
              pauseDuration: mode.pause || existingConfig.pauseDuration,
              action: existingConfig.action,
              enabled: !existingConfig.enabled,
            });
            if (!existingConfig.enabled) {
              this.startButtonLoop(mode.name);
            } else {
              this.stopButtonLoop(mode.name);
            }
          }
          return {
            status: "success",
            message: "FO76Automation event handled",
            mode: mode,
            modeStatus: mode.name ? this.loopConfigs.get(mode.name) : undefined,
          };
        }
        // If the mode is not running, run it with the passed or default configuration
        if (!existingConfig || !existingConfig.isRunning) {
          console.log("FO76AutomationHandler", `Starting mode ${mode.name}`);
          this.updateMode(mode.name, {
            actionInterval:
              mode.interval || existingConfig?.actionInterval || 1000,
            pauseDuration: mode.pause || existingConfig?.pauseDuration || 0,
            action: existingConfig?.action || (async () => {}),
            enabled: mode.enabled,
          });
          if (mode.enabled) {
            this.startButtonLoop(mode.name);
          }
        } else {
          // If the mode is running and the config does not change, stop the mode
          console.log("FO76AutomationHandler", `Stopping mode ${mode.name}`);
          // compare existing config with mode config

          if (!this.isConfigChanged(mode, existingConfig)) {
            this.stopButtonLoop(mode.name);
          } else {
            // If the mode is running and the config changes, update the mode and resume running
            console.log("FO76AutomationHandler", `Updating mode ${mode.name}`);
            this.updateMode(mode.name, {
              actionInterval: mode.interval || existingConfig.actionInterval,
              pauseDuration: mode.pause || existingConfig.pauseDuration,
              action: existingConfig.action,
              enabled: mode.enabled,
            });
            if (mode.enabled) {
              this.startButtonLoop(mode.name);
            }
          }
        }
      } else {
        console.log(
          "FO76AutomationHandler",
          "No mode provided, stopping all modes"
        );
      }

      return {
        status: "success",
        message: "FO76Automation event handled",
        mode: mode,
        modeStatus: mode.name ? this.loopConfigs.get(mode.name) : undefined,
      };
    } catch (error) {
      BxLogger.error(
        "FO76AutomationHandler",
        "Failed to handle automation event",
        error
      );
      return {
        status: "error",
        message: "Failed to handle automation event",
      };
    }
  };

  toggleFO76Automation = async (
    _toggle: boolean
  ): Promise<{ status: string; automationActive: boolean }> => {
    try {
      this.toggle();
      return {
        status: "success",
        automationActive: this.enabled,
      };
    } catch (error) {
      BxLogger.error(
        "FO76AutomationHandler",
        "Failed to toggle automation",
        error
      );
      return {
        status: "error",
        automationActive: this.enabled,
      };
    }
  };

  sendDefaultEvent = async (
    modeName: FO76AutomationModes,
    interval: number,
    pause: number
  ) => {
    try {
      const mode = {
        name: modeName,
        interval,
        pause,
        enabled: true,
      };
      const existingConfig = this.loopConfigs.get(mode.name);

      mode.enabled = !existingConfig?.isRunning;
      this.updateMode(mode.name, {
        actionInterval: mode.interval || existingConfig?.actionInterval || 1000,
        pauseDuration: existingConfig?.pauseDuration || 0,
        action: existingConfig?.action || (async () => {}),
        enabled: mode.enabled,
      });
    } catch (error) {
      BxLogger.error(
        "FO76AutomationHandler",
        `Failed to send default event for mode ${modeName}`,
        error
      );
    }
  };

  incrementDecrementDefaultInterval = async (
    increment?: boolean,
    decrement?: boolean
  ) => {
    const newInterval =
      this.DEFAULT_ACTION_INTERVAL + (increment ? 1000 : decrement ? -1000 : 0);
    if (newInterval < 1000) {
      this.DEFAULT_ACTION_INTERVAL = 1000;
      return;
    }
    if (newInterval > 10000) {
      this.DEFAULT_ACTION_INTERVAL = 10000;
      return;
    }
    console.log(
      "FO76AutomationHandler",
      `Incrementing default interval to ${newInterval}`
    );

    Toast.show(
      "Game FO76Automation",
      `${increment ? "Increasing" : "Decreasing"} default interval to ${
        newInterval / 1000
      } seconds`,
      {
        instant: true,
      }
    );

    this.DEFAULT_ACTION_INTERVAL = newInterval;

    // update all modes with the new interval
    for (const [modeName, mode] of this.loopConfigs) {
      this.updateMode(modeName, {
        actionInterval: this.DEFAULT_ACTION_INTERVAL,
        pauseDuration: mode.pauseDuration,
        action: mode.action,
        enabled: mode.enabled,
      });
    }
  };

  handleIncrementDecrementDefaultInterval = async (
    event: Event
  ): Promise<{ status: string; automationActive: boolean }> => {
    const customEvent = event as CustomEvent;
    const increment = customEvent.detail.increment;
    const decrement = customEvent.detail.decrement;
    await this.incrementDecrementDefaultInterval(increment, decrement);
    return {
      status: "success",
      automationActive: this.enabled,
    };
  };
}

class EventManager {
  static registerEventListeners(handler: FO76AutomationHandler) {
    const checkWindowFocused = () => {
      if (document.hasFocus()) {
        BxEvent.dispatch(window, "window-focused");
      } else {
        BxEvent.dispatch(window, "window-blurred");
      }
    };

    setInterval(checkWindowFocused, 200);

    window.addEventListener("blur", handler.handleWindowBlur);
    window.addEventListener("focus", handler.handleWindowFocus);
    window.addEventListener(
      BxEvent.STREAM_STOPPED,
      handler.handleStreamStopped
    );
    window.addEventListener("keydown", handler.handleKeyDown);
    window.addEventListener(
      FO76_AUTOMATION_EVENTS.TOGGLE_AUTOMATION,
      handler.handleToggleFO76AutomationEvent
    );
    window.addEventListener(
      FO76_AUTOMATION_EVENTS.TOGGLE_MODE,
      handler.handleToggleModeEvent
    );
    window.addEventListener(
      FO76_AUTOMATION_EVENTS.CHANGE_INTERVAL,
      handler.handleIncrementDecrementDefaultInterval
    );
  }
}

class TimingUtils {
  static async randomDelay(maxMs: number): Promise<void> {
    const delay = Math.random() * maxMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
class ButtonPressHandler {
  private pressButton: (buttonCode: number, isPressed: boolean) => void;

  constructor(pressButton: (buttonCode: number, isPressed: boolean) => void) {
    this.pressButton = pressButton;
  }

  async pressButtonWithRandomDelay(buttonCode: number, maxDelay: number) {
    this.pressButton(buttonCode, true);
    await TimingUtils.randomDelay(maxDelay);
    this.pressButton(buttonCode, false);
  }
}
class LoopManager {
  private intervals: Map<string, number> = new Map();

  startLoop(config: LoopConfig, mode: string, handler: FO76AutomationHandler) {
    config.isRunning = true;

    const loopFunction = async (): Promise<void> => {
      if (!config.isRunning) return;

      console.log("FO76AutomationHandler", `Running ${mode} loop`);
      await config.action();
      await TimingUtils.delay(config.pauseDuration);

      if (config.isRunning) {
        this.intervals.set(
          mode,
          window.setTimeout(loopFunction, config.actionInterval)
        );
      }
    };

    loopFunction();
    handler.startCountdown(mode);
  }

  stopLoop(config: LoopConfig, mode: string) {
    const intervalId = this.intervals.get(mode);
    if (intervalId) {
      clearTimeout(intervalId);
      this.intervals.delete(mode);
    }

    config.isRunning = false;
  }
}

class AfkObserver {
  private observer: MutationObserver | null = null;

  startObserving() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const afkButton = node.querySelector(
                'button:contains("are you still there")'
              );
              if (afkButton instanceof HTMLButtonElement) {
                console.log("Found AFK check button, clicking it");
                afkButton.click();
              }
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

class IdleHandler {
  private wakeLock: WakeLockSentinel | null = null;
  private idleTimeout: number | null = null;
  private readonly IDLE_TIMEOUT_MS = 3000;

  async init() {
    try {
      // Request wake lock to keep screen on
      this.wakeLock = await navigator.wakeLock.request("screen");

      // Setup idle detection
      document.addEventListener("mousemove", () => this.resetIdleTimer());
      document.addEventListener("keydown", () => this.resetIdleTimer());
      document.addEventListener("mousedown", () => this.resetIdleTimer());

      // Initial idle timer
      this.resetIdleTimer();

      // Handle visibility change
      document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible" && !this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request("screen");
        }
      });
    } catch (err) {
      console.log("IdleHandler: Wake lock request failed", err);
    }
  }

  private resetIdleTimer() {
    // Show cursor
    document.body.style.cursor = "default";

    // Clear existing timeout
    if (this.idleTimeout) {
      window.clearTimeout(this.idleTimeout);
    }

    // Set new timeout
    this.idleTimeout = window.setTimeout(() => {
      // Hide cursor after idle timeout
      document.body.style.cursor = "none";
    }, this.IDLE_TIMEOUT_MS);
  }

  destroy() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }

    if (this.idleTimeout) {
      window.clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    document.body.style.cursor = "default";
  }
}
