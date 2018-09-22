import { Constraint } from './constraint';
import { Control } from '../core/control';
import { Coord, CoordAxis, CoordType } from '../core/enums';
import { CoordAnimator, EasingFunction } from '../animation';

// A constraint that centers a control in its parent.
//
// TODO: optionally take one or two control/coord pairs to center between.
export class CenterConstraint extends Constraint {
  parentCoord: Coord;
  controlCoord: Coord;

  constructor(control: Control, axis: CoordAxis) {
    // We set the A coord (i.e. X or Y).
    super([control], [Coord.create(axis, CoordType.A)]);

    // But use the B coords (i.e. W or H) from the control and the control's parent to calculate.
    this.parentCoord = Coord.create(axis, CoordType.B);
    this.controlCoord = Coord.create(axis, CoordType.B);
  }

  // If the control is removed, then immediately remove the constraint.
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
    // Get the control's width and parent's width, then set the x coordinate corespondingly.
    // Fail if either of the widths aren't (yet) available.
    const control = this.controls[0];
    const p = Constraint.getCoord(control.parent, this.parentCoord);
    if (p === null) {
      return false;
    }
    const c = Constraint.getCoord(control, this.parentCoord);
    if (c === null) {
      return false;
    }
    Constraint.setCoord(control, this.coords[0], Math.floor((p - c) / 2));
    return super.apply();
  }
}
