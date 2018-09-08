import { StaticConstraint } from '../constraints';
import { Animator, Easing, EasingFunction } from './animator';

export class CoordAnimator extends Animator {
  constructor(private readonly constraint: StaticConstraint, private readonly min: number, private readonly max: number, duration?: number, easing?: EasingFunction) {
    super([constraint.control], duration, easing);
  }

  update(t: number): void {
    this.constraint.set(Math.round(this.min + (this.max - this.min) * t));
    this.controls[0].relayout();
  }
};
