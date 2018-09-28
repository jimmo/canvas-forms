import { CoordAxis, Coord } from './enums';
import { EventSource } from './events';
import { Form, FormMouseDownEvent, FormKeyEvent, FormMouseMoveEvent, FormMouseUpEvent } from './form';
import { Constraint, AlignConstraint, StaticConstraint, FillConstraint, ContentConstraint, CenterConstraint } from '../constraints';
import { MenuItems } from './menu';

// Base class for events raised from controls.
export class ControlEvent {
  constructor(readonly control: Control) {
  }
}

// Options to pass to Control::controlAtPoint.
export interface ControlAtPointOpts {
  all?: boolean;
  formX?: number;
  formY?: number;
  exclude?: Control[];
}

// Control::add can take an object of coord values instead.
export interface AddCoords {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  x2?: number;
  y2?: number;
  xw?: number;
  yh?: number;
  x2w?: number;
  y2h?: number;
}

// Structure to represent a successful hit test.
export class ControlAtPointData {
  // These coordinates are relative to the control.
  x: number;
  y: number;
  // The form coordinates that this hit test was done at.
  formX: number;
  formY: number;

  // A copy of the initial form coordinates. Both x/y and formX/formY can be updated
  // (e.g. to reflect that the mouse has moved), but the startX/startY coordinates
  // will always reflect when the hit test was first run (e.g. on mouse down).
  startX: number;
  startY: number;

  constructor(readonly control: Control, x: number, y: number, formX: number, formY: number) {
    this.x = x;
    this.y = y;
    this.formX = formX;
    this.formY = formY;
    this.startX = formX;
    this.startY = formY;
  }

  // If we have an existing hit test, and capture is started, then we can update an existing
  // hit test result to reflect the new coordinates.
  // This is a requirement for capture, because the new formX/formY coordinates may actually
  // no longer inside the control.
  update(formX: number, formY: number): [number, number] {
    const dx = formX - this.formX;
    const dy = formY - this.formY;
    this.x += formX - this.formX;
    this.y += formY - this.formY;
    this.formX = formX;
    this.formY = formY;
    return [dx, dy];
  }
}

// Proxy class that provides a simple way of creating constaints on a coord.
// i.e. `myControl.coords.x` returns a ControlCoord. This allows shortcuts like:
// `myControl.coords.x.set(n)` instead of creating a StaticConstraint directly.
// Especially for align constraints, using `myControl.coords.x.align(otherControl.coords.x)`
// is a lot simpler than `new AlignConstraint(myControl, Coord.X, otherControl, Coord.X)`.
class ControlCoord {
  constructor(readonly control: Control, readonly coord: Coord) {
  }

  // Shortcut for AlignConstraint.
  align(other: ControlCoord, offset?: number) {
    return new AlignConstraint(this.control, this.coord, other.control, other.coord, offset);
  }

  // Shortcut for StaticConstraint.
  set(v: number) {
    if (v === null || v === undefined) {
      return null;
    }
    return new StaticConstraint(this.control, this.coord, v);
  }

  // Shortchut for ContentConstraint (i.e. size-to-content).
  fit(padding?: number, min?: number) {
    return new ContentConstraint(this.control, this.coord.axis, padding, min);
  }
}

// Controls provide direct access to their calculated layout coordinates, which
// is very useful for paint and layout calculations. However, the constraint proxies
// for these coordinates only needs to be accessed when defining layout, so no point
// having these objects existing permanantly as members on Control.
// This class creates them on demand when accessing `myControl.coords`.
class ControlCoords {
  constructor(readonly control: Control) {
  }

  get x() {
    return new ControlCoord(this.control, Coord.X);
  }
  get y() {
    return new ControlCoord(this.control, Coord.Y);
  }
  get w() {
    return new ControlCoord(this.control, Coord.W);
  }
  get h() {
    return new ControlCoord(this.control, Coord.H);
  }
  get x2() {
    return new ControlCoord(this.control, Coord.X2);
  }
  get y2() {
    return new ControlCoord(this.control, Coord.Y2);
  }
  get xw() {
    return new ControlCoord(this.control, Coord.XW);
  }
  get yh() {
    return new ControlCoord(this.control, Coord.YH);
  }
  get x2w() {
    return new ControlCoord(this.control, Coord.X2W);
  }
  get y2h() {
    return new ControlCoord(this.control, Coord.Y2H);
  }

