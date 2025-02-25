import { Toast } from "@/utils/toast";
import { EmulatedMkbHandler } from "../mkb/mkb-handler";
import { SoundShortcut } from "../shortcuts/shortcut-sound";
import { AutomationManager } from "./automation-manager";
import { FO76AutomationModes } from "./types";
import type {
  FO76AutomationMode,
  FO76AutomationState,
  FO76AutomationStateObserver,
  LoopConfig,
} from "./types";
import type { IEventHandler } from "./event-manager";
import { EventManager } from "./event-manager";

import { AutomationUIManager } from "./automation-ui-manager";

export const FO76_AUTOMATION_EVENTS = {
  TOGGLE_AUTOMATION: "automation-toggle",
  TOGGLE_MODE: "automation-toggle-mode",
  CHANGE_INTERVAL: "automation-change-interval",
};

/**
 * Handles automation for Fallout 76
 */
export class FO76AutomationHandler
  implements FO76AutomationStateObserver, IEventHandler
{
  private automationManager: AutomationManager;
  private uiManager: AutomationUIManager;
  private mkbHandler: EmulatedMkbHandler;

  public windowFocused: boolean = true;
  private currentActionInterval: number;

  private static instance: FO76AutomationHandler;
  private static mkbHandlerInstance: EmulatedMkbHandler;

  constructor(
    readonly pressButton: (buttonCode: number, isPressed: boolean) => void,
    defaultActionInterval: number = 1000,
    readonly DEFAULT_PAUSE_DURATION: number = 0,
    readonly PIVOT_ACTION_INTERVAL: number = 2500,
    readonly PIVOT_PAUSE_DURATION: number = 15000,
    readonly VATS_PAUSE_DURATION: number = 2000,
    readonly INTERACT_ACTION_INTERVAL: number = 50
  ) {
    this.currentActionInterval = defaultActionInterval;
    this.mkbHandler = EmulatedMkbHandler.getInstance();
    this.automationManager = new AutomationManager(
      pressButton,
      defaultActionInterval,
      DEFAULT_PAUSE_DURATION,
      PIVOT_ACTION_INTERVAL,
      PIVOT_PAUSE_DURATION,
      VATS_PAUSE_DURATION,
      INTERACT_ACTION_INTERVAL
    );
    this.automationManager.subscribe(this);
    this.uiManager = new AutomationUIManager();
  }

  static getInstance(): FO76AutomationHandler {
    if (!FO76AutomationHandler.instance) {
      FO76AutomationHandler.mkbHandlerInstance =
        EmulatedMkbHandler.getInstance();
      FO76AutomationHandler.instance = new FO76AutomationHandler(
        FO76AutomationHandler.mkbHandlerInstance.pressButton.bind(
          FO76AutomationHandler.mkbHandlerInstance
        )
      );
    }
    return FO76AutomationHandler.instance;
  }

  /**
   * Initialize the automation handler
   */
  init = () => {
    console.log(
      "FO76AutomationHandler",
      "Initializing game automation handler"
    );
    this.registerEventListeners();

    this.showAllModes();
  };

  /**
   * Show all available automation modes
   */
  showAllModes(): void {
    this.uiManager.updateDisplay(this.automationManager.getModes(), (mode) => {
      this.automationManager.toggleMode(mode as FO76AutomationModes);
      this.showAllModes(); // Refresh display
    });
  }

  /**
   * Toggle automation mode
   */
  toggleMode(
    mode: FO76AutomationModes,
    config?: Partial<FO76AutomationMode>
  ): void {
    const loopConfig: Partial<LoopConfig> = {
      actionInterval: config?.interval,
      pauseDuration: config?.pause,
      isRunning: config?.enabled,
    };
    this.automationManager.toggleMode(mode, loopConfig);
  }

  /**
   * Enable/disable automation
   */
  setEnabled(value: boolean): void {
    this.automationManager.setEnabled(value);
  }

  get isEnabled(): boolean {
    return this.automationManager.isEnabled;
  }

  /**
   * Toggle automation on/off
   * @returns The new automation state
   */
  public toggle(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  /**
   * Update the default interval for all modes
   */
  updateDefaultInterval(increment?: boolean, decrement?: boolean): void {
    const newInterval =
      this.currentActionInterval + (increment ? 1000 : decrement ? -1000 : 0);

    if (newInterval < 1000 || newInterval > 10000) return;

    this.currentActionInterval = newInterval;

    Toast.show(
      "Game Automation",
      `${increment ? "Increasing" : "Decreasing"} interval to ${
        newInterval / 1000
      } seconds`,
      {
        instant: true,
      }
    );

    this.automationManager.updateDefaultInterval(increment, decrement);
  }

  /**
   * Handle automation state updates
   */
  update(state: FO76AutomationState): void {
    // Handle state updates, e.g., update UI
    this.showAllModes();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.automationManager.stopAllModes();
    this.automationManager.unsubscribe(this);
    this.uiManager.cleanup();
  }

  // Event handlers
  public handleToggleFO76AutomationEvent = async (event: Event) => {
    const customEvent = event as CustomEvent;
    this.setEnabled(!this.isEnabled);

    if (customEvent.detail?.callback) {
      customEvent.detail.callback({
        status: "success",
        automationActive: this.isEnabled,
      });
    }
  };

  public handleToggleModeEvent = async (event: Event) => {
    const customEvent = event as CustomEvent;
    const mode = customEvent.detail as FO76AutomationMode;

    if (mode?.name) {
      this.toggleMode(mode.name as FO76AutomationModes, mode);
      this.showAllModes();
    }

    if (customEvent.detail?.callback) {
      customEvent.detail.callback({
        status: "success",
        message: "Mode toggled successfully",
      });
    }
  };

  public handleIncrementDecrementDefaultInterval = async (event: Event) => {
    const customEvent = event as CustomEvent;
    this.updateDefaultInterval(
      customEvent.detail.increment,
      customEvent.detail.decrement
    );
    this.showAllModes();

    return {
      status: "success",
      automationActive: this.isEnabled,
    };
  };

  // Window focus handlers
  public handleWindowBlur = () => {
    this.windowFocused = false;
    window.navigator.getGamepads = () => this.mkbHandler.getVirtualGamepads();
    SoundShortcut.mute(true);
  };

  public handleWindowFocus = () => {
    this.windowFocused = true;
    window.navigator.getGamepads = () => this.mkbHandler.patchedGetGamepads();
    const prefVolume = SoundShortcut.getPrefVolume();
    if (prefVolume > 0) {
      SoundShortcut.unmute();
    }
  };

  public handleStreamStopped = () => {
    this.setEnabled(false);
  };

  public handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey && e.key === "r") {
      window.location.reload();
    }
  };

  private registerEventListeners(): void {
    EventManager.registerEventListeners(this);
  }
}

/**
 * Handles notifications for the game automation system
 */
export class NotificationHandler {
  private static readonly NOTIFICATION_TIMEOUT = 3000;
  private static instance: NotificationHandler;

  private constructor() {
    this.requestPermission();
  }

  static getInstance(): NotificationHandler {
    if (!NotificationHandler.instance) {
      NotificationHandler.instance = new NotificationHandler();
    }
    return NotificationHandler.instance;
  }

  private async requestPermission(): Promise<void> {
    try {
      if (Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
    } catch (err) {
      console.error("Failed to request notification permission:", err);
    }
  }

  /**
   * Shows a notification with the given title and message
   */
  showNotification(title: string, message: string): void {
    try {
      if (Notification.permission === "granted") {
        const notification = new Notification(title, {
          body: message,
          icon: "/assets/icons/notification.png",
          silent: false,
        });

        setTimeout(() => {
          notification.close();
        }, NotificationHandler.NOTIFICATION_TIMEOUT);
      } else {
        // Fallback to Toast if notifications not permitted
        Toast.show(title, message, {
          instant: true,
        });
      }
    } catch (err) {
      console.error("Failed to show notification:", err);
      // Fallback to Toast on error
      Toast.show(title, message, {
        instant: true,
      });
    }
  }
}
