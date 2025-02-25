/**
 * Utility class for handling timing-related operations
 */
export class TimingUtils {
  /**
   * Delay execution for a specified number of milliseconds
   */
  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Delay execution for a random duration up to maxMs milliseconds
   */
  static async randomDelay(maxMs: number): Promise<void> {
    const delay = Math.random() * maxMs;
    return TimingUtils.delay(delay);
  }

  /**
   * Generates a random delay between min and max milliseconds
   */
  static getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
} 