  // Helper to set both width and height using static constraints directly.
  size(w: number, h: number) {
    this.w.set(w);
    this.h.set(h);
  }

  // Helper to center a control on a given axis.
  center(axis: CoordAxis, wh?: number) {
    if (wh !== undefined) {
      if (axis === CoordAxis.X) {
        this.w.set(wh);
      } else if (axis === CoordAxis.Y) {
        this.h.set(wh);
      }
    }
    return new CenterConstraint(this.control, axis);
  }
}

// Base control class - represents a single control on a form.
// Do not instantiate directly.
export class Control {
  // Child controls.
  private _controls: Control[] = [];

  // Constraints applied to children.
  // TODO: There's probably no reason why all constraints
  // can't just live on the form, rather than having to be associated
  // with their direct parent.
  // This would also let us remember the safe ordering of the global list of constraints.
  private _childConstraints: Constraint[] = [];

  // Constraints that use this control (so that we can remove them if the control is removed).
  // We separate them into axes because when all constraints for a given axis are applied,
  // then we can apply any defaults in order to make up coordinates that weren't calculated
  // via constraints.
  private refConstraintsX: Constraint[] = [];
  private refConstraintsY: Constraint[] = [];
  // During the layout process, count the number of successfully applied constraints so
  // we can figure out when all constraints on that axis have been applied.
  private constraintsAppliedX: number = 0;
  private constraintsAppliedY: number = 0;

  // Parent control (set automatically in add()).
  // Will be null for the root (Form) control.
  private _parent: Control = null;

  // Whether to include this control in hit detection.
  // Only enabled for controls that need hit detection and their ancestors.
  // Disabled by default so that hit detection is as cheap as possible and only
  // has to search controls that might care.
  private _enableHitDetection: boolean = false;
  private _enableHitDetectionForChild: boolean = false;

  // Read-only coordinates for this control.
  // Set by the `layout` process from the various constraints.
  // These should be considered readonly by everything except the layout
  // algorithm. In order to set a coordinate, use a constraint to have it
  // calculated during layout. The `coords` proxy is the easiest way to
  // do this.
  // Regardless of which coordinates the constraints set, once
  // any two on the same axis are set, then all the others will
  // be calculated automatically.
  // TODO: Consider aggregating these under a 'layout' member,
  // (i.e. `c.layout.x` instead of `c.x`) in order to match
  // the way `c.coords.x` works.
  x: number = null;
  y: number = null;
  w: number = null;
  h: number = null;
  x2: number = null;
  y2: number = null;
  xw: number = null;
  yh: number = null;
  x2w: number = null;
  y2h: number = null;

  // Enable paint clipping for the bounds of this control.
  // Very few controls should need to disable this.
  protected clip: boolean = true;

  // Is the mouse currently over this control.
  protected focused: boolean = false;

  // Is this control currently hovered.
  protected hovered: boolean = false;

  // Enable a simple border on this control.
  private _border: boolean = false;

  // Sets the opacity that this control will be drawn with.
  private _opacity: number = 1;

  // Is this element currently being considered as a drag target (i.e. there is
  // currently a drag in process, this control is under the mouse cursor, and
  // has returned true to `allowDrop`.
  // Controls may choose to render differently if so.
  protected dropTarget: boolean = false;

  // Events used to implement behavior for the controls.
  // These will be fired by the form.
  // In almost all cases, these events are internal to the control, and they
  // should expose high-level events reflecting their behavior. e.g. Buttons
  // have a `click` event, CheckBoxes have a `toggle`.
  // TODO: these members should be protected to enforce that.
  mousedown: EventSource<FormMouseDownEvent>;
  mouseup: EventSource<FormMouseUpEvent>;
  mousemove: EventSource<FormMouseMoveEvent>;
  mousedbl: EventSource<FormMouseUpEvent>;
  keydown: EventSource<FormKeyEvent>;

  protected constructor() {
    // When the surface detects a mouse event on this control, it will fire
    // these events. Use the `addCallback` to only enable hit detection if
    // something is actually listening to these events.
    this.mousedown = new EventSource(() => {
      this.enableHitDetection();
    });
    this.mouseup = new EventSource(() => {
      this.enableHitDetection();
    });
    this.mousemove = new EventSource(() => {
      this.enableHitDetection();
    });
    this.mousedbl = new EventSource(() => {
      this.enableHitDetection();
    });
    this.keydown = new EventSource(() => {
      this.enableHitDetection();
    });
  }

