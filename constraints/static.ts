import { Constraint } from 'constraint';
import { Control } from '../core/control';
import { CoordData } from '../core/enums';

// Represents a simple constraint that sets one coordinate to a static value.
export class StaticConstraint extends Constraint {
  private v: number;

  constructor(readonly control: Control, readonly coord: CoordData, v: number) {
    super([control]);

    Constraint.refControl(this, this.control);
    this.v = v;
  }

  removeControl(control: Control) {
    if (control !== this.control) {
      throw new Error('StaticConstraint removed from incorrect control.');
    }
    this.remove();
  }

  remove() {
    Constraint.unrefControl(this, this.control);
    super.remove();
  }

  paint(ctx: CanvasRenderingContext2D) {
    Constraint.drawCoord(ctx, 'cornflowerblue', this.control, this.coord, 0);
  }

  apply() {
    // Static constraints have no dependency and will always apply successfully.
    Constraint.setCoord(this.control, this.coord, this.v);
    return true;
  }

  set(v: number) {
    this.v = v;
    this.control.relayout();
  }

  add(dv: number) {
    this.v += dv;
    this.control.relayout();
  }
}
