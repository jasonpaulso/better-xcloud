import { BxEvent } from "./bx-event";
import { BxLogger } from "./bx-logger";

const LOG_TAG = "FocusDetector";

/**
 * Event dispatched when the focus state changes
 */
export const FOCUS_STATE_CHANGED = "bx-focus-state-changed";

/**
 * Detects and manages focus state across different sources:
 * - Window focus/blur events
 * - Page visibility API
 * - XCloud platform focus state
 */
export class FocusDetector {
  private static instance: FocusDetector;

  private windowFocused: boolean = true;
  private pageVisible: boolean = !document.hidden;
  private xcloudFocused: boolean = true;
  private currentFocusState: boolean = true;
  private forceAlwaysFocused: boolean = false;
  private originalPauseMethod: any = null;
  private originalBlurHandler: any = null;
  private blurHandlerPatched: boolean = false;

  /**
   * Get the singleton instance of FocusDetector
   */
  public static getInstance(): FocusDetector {
    if (!FocusDetector.instance) {
      FocusDetector.instance = new FocusDetector();
    }
    return FocusDetector.instance;
  }

  private constructor() {
    this.setupListeners();
    this.currentFocusState = this.calculateFocusState();
    BxLogger.info(
      LOG_TAG,
      "Initialized with focus state:",
      this.currentFocusState
    );
  }

  /**
   * Set up event listeners for all focus sources
   */
  private setupListeners(): void {
    // Window focus/blur
    window.addEventListener("focus", () => {
      this.windowFocused = true;
      BxLogger.info(LOG_TAG, "Window focused");
      this.updateFocusState();
    });

    window.addEventListener("blur", () => {
      this.windowFocused = false;
      BxLogger.info(LOG_TAG, "Window blurred");
      this.updateFocusState();
    });

    // Page visibility
    document.addEventListener("visibilitychange", () => {
      this.pageVisible = !document.hidden;
      BxLogger.info(LOG_TAG, "Page visibility changed:", this.pageVisible);
      this.updateFocusState();
    });

    // XCloud platform focus
    this.monitorXCloudFocus();
  }

