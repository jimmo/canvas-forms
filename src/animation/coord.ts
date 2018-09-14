import { StaticConstraint } from '../constraints';
import { Animator, Easing, EasingFunction } from './animator';

// Animates a static constraint. Use this to animate control movement or size.
export class CoordAnimator extends Animator {
  constructor(private readonly constraint: StaticConstraint, private readonly min: number, private readonly max: number, duration?: number, easing?: EasingFunction) {
    super(constraint.controls, duration, easing);
  }

  update(t: number): void {
    // Simply update the static constraint and relayout the form.
    this.constraint.set(Math.round(this.min + (this.max - this.min) * t));
    this.controls[0].relayout();
  }
};