  toString() {
    return `Control at X: ${this.x} Y: ${this.y}`;
  }

  // Whenever any coordinate is set (via a constraint being applied), this method
  // must be called to try and see if we have enough information to figure out the
  // other coordinates on this axis.
  // e.g. once X and W are set, assuming the parent's width is available, then all
  // the other x-axis coordinates can be calculated.
  recalculate(axis: CoordAxis) {
    // Helper to check if something is null.
    function nn(v: number) {
      return v !== null;
    }

    // Returns the number of null elements of the specified list.
    function unspecified(coords: number[]) {
      let n = 0;
      for (const c of coords) {
        if (c === null) {
          n += 1;
        }
      }
      return n;
    }

    // If we change the number of unspecified coordinates (i.e. reduce them)
    // then also recalculate all child controls (which may have been waiting for
    // our width).
    let prevUnspecified = 0;
    let nowUnspecified = 0;

    if (axis === CoordAxis.X) {
      prevUnspecified = unspecified([this.x, this.w, this.x2, this.x2w, this.xw]);

      if (nn(this.x) && nn(this.w)) {
        this.xw = this.x + this.w;
        if (nn(this._parent.w)) {
          this.x2 = this._parent.w - this.x - this.w;
          this.x2w = this.x2 + this.w;
        }
      } else if (nn(this.x) && nn(this.x2)) {
        if (nn(this._parent.w)) {
          this.w = this._parent.w - this.x - this.x2;
          this.xw = this.x + this.w;
          this.x2w = this.x2 + this.w;
        }
      } else if (nn(this.x) && nn(this.xw)) {
        this.w = this.xw - this.x;
        if (nn(this._parent.w)) {
          this.x2 = this._parent.w - this.xw;
          this.x2w = this.x2 + this.w;
        }
      } else if (nn(this.x) && nn(this.x2w)) {
        // ignore.
      } else if (nn(this.w) && nn(this.x2)) {
        if (nn(this._parent.w)) {
          this.x = this._parent.w - this.w - this.x2;
          this.xw = this.x + this.w;
        }
        this.x2w = this.x2 + this.w;
      } else if (nn(this.w) && nn(this.xw)) {
        this.x = this.xw - this.w;
        if (nn(this._parent.w)) {
          this.x2 = this._parent.w - this.xw;
          this.x2w = this.x2 + this.w;
        }
      } else if (nn(this.w) && nn(this.x2w)) {
        this.x2 = this.x2w - this.w;
        if (nn(this._parent.w)) {
          this.x = this._parent.w - this.x2w;
          this.xw = this.x + this.w;
        }
      } else if (nn(this.x2) && nn(this.xw)) {
        // ignore.
      } else if (nn(this.x2) && nn(this.x2w)) {
        this.w = this.x2w - this.x2;
        if (nn(this._parent.w)) {
          this.x = this._parent.w - this.x2w;
          this.xw = this.x + this.w;
        }
      } else if (nn(this.xw) && nn(this.x2w)) {
        if (nn(this._parent.w)) {
          this.w = -(this._parent.w - this.xw - this.x2w);
          this.x = this.xw - this.w;
          this.x2 = this.x2w - this.w;
        }
      }

      nowUnspecified = unspecified([this.x, this.w, this.x2, this.x2w, this.xw]);
    } else if (axis === CoordAxis.Y) {
      prevUnspecified = unspecified([this.y, this.h, this.y2, this.y2h, this.yh]);

      if (nn(this.y) && nn(this.h)) {
        this.yh = this.y + this.h;
        if (nn(this._parent.h)) {
          this.y2 = this._parent.h - this.y - this.h;
          this.y2h = this.y2 + this.h;
        }
      } else if (nn(this.y) && nn(this.y2)) {
        if (nn(this._parent.h)) {
          this.h = this._parent.h - this.y - this.y2;
          this.yh = this.y + this.h;
          this.y2h = this.y2 + this.h;
        }
      } else if (nn(this.y) && nn(this.yh)) {
        this.h = this.yh - this.y;
        if (nn(this._parent.h)) {
          this.y2 = this._parent.h - this.yh;
          this.y2h = this.y2 + this.h;
        }
      } else if (nn(this.y) && nn(this.y2h)) {
        // ignore.
      } else if (nn(this.h) && nn(this.y2)) {
        if (nn(this._parent.h)) {
          this.y = this._parent.h - this.h - this.y2;
          this.yh = this.y + this.h;
        }
        this.y2h = this.y2 + this.h;
      } else if (nn(this.h) && nn(this.yh)) {
        this.y = this.yh - this.h;
        if (nn(this._parent.h)) {
          this.y2 = this._parent.h - this.yh;
          this.y2h = this.y2 + this.h;
        }
      } else if (nn(this.h) && nn(this.y2h)) {
        this.y2 = this.y2h - this.h;
        if (nn(this._parent.h)) {
          this.y = this._parent.h - this.y2h;
          this.yh = this.y + this.h;
        }
      } else if (nn(this.y2) && nn(this.yh)) {
        // ignore.
      } else if (nn(this.y2) && nn(this.y2h)) {
        this.h = this.y2h - this.y2;
        if (nn(this._parent.h)) {
          this.y = this._parent.h - this.y2h;
          this.yh = this.y + this.h;
        }
      } else if (nn(this.yh) && nn(this.y2h)) {
        if (nn(this._parent.h)) {
          this.h = -(this._parent.h - this.yh - this.y2h);
          this.y = this.yh - this.h;
          this.y2 = this.y2h - this.h;
        }
      }

      nowUnspecified = unspecified([this.y, this.h, this.y2, this.y2h, this.yh]);
    }

    // As described above, recalculate all children if we calculated something new about
    // this (parent) control.
    if (prevUnspecified !== nowUnspecified) {
      for (const c of this._controls) {
        c.recalculate(axis);
      }
    }
  }

