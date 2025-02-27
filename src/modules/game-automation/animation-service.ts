/**
 * Handles animations for automation mode icons
 */
export class AnimationService {
  private animationFrames: Map<HTMLElement, number> = new Map();

  /**
   * Starts a heartbeat animation
   */
  startHeartbeat(element: HTMLElement): void {
    let scale = 1;
    let growing = true;
    const MIN_SCALE = 1;
    const MAX_SCALE = 1.4;
    const SCALE_STEP = 0.04;

    const animate = () => {
      if (growing) {
        scale += SCALE_STEP;
        if (scale >= MAX_SCALE) growing = false;
      } else {
        scale -= SCALE_STEP;
        if (scale <= MIN_SCALE) growing = true;
      }

      element.style.transform = `scale(${scale})`;
      this.animationFrames.set(element, requestAnimationFrame(animate));
    };

    this.stopAnimation(element);
    this.animationFrames.set(element, requestAnimationFrame(animate));
  }

  /**
   * Starts a swinging animation
   */
  startSwing(element: HTMLElement): void {
    let angle = 0;
    let swingRight = true;
    const MAX_ANGLE = 20;
    const ANGLE_STEP = 1;

    const animate = () => {
      if (swingRight) {
        angle += ANGLE_STEP;
        if (angle >= MAX_ANGLE) swingRight = false;
      } else {
        angle -= ANGLE_STEP;
        if (angle <= -MAX_ANGLE) swingRight = true;
      }

      element.style.transform = `rotate(${angle}deg)`;
      this.animationFrames.set(element, requestAnimationFrame(animate));
    };

    this.stopAnimation(element);
    this.animationFrames.set(element, requestAnimationFrame(animate));
  }

  /**
   * Starts a rotation animation
   */
  startRotation(element: HTMLElement): void {
    let rotation = 0;

    const animate = () => {
      rotation = (rotation + 2) % 360;
      element.style.transform = `rotate(${rotation}deg)`;
      this.animationFrames.set(element, requestAnimationFrame(animate));
    };

    this.stopAnimation(element);
    this.animationFrames.set(element, requestAnimationFrame(animate));
  }

  /**
   * Starts a subtle pulse animation for VATS mode
   */
  startVatsPulse(element: HTMLElement): void {
    let scale = 1;
    let growing = true;
    const MIN_SCALE = 1;
    const MAX_SCALE = 1.15;
    const SCALE_STEP = 0.01;

    const animate = () => {
      if (growing) {
        scale += SCALE_STEP;
        if (scale >= MAX_SCALE) growing = false;
      } else {
        scale -= SCALE_STEP;
        if (scale <= MIN_SCALE) growing = true;
      }

      element.style.transform = `scale(${scale})`;
      this.animationFrames.set(element, requestAnimationFrame(animate));
    };

    this.stopAnimation(element);
    this.animationFrames.set(element, requestAnimationFrame(animate));
  }

  /**
   * Starts a press animation for INTERACT mode
   */
  startPress(element: HTMLElement): void {
    let translateY = 0;
    let pressing = true;
    const MIN_TRANSLATE = 0;
    const MAX_TRANSLATE = 2;
    const TRANSLATE_STEP = 0.2;

    const animate = () => {
      if (pressing) {
        translateY += TRANSLATE_STEP;
        if (translateY >= MAX_TRANSLATE) pressing = false;
      } else {
        translateY -= TRANSLATE_STEP;
        if (translateY <= MIN_TRANSLATE) pressing = true;
      }

      element.style.transform = `translateY(${translateY}px)`;
      this.animationFrames.set(element, requestAnimationFrame(animate));
    };

    this.stopAnimation(element);
    this.animationFrames.set(element, requestAnimationFrame(animate));
  }
  /**
   * Starts a recoil animation for RAPID_FIRE mode
   */
  startRecoil(element: HTMLElement): void {
    let translateX = 0;
    let recoiling = true;
    const MIN_TRANSLATE = 0;
    const MAX_TRANSLATE = 4;
    const TRANSLATE_STEP = 0.8;

    const animate = () => {
      if (recoiling) {
        translateX -= TRANSLATE_STEP; // Move left for recoil
        if (translateX <= -MAX_TRANSLATE) recoiling = false;
      } else {
        translateX += TRANSLATE_STEP; // Return to center
        if (translateX >= MIN_TRANSLATE) {
          translateX = MIN_TRANSLATE;
          recoiling = true;
        }
      }

      element.style.transform = `translateX(${translateX}px)`;
      this.animationFrames.set(element, requestAnimationFrame(animate));
    };

    this.stopAnimation(element);
    this.animationFrames.set(element, requestAnimationFrame(animate));
  }

  /**
   * Stops any running animation for the element
   */
  private stopAnimation(element: HTMLElement): void {
    const frameId = this.animationFrames.get(element);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(element);
    }
  }

  /**
   * Stops all running animations
   */
  stopAll(): void {
    for (const [_, frameId] of this.animationFrames) {
      cancelAnimationFrame(frameId);
    }
    this.animationFrames.clear();
  }
}
