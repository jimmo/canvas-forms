import { StaticConstraint } from '../constraints';
import { Animator } from './animator';

export class CoordAnimator extends Animator {
  constructor(private readonly constraint: StaticConstraint) {
    super(constraint.control.form());
  }

  update(t: number): void {
    this.constraint.set(Math.round(t * 200));
  }
};