  // Enables hit detection on this and ensure that ancestors can find it.
  // Either called when a control starts listening to mouse events
  // or if a control wants to "steal" mouse events (e.g. a modal dialog background).
  enableHitDetection() {
    this._enableHitDetection = true;

    this.enableChildHitDetectionOnParent();
  }

  // Let the parent know that it needs to be searched for (but not necessarily
  // participate in) hit detection.
  private enableChildHitDetectionOnParent() {
    let p = this._parent;
    while (p) {
      p._enableHitDetectionForChild = true;
      p = p._parent;
    }
  }

  // Recursively finds the most nested control at the specified coordinates.
  // x/y coordinates are relative to the control.
  controlAtPoint(x: number, y: number, opts?: ControlAtPointOpts): ControlAtPointData {
    opts = opts || {};
    opts.all = opts.all || this.designMode;
    opts.formX = (opts.formX === undefined) ? x : opts.formX;
    opts.formY = (opts.formY === undefined) ? y : opts.formY;
    opts.exclude = opts.exclude || [];

    if (opts.exclude.indexOf(this) >= 0) {
      return null;
    }

    // TODO: sort by z-order.

    // Search controls backwards (i.e. newer controls will be hit tested first).
    for (let i = this._controls.length - 1; i >= 0; --i) {
      const c = this._controls[i];
      const cx = x - c.x;
      const cy = y - c.y;
      if ((opts.all || c._enableHitDetection || c._enableHitDetectionForChild) && c.inside(cx, cy)) {
        const hit = c.controlAtPoint(cx, cy, opts);
        if (hit) {
          return hit;
        }
      }
    }

    if (opts.all || this._enableHitDetection) {
      return new ControlAtPointData(this, x, y, opts.formX, opts.formY);
    } else {
      return null;
    }
  }

  // Helper to see if the specified coordinates (relative to the control) are
  // actually inside the control.
  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get border() {
    return this._border;
  }

  set border(value: boolean) {
    this._border = value;
    this.repaint();
  }

  get opacity() {
    return this._opacity;
  }

  set opacity(value: number) {
    this._opacity = Math.max(0, Math.min(1, value));
    this.repaint();
  }

  // Notify this control that it is being used in a constraint.
  refConstraint(constraint: Constraint, axis: CoordAxis) {
    if (axis === CoordAxis.X) {
      this.refConstraintsX.push(constraint);
    } else if (axis === CoordAxis.Y) {
      this.refConstraintsY.push(constraint);
    }
  }

