import { CountdownToast } from "@/utils/toast";
import { BxIcon } from "@/utils/bx-icon";
import { FO76AutomationModes, type LoopConfig } from "./types";
import { AnimationService } from "./animation-service";

/**
 * Handles the UI elements for automation mode display
 */
export class AutomationUIManager {
  private container: HTMLElement;
  private activeElements: Map<
    string,
    {
      element: HTMLElement;
      intervalId: number;
    }
  > = new Map();
  private animationService: AnimationService;

  constructor() {
    this.container = document.createElement("div");
    this.container.style.display = "flex";
    this.container.style.flexDirection = "row";
    this.container.style.alignItems = "center";
    this.container.style.gap = "8px";
    this.animationService = new AnimationService();
  }

  /**
   * Updates the display of all automation modes
   */
  updateDisplay(
    modes: Map<string, LoopConfig>,
    onToggle: (mode: string) => void,
    isEnabled?: boolean,
    onMainToggle?: () => void
  ): void {
    this.cleanup();
    this.container.innerHTML = "";

    // Add main control if handler provided
    if (typeof isEnabled === "boolean" && onMainToggle) {
      const mainConfig: LoopConfig = {
        isRunning: isEnabled,
        actionInterval: 0,
        pauseDuration: 0,
        action: async () => {},
      };

      const mainControl = this.createBaseElement("Automation", mainConfig);
      const { toastIcon } = this.createContentElements(
        FO76AutomationModes.AUTOMATION,
        mainConfig
      );

      if (isEnabled) {
        const iconElement = toastIcon.querySelector(".bx-toast-icon");
        if (iconElement instanceof HTMLElement) {
          this.startAnimation(iconElement, FO76AutomationModes.AUTOMATION);
        }
      }

      mainControl.addEventListener("mouseenter", () => {
        mainControl.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        mainControl.style.opacity = "1";
      });

      mainControl.addEventListener("mouseleave", () => {
        mainControl.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
      });

      mainControl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onMainToggle();
        mainControl.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        setTimeout(() => {
          if (mainControl.parentNode) {
            mainControl.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
          }
        }, 200);
      });

      mainControl.appendChild(toastIcon);

      this.container.appendChild(mainControl);

      const divider = document.createElement("div");
      divider.style.display = "inline-block";
      divider.style.height = "24px";
      divider.style.width = "2px";
      divider.style.backgroundColor = "#fff";
      divider.style.borderRadius = "4px";

