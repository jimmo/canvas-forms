import { Control } from '../core/control';
import { Coord, CoordAxis } from '../core/enums';

// Base class for constraints that can be applied to control coordinates.
export abstract class Constraint {
  protected parent: Control;
  order: number = 0;

  constructor(readonly controls: Control[], readonly coords: Coord[]) {
    if (controls.length !== coords.length) {
      throw new Error('Mismatched controls and coords.');
    }

    // Don't take ownership of the controls array that we were passed in.
    // We modify it, which might be surprising.
    this.controls = this.controls.slice();
    this.coords = this.coords.slice();

    // Let all the controls referenced by this constraint know about this constraint.
    for (let i = 0; i < this.controls.length; ++i) {
      this.controls[i].refConstraint(this, this.coords[i].axis);
    }

    // This is the control using this constraint to layout a child control.
    // i.e. a.constrain(b) --> b.parent === a
    this.parent = controls[0].parent;

    for (const c of controls) {
      if (!c.parent) {
        throw new Error('Control must be added to parent before constraining.');
      }
      if (c.parent != this.parent) {
        throw new Error('All controls in the same constraint must share the same parent.');
      }
    }

    // TODO: Consider having the form own all constraints.
    this.parent.childConstraints.push(this);

    // Any constraint is going to require a relayout.
    // TODO: consider optimising this to just re-layout the parent. (But with content
    // constraints, this can actually affect all the way up the hierarchy).
    this.parent.relayout();
  }

  // Called by a referenced control to remove itself from this constraint.
  // In many cases, this will result in the entire constraint being destroyed
  // (for example, an AlignConstraint needs both its controls to be valid).
  // Must be overriden by derived classes.
  abstract removeControl(control: Control): void;

  // Remove this constraint from it's parent control (and unref it
  // from any controls that it constrains).
  // When overriden by derived classes, must call super.
  remove() {
    // Notify all controls that are referenced by this constraint.
    for (let i = 0; i < this.controls.length; ++i) {
      this.controls[i].unrefConstraint(this, this.coords[i].axis);
    }

    // Remove this constraint from the parent.
    if (this.parent) {
      for (let i = 0; i < this.parent.childConstraints.length; ++i) {
        if (this.parent.childConstraints[i] === this) {
          this.parent.childConstraints.splice(i, 1);
          this.parent.relayout();
          return;
        }
      }
    }
  }

  // In layout mode, show this constraint on the form.
  // TODO: rename to not confuse with Control::paint.
  abstract paint(ctx: CanvasRenderingContext2D): void;

  // Helper to map the Coord enum to the various properties on controls.
  // e.g. Coord.X --> control.x
  // Note: this will also cause the control to attempt to calculate any
  // other coordinates on the same axis.
  static setCoord(control: Control, coord: Coord, v: number) {
    if (v - Math.floor(v) > 0.001) {
      console.log('Non-integer coord value.');
    }
    v = Math.floor(v);
    if (coord === Coord.X) {
      if (control.x !== null) {
        throw new Error('Overspecified coordinate: x');
      }
      control.x = v;
    } else if (coord === Coord.Y) {
      if (control.y !== null) {
        throw new Error('Overspecified coordinate: y');
      }
      control.y = v;
    } else if (coord === Coord.W) {
      if (control.w !== null) {
        throw new Error('Overspecified coordinate: w');
      }
      control.w = v;
    } else if (coord === Coord.H) {
      if (control.h !== null) {
        throw new Error('Overspecified coordinate: h');
      }
      control.h = v;
    } else if (coord === Coord.X2) {
      if (control.x2 !== null) {
        throw new Error('Overspecified coordinate: x2');
      }
      control.x2 = v;
    } else if (coord === Coord.Y2) {
      if (control.y2 !== null) {
        throw new Error('Overspecified coordinate: y2');
      }
      control.y2 = v;
    } else if (coord === Coord.XW) {
      if (control.xw !== null) {
        throw new Error('Overspecified coordinate: xw');
      }
      control.xw = v;
    } else if (coord === Coord.YH) {
      if (control.yh !== null) {
        throw new Error('Overspecified coordinate: yh');
      }
      control.yh = v;
    } else if (coord === Coord.X2W) {
      if (control.x2w !== null) {
        throw new Error('Overspecified coordinate: x2w');
      }
      control.x2w = v;
    } else if (coord === Coord.Y2H) {
      if (control.y2h !== null) {
        throw new Error('Overspecified coordinate: y2h');
      }
      control.y2h = v;
    }

    // Calculate other coordinates on this axis (if possible).
    control.recalculate(coord.axis);
  }