  // Notify this control that it is no longer being used by a constraint.
  unrefConstraint(constraint: Constraint, axis: CoordAxis) {
    if (axis === CoordAxis.X) {
      const i = this.refConstraintsX.indexOf(constraint);
      if (i < 0) {
        throw new Error('Unable to unref constraint.');
      }
      this.refConstraintsX.splice(i, 1);
    } else if (axis === CoordAxis.Y) {
      const i = this.refConstraintsY.indexOf(constraint);
      if (i < 0) {
        throw new Error('Unable to unref constraint.');
      }
      this.refConstraintsY.splice(i, 1);
    }
  }

  addConstraint(constraint: Constraint) {
    this._childConstraints.push(constraint);
  }

  removeConstraint(constraint: Constraint) {
    for (let i = 0; i < this._childConstraints.length; ++i) {
      if (this._childConstraints[i] === constraint) {
        this._childConstraints.splice(i, 1);
        this.relayout();
        return;
      }
    }
  }

  // Layout:
  // Controls can:
  //  - be fully specified by (StaticConstraint / AlignConstraint / self).
  //  - additionally require the parent's size (StaticConstraint for x2[w] / y2[h]).
  //  - use their children's max bounds (ContentConstraint)
  //  - have a default size (set when all other constraints are applied).
  //
  // The layout algorithm is:
  //  - Reset all layout information for all controls.
  //  - Apply self constraints on all controls.
  //  - Collect up all constraints and apply them in order.
  //    - At any point if a control has no remaining constraints, then apply default values for x/y/w/  //  - If at least two coordinates are specified for a given axis and the parent's width(/height) are available, then calculate all other coordinates.
  //  - Move all constraints that failed to apply to the end of the ordered list of constraints and
  //    keep applying them until no progress is made.
  //  - Check if all constraints are happy that they got the desired result. If so, stop.

  // When all (if any) constraints for a given axis are applied to a control, then
  // we know that no more layout information is coming. So if we don't have at least
  // an `x` (or `y`) and a `w` (or `h`), then set the default values.
  // This is useful for two reasons:
  //  - Sometimes it's just useful to not worry about setting a width/height for a control
  //    and they should just use the form defaults.
  //  - We can't render the form unless everything has coordinates.
  private applyDefaultLayout(axis: CoordAxis) {
    if (axis === CoordAxis.X) {
      if (this.w === null) {
        this.w = this.form.defaultWidth;
        this.recalculate(CoordAxis.X);
      }
      if (this.x === null) {
        this.x = 10;
        this.recalculate(CoordAxis.X);
      }
    } else if (axis === CoordAxis.Y) {
      if (this.h === null) {
        this.h = this.form.defaultHeight;
        this.recalculate(CoordAxis.Y);
      }
      if (this.y === null) {
        this.y = 10;
        this.recalculate(CoordAxis.Y);
      }
    }
  }

  // Returns the number of unapplied constraints that this control is referenced by
  // from the specified axis.
  private outstandingConstraints(axis: CoordAxis) {
    if (axis === CoordAxis.X) {
      return this.refConstraintsX.length - this.constraintsAppliedX;
    } else if (axis === CoordAxis.Y) {
      return this.refConstraintsY.length - this.constraintsAppliedY;
    } else {
      return 0;
    }
  }

  // Notify the control that a constraint has been applied on the specified axis.
  // It's important that constraints don't double count (or if they do, then the constraint
  // must have been referneced twice).
  constraintApplied(axis: CoordAxis) {
    if (axis === CoordAxis.X) {
      this.constraintsAppliedX += 1;
    } else if (axis === CoordAxis.Y) {
      this.constraintsAppliedY += 1;
    }

    // Check if there's no remaining constraints and apply defaults if necessary.
    if (this.outstandingConstraints(axis) === 0) {
      this.applyDefaultLayout(axis);
    }
  }

