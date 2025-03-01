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
  private dataChannelsPatched: Set<RTCDataChannel> = new Set();
  private inputManagerPatched: boolean = false;
  private gameStreamPatched: boolean = false;
  private gamepadPollingPatched: boolean = false;
  private originalStopGamepadPolling: any = null;

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

    // Patch data channels to intercept constrain messages
    this.patchDataChannels();

    // Apply patches immediately and periodically
    this.applyAllPatches();
    setInterval(() => this.applyAllPatches(), 2000);

    // Expose BX_EXPOSED globally if it doesn't exist
    this.ensureBxExposed();
  }

  /**
   * Ensure BX_EXPOSED is available globally
   */
  private ensureBxExposed(): void {
    if (!(window as any).BX_EXPOSED) {
      (window as any).BX_EXPOSED = {};

      // Try to find GameStreamingSDK
      const gameStreamingSDK = this.findGameStreamingSDK();
      if (gameStreamingSDK) {
        (window as any).BX_EXPOSED.gameStreamingSDK = gameStreamingSDK;
        BxLogger.info(LOG_TAG, "Exposed GameStreamingSDK globally");
      }
    }
  }

  /**
   * Find the GameStreamingSDK object in the global scope
   */
  private findGameStreamingSDK(): any {
    // Look for common properties that might contain the SDK
    for (const prop of Object.getOwnPropertyNames(window)) {
      try {
        const obj = (window as any)[prop];
        if (obj && typeof obj === "object") {
          // Check if this object has GameStreamingSDK properties
          if (
            obj.Input ||
            obj.StreamClient ||
            obj.StreamSession ||
            (obj.startGamepadPolling && obj.stopGamepadPolling)
          ) {
            BxLogger.info(
              LOG_TAG,
              "Found potential GameStreamingSDK at window." + prop
            );
            return obj;
          }
        }
      } catch (e) {
        // Ignore errors when accessing properties
      }
    }
    return null;
  }

  /**
   * Apply all patches to ensure focus is maintained
   */
  private applyAllPatches(): void {
    if (this.forceAlwaysFocused) {
      this.patchStreamPlaybackManager();
      this.patchWindowBlur();
      this.patchStreamClient();
      this.patchInputManager();
      this.patchGameStream();
      this.patchGamepadPolling();
      this.patchGlobalObjects();
    }
  }

  /**
   * Patch global objects that might be used for focus detection
   */
  private patchGlobalObjects(): void {
    // Try to find and patch any objects in the global scope
    const win = window as any;

    // Look for GameStreamingSDK
    if (win.GameStreamingSDK) {
      this.patchGameStreamingSDK(win.GameStreamingSDK);
    }

    // Look for objects with Input property
    for (const prop of Object.getOwnPropertyNames(window)) {
      try {
        const obj = win[prop];
        if (obj && typeof obj === "object" && obj.Input) {
          this.patchGameStreamingSDK(obj);
        }
      } catch (e) {
        // Ignore errors when accessing properties
      }
    }
  }

  /**
   * Patch the GameStreamingSDK object
   */
  private patchGameStreamingSDK(sdk: any): void {
    if (!sdk) return;

    // Patch Input manager if it exists
    if (sdk.Input && sdk.Input.manager) {
      const inputManager = sdk.Input.manager;

      // Patch pause method
      if (inputManager.pause) {
        const originalPause = inputManager.pause;
        inputManager.pause = () => {
          if (this.forceAlwaysFocused) {
            BxLogger.info(LOG_TAG, "Preventing SDK Input manager pause");
            return;
          }
          return originalPause.call(inputManager);
        };
      }

      // Patch resume method
      if (inputManager.resume) {
        const originalResume = inputManager.resume;
        inputManager.resume = () => {
          if (this.forceAlwaysFocused) {
            BxLogger.info(LOG_TAG, "Forcing SDK Input manager resume");
          }
          return originalResume.call(inputManager);
        };
      }

      BxLogger.info(
        LOG_TAG,
        "Successfully patched GameStreamingSDK.Input.manager"
      );
    }

    // Patch gamepad polling methods
    if (sdk.startGamepadPolling && sdk.stopGamepadPolling) {
      const originalStopPolling = sdk.stopGamepadPolling;
      sdk.stopGamepadPolling = () => {
        if (this.forceAlwaysFocused) {
          BxLogger.info(LOG_TAG, "Preventing SDK stopGamepadPolling");
          return;
        }
        return originalStopPolling.call(sdk);
      };

      BxLogger.info(
        LOG_TAG,
        "Successfully patched GameStreamingSDK gamepad polling"
      );
    }
  }

  /**
   * Patch the gamepad polling mechanism to prevent it from stopping
   */
  private patchGamepadPolling(): void {
    if (this.gamepadPollingPatched) {
      return;
    }

    try {
      // Try to find the GameStreamingSDK object
      const gameStreamingSDK =
        (window as any).GameStreamingSDK ||
        (window as any).BX_EXPOSED?.gameStreamingSDK;

      if (!gameStreamingSDK) {
        // Try to find it by looking for specific methods
        for (const prop of Object.getOwnPropertyNames(window)) {
          try {
            const obj = (window as any)[prop];
            if (
              obj &&
              typeof obj === "object" &&
              typeof obj.startGamepadPolling === "function" &&
              typeof obj.stopGamepadPolling === "function"
            ) {
              // Found the object with gamepad polling methods
              this.patchGamepadPollingObject(obj);
              this.gamepadPollingPatched = true;
              BxLogger.info(
                LOG_TAG,
                "Found and patched gamepad polling at window." + prop
              );
              break;
            }
          } catch (e) {
            // Ignore errors when accessing properties
          }
        }

        if (!this.gamepadPollingPatched) {
          BxLogger.warning(LOG_TAG, "Could not find gamepad polling methods");
        }
        return;
      }

      this.patchGamepadPollingObject(gameStreamingSDK);
      this.gamepadPollingPatched = true;
    } catch (e) {
      BxLogger.error(LOG_TAG, "Failed to patch gamepad polling:", e);
    }
  }

  /**
   * Patch a specific object that has gamepad polling methods
   */
  private patchGamepadPollingObject(obj: any): void {
    if (!obj) return;

    // Save the original stopGamepadPolling method
    this.originalStopGamepadPolling = obj.stopGamepadPolling;

    // Override the stopGamepadPolling method
    obj.stopGamepadPolling = () => {
      if (this.forceAlwaysFocused) {
        BxLogger.info(LOG_TAG, "Preventing stopGamepadPolling");
        return;
      }

      // Call the original method if we're not forcing focus
      if (this.originalStopGamepadPolling) {
        return this.originalStopGamepadPolling.call(obj);
      }
    };

    // Also ensure startGamepadPolling is called when we force focus
    if (obj.startGamepadPolling && this.forceAlwaysFocused) {
      try {
        obj.startGamepadPolling();
        BxLogger.info(LOG_TAG, "Forced startGamepadPolling");
      } catch (e) {
        BxLogger.error(LOG_TAG, "Failed to force startGamepadPolling:", e);
      }
    }

    BxLogger.info(LOG_TAG, "Successfully patched gamepad polling methods");
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
      this.applyAllPatches();
    });
  }

  /**
   * Patch data channels to intercept constrain messages
   */
  private patchDataChannels(): void {
    window.addEventListener(BxEvent.DATA_CHANNEL_CREATED, (e: Event) => {
      const dataChannel = (e as any).dataChannel;
      if (!dataChannel || this.dataChannelsPatched.has(dataChannel)) {
        return;
      }

      // Save the original send method
      const originalSend = dataChannel.send;

      // Override the send method
      dataChannel.send = (message: string) => {
        // Only intercept if we're forcing focus
        if (this.forceAlwaysFocused) {
          try {
            // Check if it's a string message
            if (typeof message === "string") {
              // Parse the message to check if it's a constrain message
              const parsedMessage = JSON.parse(message);

              if (
                parsedMessage.target === "/streaming/title/constrain" &&
                JSON.parse(parsedMessage.content).constrain === true
              ) {
                BxLogger.info(LOG_TAG, "Blocking constrain message:", message);
                // Don't forward the message
                return;
              }
            }
          } catch (e) {
            // Not JSON or other error, just let it pass through
          }
        }

        // Call the original send method for other messages
        return originalSend.call(dataChannel, message);
      };

      // Mark this channel as patched
      this.dataChannelsPatched.add(dataChannel);
      BxLogger.info(LOG_TAG, "Successfully patched data channel send method");
    });
  }

  /**
   * Attempt to patch the StreamClient directly to prevent constrain messages
   */
  private patchStreamClient(): void {
    try {
      // Try to find the StreamClient in the global scope
      const streamClient = (window as any).BX_EXPOSED?.streamClient;
      if (!streamClient) {
        BxLogger.warning(LOG_TAG, "StreamClient not found");
        return;
      }

      // Look for methods that might send constrain messages
      if (streamClient.sendMessage) {
        const originalSendMessage = streamClient.sendMessage;
        streamClient.sendMessage = (
          target: string,
          content: any,
          ...args: any[]
        ) => {
          // Check if this is a constrain message
          if (
            this.forceAlwaysFocused &&
            target === "/streaming/title/constrain" &&
            content?.constrain === true
          ) {
            BxLogger.info(
              LOG_TAG,
              "Blocking StreamClient constrain message:",
              content
            );
            // Return a fake success response
            return Promise.resolve({ success: true });
          }

          // Call the original method for other messages
          return originalSendMessage.call(
            streamClient,
            target,
            content,
            ...args
          );
        };

        BxLogger.info(LOG_TAG, "Successfully patched StreamClient.sendMessage");
      }
    } catch (e) {
      BxLogger.error(LOG_TAG, "Failed to patch StreamClient:", e);
    }
  }

  /**
   * Patch the GameStream object to prevent pausing
   */
  private patchGameStream(): void {
    if (this.gameStreamPatched) {
      return;
    }

    try {
      // Find the GameStream object
      const gameStream = (window as any).BX_EXPOSED?.gameStream;
      if (!gameStream) {
        BxLogger.warning(LOG_TAG, "GameStream not found");
        return;
      }

      // Override the pause method
      if (gameStream.pause) {
        const originalPause = gameStream.pause;
        gameStream.pause = (...args: any[]) => {
          if (this.forceAlwaysFocused) {
            BxLogger.info(LOG_TAG, "Preventing GameStream pause");
            return Promise.resolve();
          }
          return originalPause.apply(gameStream, args);
        };
      }

      // Override the pauseStreamPlayback method if it exists
      if (gameStream.pauseStreamPlayback) {
        const originalPauseStreamPlayback = gameStream.pauseStreamPlayback;
        gameStream.pauseStreamPlayback = (...args: any[]) => {
          if (this.forceAlwaysFocused) {
            BxLogger.info(LOG_TAG, "Preventing GameStream pauseStreamPlayback");
            return Promise.resolve();
          }
          return originalPauseStreamPlayback.apply(gameStream, args);
        };
      }

      this.gameStreamPatched = true;
      BxLogger.info(LOG_TAG, "Successfully patched GameStream methods");
    } catch (e) {
      BxLogger.error(LOG_TAG, "Failed to patch GameStream:", e);
    }
  }

  /**
   * Patch the InputManager more aggressively
   */
  private patchInputManager(): void {
    if (this.inputManagerPatched) {
      return;
    }

    try {
      // Find the InputManager
      const inputManager = (window as any).BX_EXPOSED?.inputManager;
      if (!inputManager) {
        BxLogger.warning(LOG_TAG, "InputManager not found");
        return;
      }

      // Override the pause method
      if (inputManager.pause) {
        const originalPause = inputManager.pause;
        inputManager.pause = (...args: any[]) => {
          if (this.forceAlwaysFocused) {
            BxLogger.info(LOG_TAG, "Preventing InputManager pause");
            // Don't call the original method
            return;
          }
          return originalPause.apply(inputManager, args);
        };
      }

      // Force the input manager to resume if it's paused
      if (inputManager.resume) {
        const originalResume = inputManager.resume;

        // Create a wrapper that ensures resume is called
        inputManager.resume = (...args: any[]) => {
          if (this.forceAlwaysFocused) {
            BxLogger.info(LOG_TAG, "Forcing InputManager resume");
            return originalResume.apply(inputManager, args);
          }
          return originalResume.apply(inputManager, args);
        };

        // Force resume now if we're forcing focus
        if (this.forceAlwaysFocused) {
          inputManager.resume();
        }
      }

      // Also try to find and patch the isPaused property or method
      if (inputManager.hasOwnProperty("isPaused")) {
        // If it's a property, override its getter
        const descriptor = Object.getOwnPropertyDescriptor(
          inputManager,
          "isPaused"
        );
        if (descriptor && descriptor.get) {
          Object.defineProperty(inputManager, "isPaused", {
            get: function () {
              const focusDetector = FocusDetector.getInstance();
              if (focusDetector.isForceAlwaysFocused()) {
                return false;
              }
              // Only call the original getter if it exists
              return descriptor.get && descriptor.get.call(inputManager);
            },
          });
        } else if (typeof inputManager.isPaused === "function") {
          // If it's a method, override it
          const originalIsPaused = inputManager.isPaused;
          inputManager.isPaused = (...args: any[]) => {
            if (this.forceAlwaysFocused) {
              return false;
            }
            return originalIsPaused.apply(inputManager, args);
          };
        }
      }

      this.inputManagerPatched = true;
      BxLogger.info(LOG_TAG, "Successfully patched InputManager");
    } catch (e) {
      BxLogger.error(LOG_TAG, "Failed to patch InputManager:", e);
    }
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

      // Also override document.hasFocus to always return true when forcing focus
      const originalHasFocus = document.hasFocus;
      document.hasFocus = function () {
        const focusDetector = FocusDetector.getInstance();
        if (focusDetector.isForceAlwaysFocused()) {
          return true;
        }
        return originalHasFocus.call(document);
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
    try {
      const streamPlaybackManager = (window as any).BX_EXPOSED
        ?.streamPlaybackManager;
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
            (reason === "Renderer.FocusState:FocusChanged" ||
              reason === "InputManager.Pause" ||
              reason.includes("Focus"))
          ) {
            BxLogger.info(
              LOG_TAG,
              "Preventing stream pause due to focus change, reason:",
              reason
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

      // Also try to override the isPaused property or method
      if (streamPlaybackManager.hasOwnProperty("isPaused")) {
        // If it's a property, override its getter
        const descriptor = Object.getOwnPropertyDescriptor(
          streamPlaybackManager,
          "isPaused"
        );
        if (descriptor && descriptor.get) {
          Object.defineProperty(streamPlaybackManager, "isPaused", {
            get: function () {
              const focusDetector = FocusDetector.getInstance();
              if (focusDetector.isForceAlwaysFocused()) {
                return false;
              }
              // Only call the original getter if it exists
              return (
                descriptor.get && descriptor.get.call(streamPlaybackManager)
              );
            },
          });
        } else if (typeof streamPlaybackManager.isPaused === "function") {
          // If it's a method, override it
          const originalIsPaused = streamPlaybackManager.isPaused;
          streamPlaybackManager.isPaused = (...args: any[]) => {
            if (this.forceAlwaysFocused) {
              return false;
            }
            return originalIsPaused.apply(streamPlaybackManager, args);
          };
        }
      }

      // If there's a resume method, make sure it's called when we force focus
      if (streamPlaybackManager.resume) {
        const originalResume = streamPlaybackManager.resume;
        streamPlaybackManager.resume = (...args: any[]) => {
          if (this.forceAlwaysFocused) {
            BxLogger.info(LOG_TAG, "Forcing StreamPlaybackManager resume");
          }
          return originalResume.apply(streamPlaybackManager, args);
        };

        // Force resume now if we're forcing focus
        if (this.forceAlwaysFocused) {
          streamPlaybackManager.resume();
        }
      }
    } catch (e) {
      BxLogger.error(LOG_TAG, "Failed to patch StreamPlaybackManager:", e);
    }
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

      // If we're enabling force focus, apply all patches
      if (force) {
        this.applyAllPatches();
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