  // Helper to map the Coord enum to the various properties on controls.
  // e.g. Coord.X --> control.x
  static getCoord(control: Control, coord: Coord) {
    if (coord === Coord.X) {
      return control.x;
    } else if (coord === Coord.Y) {
      return control.y;
    } else if (coord === Coord.W) {
      return control.w;
    } else if (coord === Coord.H) {
      return control.h;
    } else if (coord === Coord.X2) {
      return control.x2;
    } else if (coord === Coord.Y2) {
      return control.y2;
    } else if (coord === Coord.XW) {
      return control.xw;
    } else if (coord === Coord.YH) {
      return control.yh;
    } else if (coord === Coord.X2W) {
      return control.x2w;
    } else if (coord === Coord.Y2H) {
      return control.y2h;
    }
  }

  // Must be overriden. Set the coordinates on any controls, and return true if
  // this was able to be done successfully.
  // Return false if the constraint could not yet be calculated, which will cause
  // it to be moved to the end of the list and tried again later.
  // Must call super.apply() if successful.
  apply() {
    for (let i = 0; i < this.controls.length; ++i) {
      this.controls[i].constraintApplied(this.coords[i].axis);
    }
    return true;
  }

  // Return true if this constraint has converged.
  // The `round` argument indicates what round this is.
  // If any constraint returns false here, then the entire layout will be attempted again
  // and it is expected that the constraint will remember enough state to improve
  // it's calculation for the subsequent iteration (and eventually converge).
  done(round: number) {
    return true;
  }

  // Helper for edit mode. Figures out what sort of arrowline to draw.
  static drawCoord(ctx: CanvasRenderingContext2D, color: string, control: Control, coord: Coord, offset: number) {
    let xmid = control.x + Math.round(control.w / 3);
    let ymid = control.y + Math.round(control.h / 3);

    if (coord.axis === CoordAxis.X) {
      ymid += offset;
    } else if (coord.axis === CoordAxis.Y) {
      xmid += offset;
    }

    if (coord === Coord.X) {
      Constraint.drawConstraint(ctx, color, 0, ymid, control.x, ymid);
    } else if (coord === Coord.Y) {
      Constraint.drawConstraint(ctx, color, xmid, 0, xmid, control.y);
    } else if (coord === Coord.W) {
      Constraint.drawConstraint(ctx, color, control.x, ymid, control.xw, ymid);
    } else if (coord === Coord.H) {
      Constraint.drawConstraint(ctx, color, xmid, control.y, xmid, control.yh);
    } else if (coord === Coord.X2) {
      Constraint.drawConstraint(ctx, color, control.parent.w, ymid, control.xw, ymid);
    } else if (coord === Coord.Y2) {
      Constraint.drawConstraint(ctx, color, xmid, control.parent.h, xmid, control.yh);
    } else if (coord === Coord.XW) {
      Constraint.drawConstraint(ctx, color, 0, ymid, control.xw, ymid);
    } else if (coord === Coord.YH) {
      Constraint.drawConstraint(ctx, color, xmid, 0, xmid, control.yh);
    } else if (coord === Coord.X2W) {
      Constraint.drawConstraint(ctx, color, control.parent.w, ymid, control.x, ymid);
    } else if (coord === Coord.Y2H) {
      Constraint.drawConstraint(ctx, color, xmid, control.parent.h, xmid, control.y);
    } else {
      console.log('Unable to draw static constraint on ', coord);
    }
  }

  // Draws a single arrow line.
  static drawConstraint(ctx: CanvasRenderingContext2D, color: string, x1: number, y1: number, x2: number, y2: number) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // Experiment with drawing vertical/horizontal alignment lines.
    // ctx.beginPath();
    // if (y1 === y2) {
    //   //ctx.moveTo(x2, 0);
    //   //ctx.lineTo(x2,
    // } else if (x1 === x2) {
    // }
    // ctx.setLineDash([5,5]);
    // ctx.stroke();

    let t1 = x1;
    let t2 = x2;
    x1 = Math.min(t1, t2);
    x2 = Math.max(t1, t2);

    t1 = y1;
    t2 = y2;
    y1 = Math.min(t1, t2);
    y2 = Math.max(t1, t2);

    ctx.beginPath();
    if (y1 === y2) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + 6, y1 + 6);
      ctx.lineTo(x1 + 6, y1 - 6);
      ctx.lineTo(x1, y1);
      ctx.moveTo(x1 + 6, y1);

      ctx.lineTo(x2 - 6, y2);
      ctx.lineTo(x2 - 6, y2 + 6);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 - 6, y2 - 6);
      ctx.lineTo(x2 - 6, y2);
    } else if (x1 === x2) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + 6, y1 + 6);
      ctx.lineTo(x1 - 6, y1 + 6);
      ctx.lineTo(x1, y1);
      ctx.moveTo(x1, y1 + 6);

      ctx.lineTo(x2, y2 - 6);
      ctx.lineTo(x2 - 6, y2 - 6);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 + 6, y2 - 6);
      ctx.lineTo(x2, y2 - 6);
    } else {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }
}
