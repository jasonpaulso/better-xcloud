import { TimingUtils } from "./timing-utils";


/**
 * Handles button press actions with random delays
 */
export class ButtonPressHandler {
  constructor(private pressButton: (buttonCode: number, isPressed: boolean) => void) {}

  /**
   * Press a button with a random delay before releasing
   */
  async pressButtonWithRandomDelay(buttonCode: number, maxDelay: number): Promise<void> {
    this.pressButton(buttonCode, true);
    await TimingUtils.randomDelay(maxDelay);
    this.pressButton(buttonCode, false);
  }
} 