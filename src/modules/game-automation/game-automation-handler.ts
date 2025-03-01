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
import { FocusDetector } from "@/utils/focus-detector";
import { BxEvent } from "@/utils/bx-event";
import { BxLogger } from "@/utils/bx-logger";

export const FO76_AUTOMATION_EVENTS = {
  TOGGLE_AUTOMATION: "automation-toggle",
  TOGGLE_MODE: "automation-toggle-mode",
  CHANGE_INTERVAL: "automation-change-interval",
};

/**
 * Handles automation for Fallout 76
 *
 * Example usage of initialization actions:
 * ```
 * // Get the automation handler instance
 * const handler = FO76AutomationHandler.getInstance();
 *
 * // Set a custom initialization action for VATS mode
 * handler.setModeInitAction(FO76AutomationModes.VATS, async () => {
 *   console.log("Initializing VATS mode with custom action");
 *   // Draw weapon if not already drawn
 *   await someCustomLogic();
 * });
 *
 * // Set a button sequence for HEAL mode
 * import { GamepadKey } from "@/enums/mkb";
 * handler.setModeButtonSequence(
 *   FO76AutomationModes.HEAL,
 *   [
 *     { button: GamepadKey.B, duration: 100 }, // Open Pip-Boy
 *     { button: GamepadKey.RB, duration: 100 }, // Navigate to Aid tab
 *     { button: GamepadKey.DOWN, duration: 100 }, // Navigate to Stimpak
 *   ],
 *   300 // 300ms between button presses
 * );
 * ```
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
    readonly PIVOT_PAUSE_DURATION: number = 1000,
    readonly VATS_PAUSE_DURATION: number = 2000,
    readonly INTERACT_ACTION_INTERVAL: number = 50,
    readonly RELOAD_ACTION_INTERVAL: number = 1000,
    readonly RELOAD_PAUSE_DURATION: number = 1000,
    readonly RAPID_FIRE_AND_ROTATE_ACTION_INTERVAL: number = 1000,
    readonly RAPID_FIRE_AND_ROTATE_PAUSE_DURATION: number = 1000
  ) {
    console.log(
      "Initializing FO76AutomationHandler with pressButton:",
      pressButton
    );
    this.currentActionInterval = defaultActionInterval;
    this.mkbHandler = EmulatedMkbHandler.getInstance();
    this.automationManager = new AutomationManager(
      (buttonCode: number, isPressed: boolean) => {
        console.log("Pressing button:", buttonCode, isPressed);
        this.pressButton(buttonCode, isPressed);
      },
      defaultActionInterval,
      DEFAULT_PAUSE_DURATION,
      PIVOT_ACTION_INTERVAL,
      PIVOT_PAUSE_DURATION,
      VATS_PAUSE_DURATION,
      INTERACT_ACTION_INTERVAL,
      RELOAD_ACTION_INTERVAL,
      RELOAD_PAUSE_DURATION,
      RAPID_FIRE_AND_ROTATE_ACTION_INTERVAL,
      RAPID_FIRE_AND_ROTATE_PAUSE_DURATION
    );
    this.automationManager.subscribe(this);
    this.uiManager = new AutomationUIManager();
  }

  static getInstance(): FO76AutomationHandler {
    if (!FO76AutomationHandler.instance) {
      console.log("Creating new FO76AutomationHandler instance");
      FO76AutomationHandler.mkbHandlerInstance =
        EmulatedMkbHandler.getInstance();
      const boundPressButton =
        FO76AutomationHandler.mkbHandlerInstance.pressButton.bind(
          FO76AutomationHandler.mkbHandlerInstance
        );
      console.log("Created bound pressButton function:", boundPressButton);
      FO76AutomationHandler.instance = new FO76AutomationHandler(
        boundPressButton
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

    // Initialize focus detector
    const focusDetector = FocusDetector.getInstance();
    this.windowFocused = focusDetector.isFocused();

    this.registerEventListeners();
    this.showAllModes();
  };

  /**
   * Show all available automation modes
   */
  showAllModes(): void {
    this.uiManager.updateDisplay(
      this.automationManager.getModes(),
      (mode) => {
        console.log("Mode clicked:", mode);
        if (!this.isEnabled) {
          this.setEnabled(true);
        }
        this.toggleMode(mode as FO76AutomationModes);
      },
      this.isEnabled,
      () => this.toggle()
    );
  }

  /**
   * Toggle automation mode
   */
  toggleMode(
    mode: FO76AutomationModes,
    config?: Partial<FO76AutomationMode>
  ): void {
    console.log("Toggling mode:", mode, "with config:", config);
    const loopConfig: Partial<LoopConfig> = {
      actionInterval: config?.interval,
      pauseDuration: config?.pause,
      isRunning: config?.enabled,
    };
    this.automationManager.toggleMode(mode, loopConfig);
    console.log("Mode toggle complete");
    // Update UI after toggle
    this.showAllModes();
  }

  /**
   * Enable/disable automation
   */
  setEnabled(value: boolean): void {
    if (value && !this.isEnabled) {
      this.startFO76Automation();
    } else if (!value && this.isEnabled) {
      this.stopFO76Automation();
    }
    this.automationManager.setEnabled(value);
  }

  private startFO76Automation() {
    console.log("Starting FO76 automation");
    this.startMkbHandler();
    this.showActivationMessage();
  }

  private stopFO76Automation() {
    console.log("Stopping FO76 automation");
    this.automationManager.stopAllModes();
    this.stopMkbHandler();
    this.showDeactivationMessage();
  }

  private startMkbHandler() {
    this.mkbHandler.start();
    this.mkbHandler.onPointerLockExited();
    this.mkbHandler.hideMessage();
  }

  private stopMkbHandler() {
    this.mkbHandler.stop();
    this.mkbHandler.hideMessage();
  }

  private showActivationMessage() {
    Toast.show("Game Automation", "Activated", { instant: true });
  }

  private showDeactivationMessage() {
    Toast.show("Game Automation", "Deactivated", { instant: true });
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
   * Set a custom initialization action for a mode
   * This action will run once when the mode is started, but not during the loop
   * @param mode The automation mode to set the initialization action for
   * @param initAction The action to run when the mode starts
   */
  setModeInitAction(
    mode: FO76AutomationModes,
    initAction: () => Promise<void>
  ): void {
    this.automationManager.setModeInitAction(mode, initAction);
  }

  /**
   * Set a button press sequence to run when a mode starts
   * This is a convenience method for common button press sequences
   * @param mode The automation mode to set the initialization action for
   * @param buttonSequence Array of button codes and durations to press
   * @param delayBetweenPresses Delay between button presses in ms
   */
  setModeButtonSequence(
    mode: FO76AutomationModes,
    buttonSequence: Array<{ button: number; duration: number }>,
    delayBetweenPresses: number = 300
  ): void {
    const initAction = async () => {
      console.log(`Running button sequence for ${mode} mode`);
      for (const { button, duration } of buttonSequence) {
        // Press the button down
        await this.pressButton(button, true);

        // Wait for the specified duration
        await new Promise((resolve) => setTimeout(resolve, duration));

        // Release the button
        await this.pressButton(button, false);

        // Wait before the next button press
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenPresses)
        );
      }
    };

    this.setModeInitAction(mode, initAction);
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
    this.stopFO76Automation();
    this.automationManager.unsubscribe(this);
    this.uiManager.cleanup();

    // Remove focus state change listener
    window.removeEventListener(
      BxEvent.FOCUS_STATE_CHANGED,
      this.handleFocusStateChange
    );
  }

  // Event handlers
  public handleToggleFO76AutomationEvent = async (event: Event) => {
    const customEvent = event as CustomEvent;
    if (this.isEnabled) {
      this.setEnabled(false);
    } else {
      this.setEnabled(true);
    }

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
    if (!this.isEnabled) {
      this.setEnabled(true);
    }

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

  /**
   * Handle focus state changes from the FocusDetector
   */
  private handleFocusStateChange = (e: Event) => {
    const focused = (e as any).focused;
    BxLogger.info("FO76AutomationHandler", "Focus state changed:", focused);

    if (focused) {
      this.windowFocused = true;
      window.navigator.getGamepads = () => this.mkbHandler.patchedGetGamepads();
      const prefVolume = SoundShortcut.getPrefVolume();
      if (prefVolume > 0) {
        SoundShortcut.unmute();
      }
    } else {
      this.windowFocused = false;
      window.navigator.getGamepads = () => this.mkbHandler.getVirtualGamepads();
      SoundShortcut.mute(true);
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

    // Listen for focus state changes from the FocusDetector
    window.addEventListener(
      BxEvent.FOCUS_STATE_CHANGED,
      this.handleFocusStateChange
    );
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
