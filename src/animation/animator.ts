import { Control, Form } from "../core";

export type EasingFunction = (t: number) => number;

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
  loop: boolean = false;
  private startTime: number = 0;
  private _resolve: (data?: any) => void;

  // TODO: manage lifetime w.r.t. controls.

  constructor(protected readonly controls: Control[], protected readonly duration?: number, protected readonly easing?: EasingFunction) {
    this.duration = this.duration || 500;
    this.easing = this.easing || Easing.linear;
  }

  start() {
    this.startTime = 0;
    this.controls[0].form().addAnimator(this);
    this.controls[0].relayout();
    return new Promise<void>((resolve) => {
      this._resolve = resolve;
    });
  }

  stop() {
    this.controls[0].form().removeAnimator(this);
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  apply(frameTimeMs: number) {
    if (this.startTime === 0) {
      this.startTime = frameTimeMs;
    }
    const t = Math.min(1, (frameTimeMs - this.startTime) / this.duration);
    this.update(this.easing(Math.min(1, t)));
    if (frameTimeMs >= this.startTime + this.duration) {
      if (this.loop) {
        this.startTime = 0;
      } else {
        this.stop();
      }
    }
  }

  abstract update(t: number): void;
};