  /**
   * Monitor XCloud platform focus state via data channel messages
   */
  private monitorXCloudFocus(): void {
    window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e: Event) => {
      const dataChannel = (e as any).dataChannel;
      if (!dataChannel) return;

      BxLogger.info(
        LOG_TAG,
        "Data channel created, monitoring for focus events"
      );

      dataChannel.addEventListener("message", (msg: MessageEvent) => {
        if (msg.origin === "better-xcloud" || typeof msg.data !== "string") {
          return;
        }

        try {
          if (msg.data.includes("/titleinfo")) {
            const json = JSON.parse(JSON.parse(msg.data).content);
            const wasFocused = this.xcloudFocused;
            this.xcloudFocused = json.focused;

            if (wasFocused !== this.xcloudFocused) {
              BxLogger.info(
                LOG_TAG,
                "XCloud focus changed:",
                this.xcloudFocused
              );

              // If we're forcing focus, override the message
              if (this.forceAlwaysFocused && !this.xcloudFocused) {
                this.overrideFocusState(dataChannel);
              }

              this.updateFocusState();
            }
          }
        } catch (e) {
          BxLogger.error(LOG_TAG, "Error parsing focus state:", e);
        }
      });
    });

    // Listen for stream playback manager initialization
    window.addEventListener(BxEvent.STREAM_STARTED, () => {
      this.patchStreamPlaybackManager();
      this.patchWindowBlur();
    });
  }

  /**
   * Patch the window blur event to prevent the default behavior
   */
  private patchWindowBlur(): void {
    if (this.blurHandlerPatched) {
      return;
    }

    try {
      // Save original addEventListener
      const originalAddEventListener = window.addEventListener;

      // Override addEventListener to intercept blur events
      window.addEventListener = function (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) {
        if (type === "blur") {
          const focusDetector = FocusDetector.getInstance();
          if (focusDetector.isForceAlwaysFocused()) {
            BxLogger.info(LOG_TAG, "Intercepted blur event listener");
            // Don't add the blur event listener if we're forcing focus
            return;
          }
        }

        // Call original method for other events
        return originalAddEventListener.call(this, type, listener, options);
      };

      // Also try to remove existing blur handlers
      const originalDispatchEvent = window.dispatchEvent;
      window.dispatchEvent = function (event: Event) {
        if (event.type === "blur") {
          const focusDetector = FocusDetector.getInstance();
          if (focusDetector.isForceAlwaysFocused()) {
            BxLogger.info(LOG_TAG, "Intercepted blur event dispatch");
            // Don't dispatch blur events if we're forcing focus
            return true;
          }
        }

        // Call original method for other events
        return originalDispatchEvent.call(this, event);
      };

      this.blurHandlerPatched = true;
      BxLogger.info(LOG_TAG, "Successfully patched window blur handling");
    } catch (e) {
      BxLogger.error(LOG_TAG, "Failed to patch window blur handling:", e);
    }
  }

  /**
   * Patch the StreamPlaybackManager to prevent pausing when we want to force focus
   */
  private patchStreamPlaybackManager(): void {
    // Wait a bit for the StreamPlaybackManager to be fully initialized
    setTimeout(() => {
      try {
        const streamPlaybackManager = (window as any).BX_EXPOSED
          .streamPlaybackManager;
        if (!streamPlaybackManager) {
          BxLogger.warning(LOG_TAG, "StreamPlaybackManager not found");
          return;
        }

        // Save the original pause method
        if (!this.originalPauseMethod) {
          this.originalPauseMethod = streamPlaybackManager.pause;

          // Override the pause method
          streamPlaybackManager.pause = (reason: string) => {
            // If we're forcing focus and the reason is focus-related, prevent pausing
            if (
              this.forceAlwaysFocused &&
              reason === "Renderer.FocusState:FocusChanged"
            ) {
              BxLogger.info(
                LOG_TAG,
                "Preventing stream pause due to focus change"
              );
              return false;
            }

            // Otherwise, call the original method
            return this.originalPauseMethod.call(streamPlaybackManager, reason);
          };

          BxLogger.info(
            LOG_TAG,
            "Successfully patched StreamPlaybackManager.pause"
          );
        }

        // Also try to patch the input manager directly
        const inputManager = (window as any).BX_EXPOSED.inputManager;
        if (inputManager) {
          const originalPause = inputManager.pause;
          inputManager.pause = () => {
            if (this.forceAlwaysFocused) {
              BxLogger.info(LOG_TAG, "Preventing input manager pause");
              return;
            }
            return originalPause.call(inputManager);
          };

          BxLogger.info(LOG_TAG, "Successfully patched InputManager.pause");
        }
      } catch (e) {
        BxLogger.error(LOG_TAG, "Failed to patch StreamPlaybackManager:", e);
      }
    }, 1000);
  }

  /**
   * Override the focus state by sending a modified message back to the platform
   */
  private overrideFocusState(dataChannel: RTCDataChannel): void {
    try {
      // Create a message that mimics the platform's message but with focused=true
      const message = JSON.stringify({
        target: "/streaming/properties/titleinfo",
        content: JSON.stringify({
          focused: true,
          // We don't know other properties, but focused is what matters
        }),
      });

      // Send the override message
      dataChannel.send(message);
      BxLogger.info(
        LOG_TAG,
        "Sent focus override message to keep game focused"
      );
    } catch (e) {
      BxLogger.error(LOG_TAG, "Failed to override focus state:", e);
    }
  }

  /**
   * Update the focus state and dispatch an event if it changed
   */
  private updateFocusState(): void {
    const newState = this.calculateFocusState();

    if (this.currentFocusState !== newState) {
      this.currentFocusState = newState;
      BxLogger.info(LOG_TAG, "Focus state changed to:", newState);

      // Dispatch a custom event
      BxEvent.dispatch(window, FOCUS_STATE_CHANGED, { focused: newState });
    }
  }

  /**
   * Calculate the current focus state based on all sources
   */
  private calculateFocusState(): boolean {
    // If we're forcing focus, always return true
    if (this.forceAlwaysFocused) {
      return true;
    }

    // Primary focus indicator is the XCloud platform's focus state
    // Secondary indicators are window focus and page visibility
    return this.xcloudFocused && (this.windowFocused || this.pageVisible);
  }

  /**
   * Check if the application is currently focused
   */
  public isFocused(): boolean {
    return this.currentFocusState;
  }

  /**
   * Check if we're forcing the focus state
   */
  public isForceAlwaysFocused(): boolean {
    return this.forceAlwaysFocused;
  }

  /**
   * Force the focus state to always be true, regardless of actual focus
   * This is useful for automation that needs to continue even when the game is not focused
   * @param force Whether to force the focus state to always be true
   */
  public forceAlwaysFocus(force: boolean = true): void {
    if (this.forceAlwaysFocused !== force) {
      this.forceAlwaysFocused = force;
      BxLogger.info(LOG_TAG, "Force always focused set to:", force);

      // If we're enabling force focus, patch the StreamPlaybackManager and window blur
      if (force) {
        this.patchStreamPlaybackManager();
        this.patchWindowBlur();
      }

      // Update the focus state immediately
      this.updateFocusState();
    }
  }

  /**
   * Get detailed focus state information
   */
  public getFocusInfo(): {
    windowFocused: boolean;
    pageVisible: boolean;
    xcloudFocused: boolean;
    isFocused: boolean;
    forceAlwaysFocused: boolean;
  } {
    return {
      windowFocused: this.windowFocused,
      pageVisible: this.pageVisible,
      xcloudFocused: this.xcloudFocused,
      isFocused: this.currentFocusState,
      forceAlwaysFocused: this.forceAlwaysFocused,
    };
  }
}
