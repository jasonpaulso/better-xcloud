import { BxLogger } from "@/utils/bx-logger";

declare global {
  interface Window {
    awayModeHandler: AwayModeHandler;
  }
}
import { Toast } from "@/utils/toast";
import { EmulatedMkbHandler } from "../mkb/mkb-handler";
import { GamepadKey } from "@/enums/mkb";
import { BxEvent } from "@/utils/bx-event";
import { SoundShortcut } from "../shortcuts/shortcut-sound";
import { BXCState, type StateType } from "@/utils/shared-state";

export type AwayModes = "heal" | "pivot" | "awayMode" | "vats";

export const AWAY_MODE_EVENTS = {
  TOGGLE_AWAY: "away-mode-toggle",
  TOGGLE_MODE: "away-mode-toggle-mode",
};

interface AwayModeMode {
  name: AwayModes;
  interval?: number;
  pause?: number;
  enabled: boolean;
}

interface AwayModeState extends StateType {
  awayMode?: boolean;
  awayModeMode?: AwayModeMode;
  awayModeInterval?: number;
  awayModePause?: number;
  awayModeEnabled?: boolean;
}

/**
 * @class AwayModeHandler
 * @description Handles the away mode functionality
 */
export class AwayModeHandler {
  #enabled: boolean = false;
  #mkbHandler: EmulatedMkbHandler;
  #windowFocused: boolean = true;
  #pressButton: (buttonCode: number, isPressed: boolean) => void;
  #onPointerLockExited: () => void = () => {};
  static #instance: AwayModeHandler;

  private constructor() {
    this.#mkbHandler = EmulatedMkbHandler.getInstance();
    this.#pressButton = this.#mkbHandler.pressButton.bind(this.#mkbHandler);
    this.#onPointerLockExited = this.#mkbHandler.onPointerLockExited.bind(this);
  }

  private loopConfigs: Map<
    string,
    {
      actionInterval: number;
      pauseDuration: number;
      action: () => Promise<void>;
      isRunning: boolean;
    }
  > = new Map();

