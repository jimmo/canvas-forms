import { Constraint } from 'constraint';
import { Control } from '../core/control';
import { Coord, CoordData } from '../core/enums';

// This makes two or more constraints fill to fit available space.
// It essentially constrains all the controls to be the same width (or height), and then
// solves for a width that it sets on all but the first control that results in the first
// control also getting the same width (via other constraints).
// So for example, to make four buttons fill the available width, with padding between each, you
// would constrain the first button's X coordinate statically, then align each subsequent button's
// X to the previous one's XW, then the final button's X2 statically. Then use a fill
// on all of them to solve for their widths.
// Fills can work recursively -- i.e. you can fill controls that are aligned to another
// filled control, and you can mix with width-based alignments.
export class FillConstraint extends Constraint {
  // Cache the parent's width/height so that we can recompute faster.
  // The most likely reason for a relayout later is the parent resizing,
  // so we use the delta to set a starting guess for convergence.
  // In many cases, this guess will converge within ~2 rounds.
  private lastParentSize: number = null;

  // This is the total size that we think we have to allocate across all the controls.
  // We remember this across relayouts, because it's very common that a relayout
  // won't cause this fill to change.
  private total: number;

  constructor(readonly controls: Control[], readonly coord: CoordData, readonly ratios?: number[]) {
    super(controls);

    // Fill makes no sense for anything other than width/height.
    if (this.coord !== Coord.W && this.coord !== Coord.H) {
      throw new Error('Can only set fill constraints on width/height.');
    }

    // TODO: make ratios work.
    // TOOD: controls must all be unique.

    // Save controls, coords, and generate default ratios if not specified.
    for (const c of this.controls) {
      Constraint.refControl(this, c);
    }
    if (!this.ratios) {
      this.ratios = [];
      for (const c of this.controls) {
        this.ratios.push(1);
      }
    }

    // Need one control to measure and at least one to set.
    if (this.controls.length < 2) {
      throw new Error('Need at least two controls for a fill.');
    }
    if (this.ratios.length !== this.controls.length) {
      throw new Error('Wrong number of ratios for fill.');
    }

    // 100 each is just a starting guess.
    this.total = 100 * this.controls.length;
  }

  removeControl(control: Control) {
    const i = this.controls.indexOf(control);
    if (i < 0) {
      throw new Error('FilLConstraint removed from incorrect control.');
    }
    this.controls.splice(i, 1);
    this.ratios.splice(i, 1);
    Constraint.unrefControl(this, control);
    if (this.controls.length < 2) {
      this.remove();
    }
  }

  remove() {
    for (const c of this.controls) {
      Constraint.unrefControl(this, c);
    }
    super.remove();
  }

  apply() {
    // If the parent has resized since the last successful layout then try and
    // adjust our starting total accordingly.
    if (this.lastParentSize && this.controls[0].parent.w !== this.lastParentSize) {
      this.total = Math.round(this.total * this.controls[0].parent.w / this.lastParentSize);
      this.lastParentSize = this.controls[0].parent.w;
    }

    // The way this works is:
    //  - Leave the first control unset.
    //  - Set all other controls to our current guess.
    //  - Let this layout round complete all other constraints.  (this will set the first control)
    //  - Sum up the total size of all controls.
    //    - If our guess was correct, then the first control will match.
    //    - Otherwise update our guess and start a new layout round.

    // If the size doesn't divide evenly, then we divvy up the remainder one pixel
    // at a time to each of the controls.
    let r = this.total % this.controls.length;
    // Get the per-control size.
    let v = (this.total - r) / this.controls.length;

    for (let i = 0; i < this.controls.length; ++i) {
      const c = this.controls[i];

      // Verify that some other constraint isn't fighting against us.
      if (Constraint.getCoord(c, this.coord) !== null) {
        throw new Error('Control already has width for fill');
      }

      // Skip the first control (this is the one we measure).
      if (i === 0) {
        continue;
      }

      // Add another pixel of remainder if we have any left to use.
      let vv = v;
      if (r > 0) {
        vv += 1;
        r -= 1;
      }

      // Set the size for this control.
      Constraint.setCoord(c, this.coord, vv);
    }

    // We always apply successfully - no dependencies.
    return true;
  }

  done(round: number) {
    // We set all the other controls in `apply`, see what the resulting size for the
    // first control was.
    let v = Constraint.getCoord(this.controls[0], this.coord);
    // Total width of all controls.
    let t = v;
    // Total error.
    let e = 0;

    // Get the width that we set on each of the other controls.
    // (We could recalculate this, the values will be the same as what we set in `apply`).
    for (let i = 1; i < this.controls.length; ++i) {
      const vv = Constraint.getCoord(this.controls[i], this.coord);
      e += Math.abs(v - vv);
      t += vv;
    }

    // When we converge successfully, there should be a maximum differnce of one pixel per
    // control (from the remainders).
    if (e <= this.controls.length) {
      return true;
    }

    // After the first round, we'll be oscillating around the correct result, so
    // dampen the oscillation.
    if (round >= 1) {
      t = Math.round((t + this.total) / 2);
    }

    // Update the new total width.
    this.total = t;
    // Cache the parent size that gave us this width.
    this.lastParentSize = this.controls[0].parent.w;

    // Need at least another round.
    return false;
  }

  paint(ctx: CanvasRenderingContext2D) {
    if (this.coord === Coord.W) {
      for (const c of this.controls) {
        Constraint.drawCoord(ctx, 'purple', c, Coord.W, 30);
      }
    } else if (this.coord === Coord.H) {
      for (const c of this.controls) {
        Constraint.drawCoord(ctx, 'purple', c, Coord.H, 30);
      }
    }
  }
}