      this.container.appendChild(divider);
    }

    for (const [mode, config] of modes) {
      this.createModeElement(mode, config, onToggle);
    }

    this.showToast();
  }

  /**
   * Creates a UI element for a single mode
   */
  private createModeElement(
    mode: string,
    config: LoopConfig,
    onToggle: (mode: string) => void
  ): void {
    const countdownElement = this.createBaseElement(mode, config);
    const { toastIcon, toastText } = this.createContentElements(mode, config);

    if (config.isRunning) {
      const iconElement = toastIcon.querySelector(".bx-toast-icon");
      if (iconElement instanceof HTMLElement) {
        this.startAnimation(iconElement, mode);
      }
    }

    countdownElement.addEventListener("mouseenter", () => {
      countdownElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      countdownElement.style.opacity = "1";
    });

    countdownElement.addEventListener("mouseleave", () => {
      countdownElement.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
      if (!this.activeElements.has(mode)) {
        countdownElement.style.opacity = "0.7";
      }
    });

    countdownElement.addEventListener("click", (event) => {
      console.log("Mode element clicked:", mode);
      event.preventDefault();
      event.stopPropagation();
      onToggle(mode);
      countdownElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      setTimeout(() => {
        if (countdownElement.parentNode) {
          countdownElement.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
        }
      }, 200);
    });

    countdownElement.appendChild(toastIcon);
    countdownElement.appendChild(toastText);

    if (config.isRunning) {
      const intervalId = this.startCountdown(toastText, config);
      this.activeElements.set(mode, { element: countdownElement, intervalId });
    }

    this.container.appendChild(countdownElement);
  }

  /**
   * Creates the base element with styling
   */
  private createBaseElement(mode: string, config: LoopConfig): HTMLElement {
    const element = document.createElement("div");
    Object.assign(element.style, {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "4px",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      cursor: "pointer",
      transition: "all 0.2s ease",
      opacity: config.isRunning ? "1" : "0.7",
    });

    // Enhanced tooltip with mode name and status
    element.title = `${mode} (${config.isRunning ? "Running" : "Stopped"})`;

    return element;
  }

  /**
   * Creates the icon, label, and text elements
   */
  private createContentElements(
    mode: string,
    config: LoopConfig
  ): {
    toastIcon: HTMLElement;
    modeLabel: HTMLElement;
    toastText: HTMLElement;
  } {
    const iconContainer = document.createElement("div");
    iconContainer.style.width = "16px";
    iconContainer.style.height = "16px";
    iconContainer.style.flexShrink = "0";
    iconContainer.style.display = "flex";
    iconContainer.style.alignItems = "center";
    iconContainer.style.justifyContent = "center";

    const toastIcon = document.createElement("div");
    toastIcon.style.width = "100%";
    toastIcon.style.height = "100%";
    toastIcon.classList.add("bx-toast-icon");
    toastIcon.innerHTML = this.getIconForMode(mode);

    // Ensure SVG fills the container
    const svg = toastIcon.querySelector("svg");
    if (svg instanceof SVGElement) {
      svg.style.width = "100%";
      svg.style.height = "100%";
    }

    iconContainer.appendChild(toastIcon);

    const toastText = document.createElement("div");
    toastText.style.display =
      window.innerWidth <= 768 ? "none" : "inline-block";
    toastText.style.marginLeft = "auto";
    toastText.style.width = "40px";
    toastText.style.textAlign = "right";
    toastText.style.fontVariantNumeric = "tabular-nums";
    toastText.textContent = config.isRunning
      ? `${(config.actionInterval + config.pauseDuration) / 1000}s`
      : "OFF";

    // Create a dummy modeLabel to maintain interface compatibility
    const modeLabel = document.createElement("div");

    return { toastIcon: iconContainer, modeLabel, toastText };
  }

  /**
   * Gets the appropriate icon for the mode
   */
  private getIconForMode(mode: string): string {
    switch (mode) {
      case FO76AutomationModes.PIVOT:
        return BxIcon.PIVOT;
      case FO76AutomationModes.HEAL:
        return BxIcon.HEART_PULSE;
      case FO76AutomationModes.AUTOMATION:
        return BxIcon.SUITCASE;
      case FO76AutomationModes.VATS:
        return BxIcon.CROSSHAIRS;
      case FO76AutomationModes.INTERACT:
        return BxIcon.TOUCH;
      default:
        return "";
    }
  }

  /**
   * Starts the countdown timer
   */
  private startCountdown(textElement: HTMLElement, config: LoopConfig): number {
    const totalDuration =
      (config.actionInterval || 0) + (config.pauseDuration || 0);
    let countdown = Math.max(1, totalDuration / 1000);

    // Update immediately with fixed decimal places
    textElement.textContent = `${countdown.toFixed(1)}s`;

    return window.setInterval(() => {
      countdown = Math.max(0, countdown - 1);
      if (countdown <= 0) {
        countdown = Math.max(1, totalDuration / 1000);
      }
      textElement.textContent = `${countdown.toFixed(1)}s`;
    }, 1000);
  }

  /**
   * Starts the appropriate animation for the mode
   */
  private startAnimation(element: HTMLElement, mode: string): void {
    switch (mode) {
      case FO76AutomationModes.HEAL:
        this.animationService.startHeartbeat(element);
        break;
      case FO76AutomationModes.AUTOMATION:
        break;
      case FO76AutomationModes.VATS:
        this.animationService.startVatsPulse(element);
        break;
      case FO76AutomationModes.INTERACT:
        this.animationService.startPress(element);
        break;
      default:
        this.animationService.startRotation(element);
    }
  }

  /**
   * Shows the toast with all modes
   */
  private showToast(): void {
    CountdownToast.show(this.container);
  }

  /**
   * Cleans up intervals and elements
   */
  cleanup(): void {
    for (const [_, { intervalId }] of this.activeElements) {
      clearInterval(intervalId);
    }
    this.activeElements.clear();
  }
}