  private intervals: Map<string, number> = new Map();

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new AwayModeHandler();
    }
    return this.#instance;
  }

  init = () => {
    console.log("AwayModeHandler", "Initializing away mode handler");
    this.setupEventListeners();
    this.initializeDefaultConfigs();
  };

  private initializeDefaultConfigs() {
    this.updateMode("heal", {
      actionInterval: 1000,
      pauseDuration: 0,
      action: async () => {
        this.#pressButton(GamepadKey.RIGHT, true);
        await this.#delay(500);
        this.#pressButton(GamepadKey.RIGHT, false);
      },
    });

    this.updateMode("pivot", {
      actionInterval: 2500,
      pauseDuration: 15000,
      action: async () => {
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_RIGHT, 1000);
        await this.#delay(500);
        await this.#pressButtonWithRandomDelay(GamepadKey.RS_LEFT, 1000);
      },
    });

    this.updateMode("awayMode", {
      actionInterval: 1000,
      pauseDuration: 15000,
      action: async () => {
        this.#pressButton(GamepadKey.L3, true);
        await this.#delay(500);
        this.#pressButton(GamepadKey.L3, false);
      },
    });

    this.updateMode("vats", {
      actionInterval: 1000,
      pauseDuration: 0,
      action: async () => {
        this.#pressButton(GamepadKey.LB, true);
        await this.#delay(500);
        this.#pressButton(GamepadKey.LB, false);
        this.#pressButton(GamepadKey.RT, true);
        await this.#delay(2000);
        this.#pressButton(GamepadKey.RT, false);
      },
    });
  }

  updateMode(
    modeName: string,
    config: {
      actionInterval: number;
      pauseDuration: number;
      action: () => Promise<void>;
      enabled?: boolean;
    }
  ) {
    this.stopButtonLoop(modeName);
    this.loopConfigs.set(modeName, { ...config, isRunning: false });
    if (config.enabled) {
      this.startButtonLoop(modeName);
    }
  }

  private startButtonLoop(mode: string) {
    const config = this.loopConfigs.get(mode);
    if (!config) return;

    config.isRunning = true;

    const loopFunction = async () => {
      if (!config.isRunning) return;

      console.log("AwayModeHandler", `Running ${mode} loop`);
      await config.action();
      await this.#delay(config.pauseDuration);

      if (config.isRunning) {
        this.intervals.set(
          mode,
          window.setTimeout(loopFunction, config.actionInterval)
        );
      }
    };

    loopFunction();
    this.startCountdown(mode);
  }

  private stopButtonLoop(mode: string) {
    const interval = this.intervals.get(mode);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(mode);
    }

    const config = this.loopConfigs.get(mode);
    if (config) {
      config.isRunning = false;
    }
  }

  private startCountdown(mode: string) {
    const config = this.loopConfigs.get(mode);
    if (!config) return;

    let countdown = (config.actionInterval + config.pauseDuration) / 1000;
    const logInterval = setInterval(() => {
      if (config.isRunning) {
        console.log(
          "AwayModeHandler",
          `Loop ${mode} will run again in ${countdown} seconds`
        );
        Toast.show(
          "Away Mode",
          `${mode} will run again in ${countdown} seconds`,
          { instant: true }
        );
        countdown--;
        if (countdown < 0) {
          countdown = (config.actionInterval + config.pauseDuration) / 1000;
        }
      } else {
        clearInterval(logInterval);
      }
    }, 1000);
  }

  toggle = () => {
    console.log("AwayModeHandler", "Toggling away mode");
    !this.#enabled ? this.activate() : this.deactivate();
  };

  activate = () => {
    if (this.#enabled) {
      BxLogger.warning("AwayModeHandler", "Away mode is already activated");
      return;
    } else {
      console.log("AwayModeHandler", "Activating away mode");
    }
    this.#enabled = true;
    this.#mkbHandler.start();
    this.#onPointerLockExited();
    this.#mkbHandler.hideMessage();
    Toast.show("Away Mode", "Activated", { instant: true });

    // BXCState.setState({ awayMode: true });
  };

  deactivate = () => {
    if (!this.#enabled) {
      BxLogger.warning("AwayModeHandler", "Away mode is already deactivated");
      return;
    } else {
      console.log("AwayModeHandler", "Deactivating away mode");
    }
    this.#enabled = false;
    this.stopAllLoops();
    this.#mkbHandler.stop();
    this.#mkbHandler.hideMessage();

    Toast.show("Away Mode", "Deactivated", { instant: true });

    // BXCState.setState({ awayMode: false });
  };

  destroy = () => {
    this.#enabled = false;
    this.stopAllLoops();
    this.#mkbHandler.destroy();
  };

  private stopAllLoops() {
    for (const [mode] of this.loopConfigs) {
      this.stopButtonLoop(mode);
    }
  }

  async #pressButtonWithRandomDelay(buttonCode: number, maxDelay: number) {
    this.#pressButton(buttonCode, true);
    await this.#randomDelay(maxDelay);
    this.#pressButton(buttonCode, false);
  }

  #randomDelay(maxMs: number): Promise<void> {
    const delay = Math.random() * maxMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  #delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  toggleGamepads() {
    window.navigator.getGamepads = () =>
      !this.#windowFocused ? [] : this.#mkbHandler.patchedGetGamepads();
  }

  setupEventListeners() {
    const checkWindowFocused = () => {
      if (document.hasFocus()) {
        BxEvent.dispatch(window, "window-focused");
      } else {
        BxEvent.dispatch(window, "window-blurred");
      }
    };

    setInterval(checkWindowFocused, 200);

    window.addEventListener("blur", () => {
      window.navigator.getGamepads = () =>
        this.#mkbHandler.getVirtualGamepads();
      SoundShortcut.mute(true);
      console.log("AwayModeHandler", "Window blurred");
    });

    window.addEventListener("focus", () => {
      window.navigator.getGamepads = () =>
        this.#mkbHandler.patchedGetGamepads();
      const prefVolume = SoundShortcut.getPrefVolume();
      if (prefVolume > 0) {
        SoundShortcut.unmute();
      }
      console.log("AwayModeHandler", "Window focused");
    });

    window.addEventListener("ReactStateUpdate", (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("🚌 ~ window.addEventListener ~ customEvent:", customEvent);
      // BXCState.setState(customEvent.detail);
    });

    window.addEventListener(BxEvent.STREAM_STOPPED, () => {
      this.deactivate();
    });

    window.addEventListener("keydown", (e) => {
      if (e.metaKey && e.key === "r") {
        window.location.reload();
      }
    });

    // listen to custom toggle away mode event
    window.addEventListener(AWAY_MODE_EVENTS.TOGGLE_AWAY, () => {
      this.toggle();
    });

    window.addEventListener(AWAY_MODE_EVENTS.TOGGLE_MODE, (event: Event) => {
      console.log("AwayModeHandler", `Toggle mode event: `, event);
      const customEvent = event as CustomEvent;
      const mode = customEvent.detail as AwayModeMode;
      this.handleAwayModeEvent({
        awayModeMode: mode,
      });
    });

  }

  handleAwayModeEvent = async (
    state: AwayModeState
  ): Promise<{
    status: string;
    message: string;
    mode?: AwayModeMode;
    modeStatus?: {
      actionInterval: number;
      pauseDuration: number;
      action: () => Promise<void>;
      isRunning: boolean;
    };
  }> => {
    const mode = state.awayModeMode;
    if (mode && mode.name) {
      if (!this.#enabled) {
        this.activate();
      }
      const existingConfig = this.loopConfigs.get(mode.name);
      this.updateMode(mode.name, {
        actionInterval: mode.interval || existingConfig?.actionInterval || 1000,
        pauseDuration: existingConfig?.pauseDuration || 0,
        action: existingConfig?.action || (async () => {}),
        enabled: mode.enabled,
      });
    }
    return {
      status: "success",
      message: "Away mode event handled",
      mode: mode,
      modeStatus: mode ? this.loopConfigs.get(mode.name) : undefined,
    };
  };

  toggleAwayMode = async (
    toggle: boolean
  ): Promise<{ status: string; awayModeActive: boolean }> => {
    this.toggle();
    return {
      status: "success",
      awayModeActive: this.#enabled,
    };
  };

  sendDefaultHealEvent = () => {
    const mode = {
      name: "heal",
      interval: 1000,
      pause: 0,
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
  };

  sendDefaultPivotEvent = () => {
    const mode = {
      name: "pivot",
      interval: 2500,
      pause: 15000,
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
  };

  sendDefaultAwayModeEvent = () => {
    const mode = {
      name: "awayMode",
      interval: 1000,
      pause: 15000,
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
  };

  sendDefaultVatsEvent = () => {
    const mode = {
      name: "vats",
      interval: 1000,
      pause: 0,
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
  };
}

export interface WindowWithAwayModeMethods extends Window {
  methods: {
    toggleAwayMode: (
      toggle: boolean
    ) => Promise<{ status: string; awayModeActive: boolean }>;
    handleAwayModeEvent: (state: AwayModeState) => Promise<{
      status: string;
      message: string;
      mode?: AwayModeMode;
      modeStatus?: {
        actionInterval: number;
        pauseDuration: number;
        action: () => Promise<void>;
        isRunning: boolean;
      };
    }>;
    // add other methods here if needed
  };
}

// Expose the intervals on the window object
(window as unknown as WindowWithAwayModeMethods).methods = {
  toggleAwayMode: AwayModeHandler.getInstance().toggleAwayMode,
  handleAwayModeEvent: AwayModeHandler.getInstance().handleAwayModeEvent,
};
