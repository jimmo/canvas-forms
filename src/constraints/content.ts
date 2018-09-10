import { Constraint } from './constraint';
import { Control } from '../core/control';
import { Coord, CoordData, CoordAxis } from '../core/enums';

// Represents a simple constraint that sets one coordinate to a static value.
export class ContentConstraint extends Constraint {
  constructor(control: Control, coord: CoordData, private padding?: number, private min?: number) {
    super([control], [coord]);

    this.padding = this.padding || 0;
    this.min = this.min || 0;

    // Content makes no sense for anything other than width/height.
    if (this.coords[0] !== Coord.W && this.coords[0] !== Coord.H) {
      throw new Error('Can only set content constraints on width/height.');
    }
  }

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

    for (const c of this.controls[0].controls) {
      let cv = 0;
      if (this.coords[0].axis === CoordAxis.X) {
        cv = Constraint.getCoord(c, Coord.XW);
      } else if (this.coords[0].axis === CoordAxis.Y) {
        cv = Constraint.getCoord(c, Coord.YH);
      }
      if (cv === null) {
        return false;
      }
      v = Math.max(v, cv);
    }

    Constraint.setCoord(this.controls[0], this.coords[0], Math.max(this.min, v + this.padding));
    return true;
  }

  setPadding(padding?: number) {
    this.padding = padding || 0;
  }
}
