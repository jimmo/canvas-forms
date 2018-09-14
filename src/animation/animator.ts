import { Control, Form } from "../core";

// Function that maps (0,1) -> (0,1).
export type EasingFunction = (t: number) => number;

// Different easing functions (i.e. acceleration profiles for the animation).
export const Easing = {
  // No easing, no acceleration.
  linear: function(t: number) { return t },
  // Accelerating from zero velocity.
  easeInQuad: function(t: number) { return t * t },
  // Decelerating to zero velocity.
  easeOutQuad: function(t: number) { return t * (2 - t) },
  // Acceleration until halfway, then deceleration.
  easeInOutQuad: function(t: number) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t },
  // Accelerating from zero velocity.
  easeInCubic: function(t: number) { return t * t * t },
  // Decelerating to zero velocity.
  easeOutCubic: function(t: number) { return (--t) * t * t + 1 },
  // Acceleration until halfway, then deceleration.
  easeInOutCubic: function(t: number) { return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1 },
  // Accelerating from zero velocity.
  easeInQuart: function(t: number) { return t * t * t * t },
  // Decelerating to zero velocity.
  easeOutQuart: function(t: number) { return 1 - (--t) * t * t * t },
  // Acceleration until halfway, then deceleration.
  easeInOutQuart: function(t: number) { return t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t },
  // Accelerating from zero velocity.
  easeInQuint: function(t: number) { return t * t * t * t * t },
  // Decelerating to zero velocity.
  easeOutQuint: function(t: number) { return 1 + (--t) * t * t * t * t },
  // Acceleration until halfway, then deceleration.
  easeInOutQuint: function(t: number) { return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t }
}

export abstract class Animator {
  // If true, this animator will restart from zero automatically.
  loop: boolean = false;

  // Tracks the frame time of the first frame.
  private startTime: number = 0;

  // Resovle method for the promise returned from `start()`.
  private _resolve: (data?: any) => void;

  // TODO: manage lifetime w.r.t. controls.
  // i.e. if a control is removed while animating, the animator needs to stop.

  constructor(protected readonly controls: Control[], protected readonly durationMs?: number, protected readonly easing?: EasingFunction) {
    this.durationMs = this.durationMs || 500;
    this.easing = this.easing || Easing.linear;
  }

  start() {
    this.startTime = 0;

    // Register ourselves with the form so that we receive frame callbacks (via `apply()`).
    this.controls[0].form().addAnimator(this);

    // Allow `await anim.start()` so that animations can be sequenced.
    return new Promise<void>((resolve) => {
      this._resolve = resolve;
    });
  }

  stop() {
    // Stop receiving frame callbacks.
    this.controls[0].form().removeAnimator(this);

    // Complete the promise returned from `start()`.
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  // Called by Form on every frame.
  apply(frameTimeMs: number) {
    if (this.startTime === 0) {
      // This is the first frame since start.
      this.startTime = frameTimeMs;
    }

    // Calculate how far through `this.durationMs` we are.
    const t = Math.min(1, (frameTimeMs - this.startTime) / this.durationMs);

    // Call the animator-specific behavior function.
    this.update(this.easing(Math.min(1, t)));

    if (frameTimeMs >= this.startTime + this.durationMs) {
      // If we go past this.durationMs, then either loop or stop.
      if (this.loop) {
        this.startTime = 0;
      } else {
        this.stop();
      }
    }
  }

  // Must be overriden to provide animator-specific behavior.
  abstract update(t: number): void;
};
