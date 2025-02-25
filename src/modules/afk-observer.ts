/**
 * Observes and handles AFK (Away From Keyboard) detection
 */
export class AfkObserver {
  private observer: MutationObserver | null = null;

  /**
   * Start observing for AFK check buttons
   */
  startObserving(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Look for the button with the specific class names
              const afkButton = node.querySelector(
                'button.Button-module__buttonBase___L-\\+qv.Button-module__callToAction___ULPzP[data-auto-focus="true"]'
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

  /**
   * Stop observing for AFK check buttons
   */
  stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
} 