  // Recursively reset all layout state for the control and children, ready to start
  // having constraints applied.
  // This is necessary because we need to track the order that coordinates are applied
  // so that we know which ones to calculate.
  protected resetLayout() {
    this.x = null;
    this.y = null;
    this.w = null;
    this.h = null;
    this.x2 = null;
    this.y2 = null;
    this.xw = null;
    this.yh = null;
    this.x2w = null;
    this.y2h = null;
    this.constraintsAppliedX = 0;
    this.constraintsAppliedY = 0;

    // Recursively reset state for all child controls.
    for (const control of this._controls) {
      control.resetLayout();
    }

    // For controls that can automatically figure out their own coordinates
    // (i.e. label sets its own width and height) then apply that.
    if (this.selfConstrain()) {
      this.recalculate(CoordAxis.X);
      this.recalculate(CoordAxis.Y);
    }

    // If the control has no constraints on a given axis, then automatically give
    // it default layout. (applyDefaultLayout ill not override anything set in selfConstrain).
    if (this.refConstraintsX.length === 0) {
      this.applyDefaultLayout(CoordAxis.X);
    }
    if (this.refConstraintsY.length === 0) {
      this.applyDefaultLayout(CoordAxis.Y);
    }
  }

  // Recursively find all constraints in the form.
  // TODO: Consider just having the Form manage the global list of constraints.
  protected findConstraints(pending: Constraint[]) {
    for (const c of this._childConstraints) {
      pending.push(c);
    }
    for (const c of this._controls) {
      c.findConstraints(pending);
    }
  }

  // Override this if you wnat to get notified when layout is complete.
  // e.g. ScrollBox recaulates scroll coordinates.
  // Must call super.
  protected layoutComplete() {
    const b = [this.x, this.y, this.w, this.h, this.x2, this.y2, this.x2w, this.y2h, this.xw, this.yh];
    for (const bb of b) {
      if (bb === null) {
        throw new Error('Control was not fully specified after layout.');
      }
    }
    for (const control of this._controls) {
      control.layoutComplete();
    }
  }

  // Try one iteration of the layout algorithm.
  // If there are no fill constraints then this should succeed, assuming a total ordering
  // of constraints can be found.
  private layoutAttempt(round: number): boolean {
    // Recursively reset all controls in this form.
    // Note we don't want to reset this control, because we rely on it knowing its width/height.
    // (In most cases, this is
    for (const control of this._controls) {
      control.resetLayout();
    }

    // Used to set an ordinal for succesfully applied constraints.
    let i = 0;

    // Find and sort constraints (using the order that worked last time).
    let constraints: Constraint[] = [];
    this.findConstraints(constraints);
    constraints.sort((a, b) => a.order - b.order);

    // Keep applying constraints and moving failed ones to the end of the queue.
    // Stop when we stop making progress.
    let pending = constraints;
    while (pending.length > 0) {
      let next = [];
      for (const c of pending) {
        if (c.apply()) {
          c.order = i;
          ++i;
        } else {
          next.push(c);
        }
      }
      if (next.length === pending.length) {
        throw new Error('Unable to apply remaining constraints.');
      }
      pending = next;
    }

    // Check if all constraints have converged (only fill constraints can fail this).
    // If they all have, then we're done. Otherwise, go another iteration.
    // Any constraints that aren't done will get moved to the end of the queue
    // so they get applied last next round.
    let done = true;
    for (const c of constraints) {
      if (!c.done(round)) {
        c.order = i;
        ++i;
        done = false;
      }
    }
    if (!done) {
      return false;
    }

    // Notify controls that they've been laid out.
    this.layoutComplete();

    return true;
  }

  // Applies all constraints to direct children of this control.
  // Don't call this directly -- call `relayout` instead.
  protected layout() {
    // Constraints are applied until they converge.
    // If there are no fill constraints, they will all solve on the first iteration of this loop.
    // The fill constraints converge on a solution by redistributing remaining space each iteration.
    // Note: this whole approach could be dramatically improved by solving a total ordering
    // for constraints, and having (e.g.) fill constraints know how to calculate the available
    // space from the other constraints applied to the controls. But:
    // - this approach is quite easy to implement and understand
    // - once it's run once, the fill constraints cache their totals
    // - the number of iterations is proportional to the number of _nested_ fill constraints
    //   which should be fairly rare.

    // Arbritrarily cap at 20 iterations.
    for (let i = 0; ; ++i) {
      if (i === 20) {
        throw new Error('Unable to solve constraints after ' + i + ' iterations.');
      }
      if (this.layoutAttempt(i)) {
        if (i >= 2) {
          console.warn('Warning: Layout took ' + (i + 1) + ' rounds.');
        }
        break;
      }
    }
  }

  // Override to allow this control to set its own coordinates (as if it were driving
  // its own static constraints).
  // The most common example would be of a control that can automatically size itself,
  // e.g. a Label that sizes to its text.
  protected selfConstrain(): boolean {
    return false;
  }

