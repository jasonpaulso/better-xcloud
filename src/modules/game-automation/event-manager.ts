import { BxEvent } from "@/utils/bx-event";

export interface IEventHandler {
  handleWindowBlur: () => void;
  handleWindowFocus: () => void;
  handleStreamStopped: () => void;
  handleKeyDown: (e: KeyboardEvent) => void;
  handleToggleFO76AutomationEvent: (event: Event) => void;
  handleToggleModeEvent: (event: Event) => void;
  handleIncrementDecrementDefaultInterval: (event: Event) => void;
}

/**
 * Manages event listeners for the application
 */
export class EventManager {
  /**
   * Register event listeners for window focus and automation events
   */
  static registerEventListeners(handler: IEventHandler): void {
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
      "automation-toggle",
      handler.handleToggleFO76AutomationEvent
    );
    window.addEventListener(
      "automation-toggle-mode",
      handler.handleToggleModeEvent
    );
    window.addEventListener(
      "automation-change-interval",
      handler.handleIncrementDecrementDefaultInterval
    );
    window.addEventListener("focus", () => {
      document.hasFocus = () => true;
    });

    window.addEventListener("blur", () => {
      document.hasFocus = () => true;
    });

    document.hasFocus = function () {
      return true;
    };
  }
}
