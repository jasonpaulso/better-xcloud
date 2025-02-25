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
    for (const [element, frameId] of this.animationFrames) {
      cancelAnimationFrame(frameId);
    }
    this.animationFrames.clear();
  }
} 