  // Allows a control to choose not to paint a child.
  // e.g. ScrollBox doesn't paint children that would be clipped.
  protected shouldPaint(child: Control) {
    return true;
  }

  // When skipping painting a control (based on `shouldPaint` returning false), then
  // the control will have `unpaint()` called instead. This is mostly used by controls
  // that need to clean up any non-Canvas paint state (e.g. HTML elements).
  protected unpaint() {
  }

  // Override this (and always call `super.paint()`) to customise appearance of child controls.
  protected paint(ctx: CanvasRenderingContext2D) {
    this.paintBackground(ctx);

    // This base implementation just makes sure all children are painted too.
    for (const c of this._controls) {
      // Controls can decide not to paint their children (i.e. scrollbox won't paint
      // controls that are invisible).
      if (!this.shouldPaint(c)) {
        c.unpaint();
        continue;
      }

      ctx.save();

      // Not we offset the context so that all drawing operations are relative to the control.
      ctx.translate(c.x, c.y);

      if (c.clip) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(c.w, 0);
        ctx.lineTo(c.w, c.h);
        ctx.lineTo(0, c.h);
        ctx.closePath();
        ctx.clip();
      }

      ctx.globalAlpha *= c.opacity;
      c.paint(ctx);
      ctx.globalAlpha /= c.opacity;

      ctx.restore();
    }

    if (this.designMode) {
      for (const c of this._controls) {
        if (!this.shouldPaint(c)) {
          continue;
        }

        if (c.focused) {
          for (const cx of c.refConstraintsX) {
            ctx.save();
            cx.paint(ctx);
            ctx.restore();
          }
          for (const cx of c.refConstraintsY) {
            ctx.save();
            cx.paint(ctx);
            ctx.restore();
          }
        }
      }
    }

    // Draw all constraints.
    // for (const c of this._childConstraints) {
    //   ctx.save();
    //   c.paint(ctx);
    //   ctx.restore();
    // }

