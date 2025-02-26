import { TimingUtils } from "./timing-utils";
import type { LoopConfig } from "./types";

/**
 * Manages automation loops for different modes
 */
export class LoopManager {
  private intervals: Map<string, number> = new Map();
  private lastExecutionTime: Map<string, number> = new Map();

  /**
   * Starts a loop for the given mode
   */
  startLoop(mode: string, config: LoopConfig): void {
    this.stopLoop(mode);

    // Execute one-time initialization action if provided
    if (config.initAction) {
      console.log(`Executing initialization action for ${mode}`);
      config.initAction().catch(error => {
        console.error(`Error in initialization action for ${mode}:`, error);
      });
    }

    const intervalId = window.setInterval(async () => {
      try {
        await config.action();
        await TimingUtils.delay(config.pauseDuration);
      } catch (error) {
        console.error(`Error in loop for ${mode}:`, error);
      }
    }, config.actionInterval + config.pauseDuration);

    this.intervals.set(mode, intervalId);
  }

  /**
   * Stop a loop for a specific mode
   */
  stopLoop(mode: string): void {
    const intervalId = this.intervals.get(mode);
    if (intervalId) {
      window.clearTimeout(intervalId);
      this.intervals.delete(mode);
    }
    this.lastExecutionTime.delete(mode);
  }

  /**
   * Stop all running loops
   */
  stopAll(): void {
    for (const [, intervalId] of this.intervals) {
      window.clearTimeout(intervalId);
    }
    this.intervals.clear();
    this.lastExecutionTime.clear();
  }
}
