/**
 * Handles idle state and wake lock functionality
 */
export class IdleHandler {
  private wakeLock: WakeLockSentinel | null = null;
  private idleTimeout: number | null = null;
  private readonly IDLE_TIMEOUT_MS = 3000;

  /**
   * Initialize idle detection and wake lock
   */
  async init(): Promise<void> {
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

  /**
   * Reset the idle timer
   */
  private resetIdleTimer(): void {
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

  /**
   * Clean up resources
   */
  destroy(): void {
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