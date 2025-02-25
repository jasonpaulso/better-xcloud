import { TimingUtils } from "./timing-utils";
import type { LoopConfig } from "./types";

/**
 * Manages automation loops for different modes
 */
export class LoopManager {
  private intervals: Map<string, number> = new Map();

  /**
   * Start a loop for a specific mode
   */
  async startLoop(config: LoopConfig, mode: string): Promise<void> {
    config.isRunning = true;

    const loopFunction = async (): Promise<void> => {
      if (!config.isRunning) return;

      console.log("LoopManager", `Running ${mode} loop`);
      await config.action();
      await TimingUtils.delay(config.pauseDuration);

      if (config.isRunning) {
        this.intervals.set(
          mode,
          window.setTimeout(loopFunction, config.actionInterval)
        );
      }
    };

    await loopFunction();
  }

  /**
   * Stop a loop for a specific mode
   */
  stopLoop(config: LoopConfig, mode: string): void {
    const intervalId = this.intervals.get(mode);
    if (intervalId) {
      clearTimeout(intervalId);
      this.intervals.delete(mode);
    }

    config.isRunning = false;
  }

  /**
   * Stop all running loops
   */
  stopAll(): void {
    for (const [_, intervalId] of this.intervals) {
      clearTimeout(intervalId);
    }
    this.intervals.clear();
  }
}
