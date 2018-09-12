import { Constraint } from './constraint';
import { Control } from '../core/control';
import { Coord, CoordAxis, CoordType } from '../core/enums';
import { CoordAnimator, EasingFunction } from '../animation';

// Represents a simple constraint that sets one coordinate to a static value.
export class StaticConstraint extends Constraint {
  private v: number;

  constructor(control: Control, readonly coord: Coord, v: number) {
    super([control], [coord]);

    if (v - Math.floor(v) > 0.001) {
      console.log('Non-integer value for new static constraint.');
    }
    v = Math.floor(v);

    this.v = v;
  }

  removeControl(control: Control) {
    if (control !== this.controls[0]) {
      throw new Error('StaticConstraint removed from incorrect control.');
    }
    this.remove();
  }

  paint(ctx: CanvasRenderingContext2D) {
    Constraint.drawCoord(ctx, 'cornflowerblue', this.controls[0], this.coord, 0);
  }

  apply() {
    // The X2[W] can't be applied until the parent has a W/H.
    if (this.coord.isParentDependent()) {
      if (this.coord.axis === CoordAxis.X && this.parent.w === null) {
        return false;
      }
      if (this.coord.axis === CoordAxis.Y && this.parent.h === null) {
        return false;
      }
    }
    // Most static constraints have no dependency and will always apply successfully.
    Constraint.setCoord(this.controls[0], this.coord, this.v);
    return super.apply();
  }

  set(v: number) {
    if (v - Math.floor(v) > 0.001) {
      console.log('Non-integer value for updating static constraint.');
    }
    v = Math.floor(v);

    if (this.v !== v) {
      this.v = v;
      this.controls[0].relayout();
    }
  }

  add(dv: number) {
    if (dv - Math.floor(dv) > 0.001) {
      console.log('Non-integer value added to static constraint.');
    }
    dv = Math.floor(dv);

    this.v += dv;
    this.controls[0].relayout();
  }

  animate(min: number, max: number, duration?: number, easing?: EasingFunction) {
    return new CoordAnimator(this, min, max, duration, easing);
  }
}