    // Paint decorations (e.g. border, focus) on top of any existing paint.
    this.paintDecorations(ctx);
  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    // Controls are transparent by default.
  }

  // Override this separately to customise the basic decorations (border, focus, etc).
  protected paintDecorations(ctx: CanvasRenderingContext2D) {
    if (this.border) {
      this.paintBorder(ctx);
    }

    // TODO: focus
  }

  protected paintBorder(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    // Left/Top
    ctx.beginPath();
    ctx.moveTo(0, this.h);
    ctx.lineTo(0, 0);
    ctx.lineTo(this.w, 0);
    if (this.dropTarget) {
      ctx.strokeStyle = this.form.style.color.hovered;
    } else {
      ctx.strokeStyle = this.form.style.color.insetLeft;
    }
    ctx.stroke();

    // Right/Bottom
    ctx.beginPath();
    ctx.moveTo(this.w, 0);
    ctx.lineTo(this.w, this.h);
    ctx.lineTo(0, this.h);
    if (this.dropTarget) {
      ctx.strokeStyle = this.form.style.color.hovered;
    } else {
      ctx.strokeStyle = this.form.style.color.insetRight;
    }
    ctx.stroke();
  }

  // Adds a child control, optionally with the specified static coordinates (which will be
  // converted into static constraints)..
  // Any of the coordinates can be null/undefined to ignore.
  // An object of { coord name: value } can be passed instead of `x` as a simpler way when not
  // just passing x/y/w/h.
  // e.g. `parent.add(child, { x: 20, x2: 20 });` instead of `parent.add(child, 20, null, null, null, 20, null);`.
  add<T extends Control>(control: T, x?: number | AddCoords, y?: number, w?: number, h?: number, x2?: number, y2?: number, xw?: number, yh?: number, x2w?: number, y2h?: number): T {
    if (x && typeof x === 'object') {
      return this.add(control, x.x, x.y, x.w, x.h, x.x2, x.y2, x.xw, x.yh, x.x2w, x.y2h);
    }

    control._parent = this;
    this._controls.push(control);

    // These will be nops if the coordinates are null.
    control.coords.x.set(x as number);
    control.coords.y.set(y);
    control.coords.w.set(w);
    control.coords.h.set(h);
    control.coords.x2.set(x2);
    control.coords.y2.set(y2);
    control.coords.xw.set(xw);
    control.coords.yh.set(yh);
    control.coords.x2w.set(x2w);
    control.coords.y2h.set(y2h);

    // If a control needs hit detection, then every ancestor does too.
    if (control._enableHitDetection || control._enableHitDetectionForChild) {
      control.enableChildHitDetectionOnParent();
    }

    // If our parent exists on a form:
    if (this.form) {
      // Tell the control it now has a parent.
      control.added();

      // Asynchronously relayout (and repaint) the form.
      this.relayout();
    }
    //... otherwise this will happen when our parent gets added.

    // Return the control so you can write, e.g. `let l = f.add(new Label());`
    return control;
  }

  // Override this in a subclass to get notified when added to a parent.
  protected added() {
    // Notfy any of our existing controls that we are now on a form.
    for (const control of this.controls) {
      control.added();
    }
    this.defaultConstraints();
  }

  // Override this to add automatic constraints.
  protected defaultConstraints() {
  }

  // Remove this control from its parent.
  remove() {
    // First remove any of its own children.
    this.clear();

    // Then notify any of the constraints that it's referenced by that the control
    // is being removed (note: this may cause the constraint to be destroyed too).
    for (const c of this.refConstraintsX.slice()) {
      c.removeControl(this);
    }
    for (const c of this.refConstraintsY.slice()) {
      c.removeControl(this);
    }

    // Sanity check for the above.
    if (this.refConstraintsX.length > 0 || this.refConstraintsY.length > 0) {
      throw new Error('Control still referenced by constraints.');
    }

    // Remove it from the parent.
    if (this._parent) {
      for (let i = 0; i < this._parent.controls.length; ++i) {
        if (this._parent.controls[i] === this) {
          this._parent.controls.splice(i, 1);
          break;
        }
      }

      // Let the control know it was removed.
      this.removed();

      this._parent = null;
    }
  }

  // Override this in a subclass to get notified when removed from a parent.
  protected removed() {
  }

  // Remove all children from this control.
  clear() {
    while (this._controls.length > 0) {
      this._controls[0].remove();
    }

    if (this._childConstraints.length > 0) {
      throw new Error('There were still constraints left after removing all controls.');
    }
  }

  // Call this to cause at least this and all controls inside it to repaint.
  // Don't rely on this to repaint the entire form, where possible it will avoid causing the
  // entire form to repaint.
  repaint() {
    // But at the moment we have no such optimisations, so keep searching up the
    // hierarchy for something that knows how to repaint.
    if (this._parent) {
      this._parent.repaint();
    }
  }

  // Call this to cause at least this and all controls inside it to relayout.
  relayout() {
    if (this._parent) {
      this._parent.relayout();
    }
  }

  // Returns true if this control is in edit mode (either directly or via a parent).
  get designMode(): boolean {
    if (this._parent) {
      return this._parent.designMode;
    } else {
      return false;
    }
  }

  // Returns the form that owns this control.
  get form(): Form {
    if (this._parent) {
      return this._parent.form;
    } else {
      return null;
    }
  }

  // Gets the x coordinate of this control relative to the form.
  // TODO: make this a property??
  get formX(): number {
    if (this._parent) {
      return this.x + this._parent.formX;
    } else {
      return this.x;
    }
  }

  // Gets the y coordinate of this control relative to the form.
  get formY(): number {
    if (this._parent) {
      return this.y + this._parent.formY;
    } else {
      return this.y;
    }
  }

  // When the form detects a scroll on this control, it calls this.
  scrollBy(dx: number, dy: number): boolean {
    return false;
  }

  // Proxy property to enable `myControl.coords.x`.
  get coords() {
    return new ControlCoords(this);
  }

  // Override this to get notifid that a textbox (or other controls)
  // want the form (or dialog) to be submitted (e.g. the return key was pressed),
  submit() {
    if (this._parent) {
      this._parent.submit();
    }
  }

  // Override this to enable this control as a drop target.
  // (Optionally based on what the drag data is).
  allowDrop(data: any): boolean {
    return null;
  }

  // Override this to be notified when something is dropped on this control.
  // This will only be called if `allowDrop()` returned true.
  drop(data: any) {
  }

  protected async contextMenu(): Promise<MenuItems> {
    return null;
  }

  get controls() {
    return this._controls;
  }

  get parent() {
    return this._parent;
  }
}
