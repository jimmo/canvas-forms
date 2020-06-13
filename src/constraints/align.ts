import { Constraint } from './constraint';
import { Control } from '../core/control';
import { Coord, CoordAxis } from '../core/enums';

// This constrains two coordinates from the same axis.
// As soon as one is set, the other will copy it. This means the constraint is bidirectional.
//
// Optionally an `offset` can be specified which will make `coord1 = coord2 + offset`.
// Conceptually `new AlignConstrain(c2, Coord.X, c1, Coord.XW, 10)` should be read as
// "make c2.x = c1.xw + 10".
//
// Note that this constraint cannot "solve" for a value. i.e. it requires that some other
// constraint sets one of the two controls. See `FillConstraint` for that.
//
// TODO: consider making this take an array of control,coord pairs rather than just two.
export class AlignConstraint extends Constraint {
  offset: number;

  // Align coord1 of control1 to coord2 of control2, with an optional offset.
  constructor(readonly control1: Control, readonly coord1: Coord, readonly control2: Control, readonly coord2: Coord, offset?: number) {
    super([control1, control2], [coord1, coord2]);

    this.offset = offset || 0;
  }

  // AlignConstraints self-destruct if either control is removed.
  removeControl(control: Control) {
    if (control !== this.control1 && control !== this.control2) {
      throw new Error('AlignConstraint removed from incorrect control.');
    }
    this.remove();
  }

  apply() {
    let v1 = Constraint.getCoord(this.control1, this.coord1);
    let v2 = Constraint.getCoord(this.control2, this.coord2);

    if (v1 !== null && v2 !== null) {
      // This means that both have already been set, either:
      //  - Directly via another constraint
      //  - Indirectly by two other coordinates being set on both controls
      // TODO: we could detect here that they're set the way we expect, but this
      // would still mean that the form is overconstrained and likely a mistake.
      throw new Error('Aligning two coordinates that are already specified.');
    }

    if (v1 !== null) {
      // We have c1, so set c2.
      Constraint.setCoord(this.control2, this.coord2, v1 - this.offset);
      return super.apply();
    }

    if (v2 !== null) {
      // We have c2, so set c1.
      Constraint.setCoord(this.control1, this.coord1, v2 + this.offset);
      return super.apply();
    }

    // Neither was set, so we can't be applied yet.
    return false;
  }

  // If alignment can't proceed, then try giving both controls a width or height.
  unstick() {
    let v1 = Constraint.getCoord(this.control1, this.coord1);
    let v2 = Constraint.getCoord(this.control2, this.coord2);

    if (v1 !== null || v2 !== null) {
      throw new Error('Attempt to unstick a constraint that should have worked.')
    }

    if (this.coord1.axis == CoordAxis.X && this.coord2.axis == CoordAxis.X) {
      if (this.control1.w === null && this.control2.w === null) {
        Constraint.setCoord(this.control1, Coord.W, this.control1.form.defaultWidth);
        Constraint.setCoord(this.control2, Coord.W, this.control2.form.defaultWidth);
        return true;
      }
    }
    if (this.coord1.axis == CoordAxis.Y && this.coord2.axis == CoordAxis.Y) {
      if (this.control1.h === null && this.control2.h === null) {
        Constraint.setCoord(this.control1, Coord.H, this.control1.form.defaultHeight);
        Constraint.setCoord(this.control2, Coord.H, this.control2.form.defaultHeight);
        return true;
      }
    }

    return false;
  }

  paint(ctx: CanvasRenderingContext2D) {
    Constraint.drawCoord(ctx, 'orange', this.control1, this.coord1, 10);
    Constraint.drawCoord(ctx, 'orange', this.control2, this.coord2, 20);
  }
}
