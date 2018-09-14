import { Constraint } from './constraint';
import { Control } from '../core/control';
import { Coord, CoordAxis, CoordType } from '../core/enums';

// A constraint that makes a control's width or height equal to the maximum extent of
// all of its child controls. Optionally adds extra padding to the right (or bottom), and
// optionally sets a minimum size.
// Note that if any of the child controls are positioned using X2/Y2, then this constraint
// cannot solve.
export class ContentConstraint extends Constraint {
  constructor(control: Control, axis: CoordAxis, private padding?: number, private min?: number) {
    super([control], [Coord.create(axis, CoordType.B)]);

    this.padding = this.padding || 0;
    this.min = this.min || 0;

    // Content makes no sense for anything other than width/height.
    if (this.coords[0] !== Coord.W && this.coords[0] !== Coord.H) {
      throw new Error('Can only set content constraints on width/height.');
    }
  }

  // Self destruct if the control is removed.
  removeControl(control: Control) {
    if (control !== this.controls[0]) {
      throw new Error('ContentConstraint removed from incorrect control.');
    }
    this.remove();
  }

  paint(ctx: CanvasRenderingContext2D) {
    Constraint.drawCoord(ctx, 'green', this.controls[0], this.coords[0], 0);
  }

  apply(): boolean {
    let v = 0;

    // Get the max right edge (or bottom edge) of all child controls.
    for (const c of this.controls[0].controls) {
      let cv = 0;
      if (this.coords[0].axis === CoordAxis.X) {
        cv = Constraint.getCoord(c, Coord.XW);
      } else if (this.coords[0].axis === CoordAxis.Y) {
        cv = Constraint.getCoord(c, Coord.YH);
      }
      if (cv === null) {
        // If unavailable, then ask to be re-tried later.
        // Note that if any controls are positioned using X2/Y2, then
        // this will always fail and layout will fail.
        return false;
      }
      v = Math.max(v, cv);
    }

    // Apply padding and minimum.
    Constraint.setCoord(this.controls[0], this.coords[0], Math.max(this.min, v + this.padding));

    return true;
  }

  // Helpers to override padding and minimum.
  setPadding(padding?: number) {
    this.padding = padding || 0;
  }
  setMinimum(min?: number) {
    this.min = min || 0;
  }
}
