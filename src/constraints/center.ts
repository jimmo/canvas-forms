import { Constraint } from './constraint';
import { Control } from '../core/control';
import { Coord, CoordAxis, CoordType } from '../core/enums';
import { CoordAnimator, EasingFunction } from '../animation';

// TODO: optionally take one or two control/coord pairs to center between.

// Represents a constraint that centers a control in its parent.
export class CenterConstraint extends Constraint {
  parentCoord: Coord;
  controlCoord: Coord;

  constructor(control: Control, axis: CoordAxis) {
    super([control], [Coord.create(axis, CoordType.A)]);
    this.parentCoord = Coord.create(axis, CoordType.B);
    this.controlCoord = Coord.create(axis, CoordType.B);
  }

  removeControl(control: Control) {
    if (control !== this.controls[0]) {
      throw new Error('CenterConstraint removed from incorrect control.');
    }
    this.remove();
  }

  paint(ctx: CanvasRenderingContext2D) {
    Constraint.drawCoord(ctx, 'pink', this.controls[0], this.coords[0], 0);
  }

  apply() {
    const control = this.controls[0];
    const p = Constraint.getCoord(control.parent, this.parentCoord);
    if (p === null) {
      return false;
    }
    const c = Constraint.getCoord(control, this.parentCoord);
    if (c === null) {
      return false;
    }
    Constraint.setCoord(control, this.coords[0], (p - c) / 2);
    return super.apply();
  }
}
