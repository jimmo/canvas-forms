// Base class for constraints that can be applied to control coordinates.
class Constraint {
  constructor(controls) {
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

    this.parent.childConstraints.push(this);
    this.parent.relayout();
  }

  // Called by a referenced control to remove itself from this constraint.
  // In most cases, this will result in the entire constraint being destroyed.
  // Must be overriden by derived classes.
  removeControl(control) {
  }

  // Remove this constraint from it's parent control (and unref it
  // from any controls that it constrains).
  // Should be overriden by derived classes (and call super).
  remove() {
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

  // Helper for constraints to tell a control that it is referenced
  // by this contraints.
  static refControl(constraint, control) {
    control.refConstraints.push(constraint);
  }

  // Helper for constraints to tell a control that it is no longer
  // being referenced by this constraint (usually because the control
  // has requested it via `removeControl`).
  static unrefControl(constraint, control) {
    const i = control.refConstraints.indexOf(constraint);
    if (i < 0) {
      throw new Error('Cannot unref control.');
    }
    control.refConstraints.splice(i, 1);
  }

  // Helper to map the Coord enum to the various properties on controls.
  // e.g. Coord.X --> control.x
  // Note: this will also cause the control to attempt to calculate any
  // other coordinates on the same axis.
  static setCoord(control, coord, v) {
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
  static getCoord(control, coord) {
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
  apply() {
    return false;
  }

  // Return true if this constraint has converged.
  // The `round` argument indicates what round this is.
  // If any constraint returns false here, then the entire layout will be attempted again
  // and it is expected that the constraint will remember enough state to improve
  // it's calculation for the subsequent iteration (and eventually converge).
  done(round) {
    return true;
  }
}

// Represents a simple constraint that sets one coordinate to a static value.
class StaticConstraint extends Constraint {
  constructor(control, coord, v) {
    super([control]);

    this.control = control;
    Constraint.refControl(this, control);

    this.coord = coord;
    this.v = v;
  }

  removeControl(control) {
    if (control !== this.control) {
      throw new Error('StaticConstraint removed from incorrect control.');
    }
    this.remove();
  }

  remove() {
    Constraint.unrefControl(this, this.control);
    super.remove();
  }

  apply() {
    // Static constraints have no dependency and will always apply successfully.
    Constraint.setCoord(this.control, this.coord, this.v);
    return true;
  }
}

// This constrains two coordinates from the same axis.
// As soon as one is set, the other will copy it. This means the constraint is bidirectional.
//
// Optionally an `offset` can be specified which will make `coord1 = coord2 + offset`.
// Conceptually `new AlignConstrain(c2, Coord.X, c1, Coord.XW, 10)` should be read as
// "make c2.x = c1.xw + 10".
//
// Note that this constraint cannot "solve" for a value. i.e. it requires that some other
// constraint sets one of the two controls. See `FillConstraint` for that.
class AlignConstraint extends Constraint {
  constructor(control1, coord1, control2, coord2, offset) {
    super([control1, control2]);

    this.control1 = control1;
    Constraint.refControl(this, control1);
    this.coord1 = coord1;
    this.control2 = control2;
    if (control1 !== control2) {
      Constraint.refControl(this, control2);
    }
    this.coord2 = coord2;
    this.offset = offset || 0;
  }

  removeControl(control) {
    if (control !== this.control1 && control !== this.control2) {
      throw new Error('AlignConstraint removed from incorrect control.');
    }
    this.remove();
  }

  remove() {
    Constraint.unrefControl(this, this.control1);
    if (this.control1 !== this.control2) {
      Constraint.unrefControl(this, this.control2);
    }
    super.remove();
  }

  apply() {
    const v1 = Constraint.getCoord(this.control1, this.coord1);
    const v2 = Constraint.getCoord(this.control2, this.coord2);

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
      return true;
    }

    if (v2 !== null) {
      // We have c2, so set c1.
      Constraint.setCoord(this.control1, this.coord1, v2 + this.offset);
      return true;
    }

    // Neither was set, so we can't be applied yet.
    return false;
  }
}

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
class FillConstraint extends Constraint {
  constructor(controls, coord, ratios) {
    super(controls);

    // Fill makes no sense for anything other than width/height.
    if (coord !== Coord.W && coord !== Coord.H) {
      throw new Error('Can only set fill constraints on width/height.');
    }

    // TODO: make ratios work.
    // TOOD: controls must all be unique.

    // Save controls, coords, and generate default ratios if not specified.
    this.controls = controls;
    for (const c of controls) {
      Constraint.refControl(this, c);
    }
    this.coord = coord;
    if (!ratios) {
      ratios = [];
      for (const c of controls) {
        ratios.push(1);
      }
    }
    this.ratios = ratios;

    // Need one control to measure and at least one to set.
    if (this.controls.length < 2) {
      throw new Error('Need at least two controls for a fill.');
    }
    if (this.ratios.length !== this.controls.length) {
      throw new Error('Wrong number of ratios for fill.');
    }

    // Cache the parent's width/height so that we can recompute faster.
    // The most likely reason for a relayout later is the parent resizing,
    // so we use the delta to set a starting guess for convergence.
    // In many cases, this guess will converge within ~2 rounds.
    this.lastParentSize = null;

    // This is the total size that we think we have to allocate across all the controls.
    // 100 each is just a starting guess.
    // We remember this across relayouts, because it's very common that a relayout
    // won't cause this fill to change.
    this.total = 100 * this.controls.length;
  }

  removeControl(control) {
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

  done(round) {
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
}
