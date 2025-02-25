import { CountdownToast } from "@/utils/toast";
import { BxIcon } from "@/utils/bx-icon";
import { FO76AutomationModes, type LoopConfig } from "./types";
import { AnimationService } from "./animation-service";

/**
 * Handles the UI elements for automation mode display
 */
export class AutomationUIManager {
  private container: HTMLElement;
  private activeElements: Map<string, {
    element: HTMLElement;
    intervalId: number;
  }> = new Map();
  private animationService: AnimationService;

  constructor() {
    this.container = document.createElement("div");
    this.container.style.display = "flex";
    this.container.style.flexDirection = "row";
    this.container.style.gap = "8px";
    this.container.style.maxWidth = "300px";
    this.animationService = new AnimationService();
  }

  /**
   * Updates the display of all automation modes
   */
  updateDisplay(modes: Map<string, LoopConfig>, onToggle: (mode: string) => void): void {
    this.cleanup();
    this.container.innerHTML = '';
    
    for (const [mode, config] of modes) {
      this.createModeElement(mode, config, onToggle);
    }
    
    this.showToast();
  }

  /**
   * Creates a UI element for a single mode
   */
  private createModeElement(mode: string, config: LoopConfig, onToggle: (mode: string) => void): void {
    const countdownElement = this.createBaseElement(mode, config);
    const { toastIcon, modeLabel, toastText } = this.createContentElements(mode, config);
    
    if (config.isRunning) {
      this.startAnimation(toastIcon, mode);
    }
    
    this.addEventListeners(countdownElement, mode, onToggle);
    
    countdownElement.appendChild(toastIcon);
    countdownElement.appendChild(modeLabel);
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
      borderRadius: "4px",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
      cursor: "pointer",
      transition: "all 0.2s ease",
      opacity: config.isRunning ? "1" : "0.7",
      minWidth: "120px",
      borderLeft: config.isRunning ? "3px solid #4CAF50" : "3px solid transparent"
    });
    
    element.title = `Click to ${config.isRunning ? 'stop' : 'start'} ${mode} mode`;
    
    return element;
  }

  /**
   * Creates the icon, label, and text elements
   */
  private createContentElements(mode: string, config: LoopConfig): { 
    toastIcon: HTMLElement; 
    modeLabel: HTMLElement; 
    toastText: HTMLElement; 
  } {
    const toastIcon = document.createElement("div");
    toastIcon.style.display = "inline-block";
    toastIcon.classList.add("bx-toast-icon");
    toastIcon.innerHTML = this.getIconForMode(mode);
    
    const modeLabel = document.createElement("div");
    modeLabel.style.fontWeight = "bold";
    modeLabel.textContent = mode;
    
    const toastText = document.createElement("div");
    toastText.style.display = "inline-block";
    toastText.style.marginLeft = "auto";
    toastText.textContent = config.isRunning ? 
      `${(config.actionInterval + config.pauseDuration) / 1000}s` : 
      "OFF";
    
    return { toastIcon, modeLabel, toastText };
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
      default:
        return "";
    }
  }

  /**
   * Adds event listeners for hover and click
   */
  private addEventListeners(element: HTMLElement, mode: string, onToggle: (mode: string) => void): void {
    element.addEventListener("mouseenter", () => {
      element.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      element.style.opacity = "1";
    });
    
    element.addEventListener("mouseleave", () => {
      element.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
      if (!this.activeElements.has(mode)) {
        element.style.opacity = "0.7";
      }
    });
    
    element.addEventListener("click", () => {
      onToggle(mode);
      element.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      setTimeout(() => {
        if (element.parentNode) {
          element.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
        }
      }, 200);
    });
  }

  /**
   * Starts the countdown timer
   */
  private startCountdown(textElement: HTMLElement, config: LoopConfig): number {
    let countdown = (config.actionInterval + config.pauseDuration) / 1000;
    
    return window.setInterval(() => {
      countdown--;
      if (countdown < 0) {
        countdown = (config.actionInterval + config.pauseDuration) / 1000;
      }
      textElement.textContent = `${countdown}s`;
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
        this.animationService.startSwing(element);
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