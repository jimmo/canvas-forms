import { Event } from 'events';
import { CoordAxis, CoordType, Coord } from 'enums';
import { Constraint } from '../constraints/constraint';
import { StaticConstraint } from '../constraints/static';

// Base class for events raised from controls.
export class ControlEventData {
  constructor(readonly control: Control) {
  }
}

// Structure to represent a successful hit test.
export class ControlAtPointData {
  // These coordinates are relative to the control.
  constructor(readonly control: Control, readonly x: number, readonly y: number) {
  }
}

// Base control class - represents a control on a form.
// Do not instantiate directly.
export class Control {
  controls: Control[];
  childConstraints: Constraint[];
  refConstraints: Constraint[];
  parent: Control;
  private _enableHitDetection: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  x2: number;
  y2: number;
  xw: number;
  yh: number;
  x2w: number;
  y2h: number;

  clip: boolean;
  scrollable: boolean;
  focused: boolean;

  fontSize: number;
  fontName: string;
  color: string;

  mousedown: Event;
  mouseup: Event;
  mousemove: Event;

  constructor() {
    // Child controls.
    this.controls = [];
    // Constraints applied to children.
    this.childConstraints = [];
    // Constraints that use this control.
    this.refConstraints = [];

    // Parent control (set automatically in add()).
    // Will be null for the root (Form) control.
    this.parent = null;

    // Whether to include this control in hit detection.
    // Only enabled for controls that need hit detection and their ancestors.
    // Disabled by default so that hit detection is as cheap as possible and only
    // has to search controls that might care.
    this._enableHitDetection = false;

    // Read-only coordinates for this control.
    // Set by the `layout` process from the various constraints.
    // Regardless of which coordinates the constraints set, once
    // any two on the same axis are set, then all the others will
    // be calculated automatically.
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

    // Enable paint clipping for the bounds of this control.
    // TODO: maybe true should be the default and it needs to be explicitly disabled.
    // But there might be a perf cost?
    this.clip = false;
    this.scrollable = false;

    // Is the mouse currently over this control.
    this.focused = false;

    // Default font and color used by many controls (e.g. Label, Button, Checkbox, etc).
    this.fontSize = null;
    this.fontName = null;
    this.color = null;

    // When the surface detects a mouse event on this control, it will fire
    // these events. Use the `addCallback` to only enable hit detection if
    // something is actually listening to these events.
    this.mousedown = new Event(() => {
      this.enableHitDetection();
    });
    this.mouseup = new Event(() => {
      this.enableHitDetection();
    });
    this.mousemove = new Event(() => {
      this.enableHitDetection();
    });
  }

  // Whenever any coordinate is set (via a constraint being applied), try
  // and see if we have enough information to figure out the others.
  recalculate(axis: CoordAxis) {
    function nn(v: number) {
      return v !== null;
    }

    if (axis === CoordAxis.X) {
      if (nn(this.x) && nn(this.w)) {
        this.x2 = this.parent.w - this.x - this.w;
        this.xw = this.x + this.w;
        this.x2w = this.x2 + this.w;
      } else if (nn(this.x) && nn(this.x2)) {
        this.w = this.parent.w - this.x - this.x2;
        this.xw = this.x + this.w;
        this.x2w = this.x2 + this.w;
      } else if (nn(this.x) && nn(this.xw)) {
        this.w = this.xw - this.x;
        this.x2 = this.parent.w - this.xw;
        this.x2w = this.x2 + this.w;
      } else if (nn(this.x) && nn(this.x2w)) {
        // ignore.
      } else if (nn(this.w) && nn(this.x2)) {
        this.x = this.parent.w - this.w - this.x2;
        this.xw = this.x + this.w;
        this.x2w = this.x2 + this.w;
      } else if (nn(this.w) && nn(this.xw)) {
        this.x = this.xw - this.w;
        this.x2 = this.parent.w - this.xw;
        this.x2w = this.x2 + this.w;
      } else if (nn(this.w) && nn(this.x2w)) {
        this.x2 = this.x2w - this.w;
        this.x = this.parent.w - this.x2w;
        this.xw = this.x + this.w;
      } else if (nn(this.x2) && nn(this.xw)) {
        // ignore.
      } else if (nn(this.x2) && nn(this.x2w)) {
        this.w = this.x2w - this.x2;
        this.x = this.parent.w - this.x2w;
        this.xw = this.x + this.w;
      } else if (nn(this.xw) && nn(this.x2w)) {
        this.w = -(this.parent.w - this.xw - this.x2w);
        this.x = this.xw - this.w;
        this.x2 = this.x2w - this.w;
      }
    } else if (axis === CoordAxis.Y) {
      if (nn(this.y) && nn(this.h)) {
        this.y2 = this.parent.h - this.y - this.h;
        this.yh = this.y + this.h;
        this.y2h = this.y2 + this.h;
      } else if (nn(this.y) && nn(this.y2)) {
        this.h = this.parent.h - this.y - this.y2;
        this.yh = this.y + this.h;
        this.y2h = this.y2 + this.h;
      } else if (nn(this.y) && nn(this.yh)) {
        this.h = this.yh - this.y;
        this.y2 = this.parent.h - this.yh;
        this.y2h = this.y2 + this.h;
      } else if (nn(this.y) && nn(this.y2h)) {
        // ignore.
      } else if (nn(this.h) && nn(this.y2)) {
        this.y = this.parent.h - this.h - this.y2;
        this.yh = this.y + this.h;
        this.y2h = this.y2 + this.h;
      } else if (nn(this.h) && nn(this.yh)) {
        this.y = this.yh - this.h;
        this.y2 = this.parent.h - this.yh;
        this.y2h = this.y2 + this.h;
      } else if (nn(this.h) && nn(this.y2h)) {
        this.y2 = this.y2h - this.h;
        this.y = this.parent.h - this.y2h;
        this.yh = this.y + this.h;
      } else if (nn(this.y2) && nn(this.yh)) {
        // ignore.
      } else if (nn(this.y2) && nn(this.y2h)) {
        this.h = this.y2h - this.y2;
        this.y = this.parent.h - this.y2h;
        this.yh = this.y + this.h;
      } else if (nn(this.yh) && nn(this.y2h)) {
        this.h = -(this.parent.h - this.yh - this.y2h);
        this.y = this.yh - this.h;
        this.y2 = this.y2h - this.h;
      }
    }
  }

  // Enables hit detection on this and all ancestors.
  enableHitDetection() {
    this._enableHitDetection = true;
    if (this.parent) {
      this.parent.enableHitDetection();
    }
  }

  // Recursively finds the most nested control at the specified coordinates.
  // Coordinates are relative to the control.
  controlAtPoint(x: number, y: number): ControlAtPointData {
    // TODO: sort by z-order.
    const editing = this.editing();

    for (let i = this.controls.length - 1; i >= 0; --i) {
      const c = this.controls[i];
      if ((editing || c._enableHitDetection) && x >= c.x && y >= c.y && x < c.x + c.w && y < c.y + c.h) {
        return c.controlAtPoint(x - c.x, y - c.y);
      }
    }

    return new ControlAtPointData(this, x, y);
  }

  // Applies all constraints to direct children of this control.
  // Don't call this directly -- call `relayout` instead.
  layout() {
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
      if (i == 20) {
        throw new Error('Unable to solve constraints after ' + i + ' iterations.');
      }

      // Start by resetting all controls to remove all layout.
      for (const c of this.controls) {
        c.x = null;
        c.y = null;
        c.w = null;
        c.h = null;
        c.x2 = null;
        c.y2 = null;
        c.xw = null;
        c.yh = null;
        c.x2w = null;
        c.y2h = null;

        // For controls that can automatically figure out their own coordinates
        // (i.e. size to content) then apply that.
        c.selfConstrain();
      }

      // Attempt to apply each constraint in order.
      // If it fails, that means it depeneded on a constraint that hasn't been applied yet,
      // so move it to the end of the list (to be tried again).
      // Constraints must not modify their controls if they do not successfully apply.
      // At the end of this, update `this.childConstraints` with the new re-ordered list.
      // Hopefully this means that next time `layout` is called, we're in the right order
      // and all constraints should apply first go.
      const applied = [];
      let pending = this.childConstraints;
      while (pending.length > 0) {
        const next = [];
        for (const c of pending) {
          if (c.apply()) {
            applied.push(c);
          } else {
            next.push(c);
          }
        }
        if (next.length === pending.length) {
          throw new Error('Unable to apply remaining constraints.');
        }
        pending = next;
      }
      this.childConstraints = applied;

      // Check if all constraints have converged (only fill constraints can fail this).
      // If they all have, then we're done. Otherwise, go another iteration.
      let done = true;
      for (const c of this.childConstraints) {
        if (!c.done(i)) {
          done = false;
        }
      }
      if (done) {
        if (i >= 2) {
          console.warn('Warning: Layout took ' + (i + 1) + ' rounds.');
        }
        break;
      }
    }

    // Now that all the controls are themselves positioned, layout their children.
    let yy = 10;
    let xx = 10;
    for (const c of this.controls) {
      // Ensure each control is positioned somewhere.
      if (c.x === null) {
        c.x = xx;
        c.recalculate(CoordAxis.X);
        xx = Math.min(xx + 20, Math.max(xx, c.x) + 20);
      }
      if (c.y === null) {
        c.y = yy;
        c.recalculate(CoordAxis.Y);
        yy = Math.min(yy + 20, Math.max(yy, c.y) + 20);
      }
      if (c.w === null) {
        c.w = 100;
        c.recalculate(CoordAxis.X);
        xx = Math.min(xx + 20, Math.max(xx, c.x) + 20);
      }
      if (c.h === null) {
        c.h = 26;
        c.recalculate(CoordAxis.Y);
        yy = Math.min(yy + 20, Math.max(yy, c.y) + 20);
      }

      c.layout();
    }
  }

  selfConstrain() {
  }

  shouldPaint(control: Control) {
    return true;
  }

  // Override this (and always call `super.paint()`) to customise appearance of child controls.
  paint(ctx: CanvasRenderingContext2D) {
    // This base implementation just makes sure all children are painted too.
    for (const c of this.controls) {
      if (!this.shouldPaint(c)) {
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

      c.paint(ctx);

      ctx.restore();
    }

    if (this.editing()) {
      for (const c of this.controls) {
        if (!this.shouldPaint(c)) {
          continue;
        }

        if (c.focused) {
          for (const cx of c.refConstraints) {
            ctx.save();
            cx.paint(ctx);
            ctx.restore();
          }
        }
      }
    }

    // Draw all constraints.
    // for (const c of this.childConstraints) {
    //   ctx.save();
    //   c.paint(ctx);
    //   ctx.restore();
    // }
  }

  // Adds a child control, optionally with the specified static coordinates.
  // Any of the coordinates can be null/undefined to ignore.
  add(control: Control, x: number, y: number, w: number, h: number, x2: number, y2: number) {
    const a = (b: number) => {
      return b !== undefined && b !== null;
    }

    control.parent = this;
    this.controls.push(control);

    // TODO: consider making StaticConstraint able to store multiple coordinates?

    if (a(x)) {
      new StaticConstraint(control, Coord.X, x);
    }
    if (a(y)) {
      new StaticConstraint(control, Coord.Y, y);
    }
    if (a(w)) {
      new StaticConstraint(control, Coord.W, w);
    }
    if (a(h)) {
      new StaticConstraint(control, Coord.H, h);
    }
    if (a(x2)) {
      new StaticConstraint(control, Coord.X2, x2);
    }
    if (a(y2)) {
      new StaticConstraint(control, Coord.Y2, y2);
    }

    // Tell the control it now has a parent.
    control.added();

    // Asynchronously relayout (and repaint) the form.
    this.relayout();

    // Return the control so you can write, e.g. `let l = f.add(new Label());`
    return control;
  }

  // Override this in a subclass to get notified when added to a parent.
  added() {
  }

  // Remove this control from its parent.
  remove() {
    this.clear();

    for (const c of this.refConstraints.slice()) {
      c.removeControl(this);
    }

    if (this.refConstraints.length > 0) {
      throw new Error('Control still referenced by constraints.');
    }

    if (this.parent) {
      for (let i = 0; i < this.parent.controls.length; ++i) {
        if (this.parent.controls[i] === this) {
          this.parent.controls.splice(i, 1);
          break;
        }
      }
    }

    this.removed();
  }

  // Override this in a subclass to get notified when removed from a parent.
  removed() {
  }

  // Remove all children from this control.
  clear() {
    while (this.controls.length > 0) {
      this.controls[0].remove();
    }

    if (this.childConstraints.length > 0) {
      throw new Error('There were still constraints left after removing all controls.');
    }
  }

  // Returns a font that can be used by the context.
  getFont() {
    return this.getFontSize() + 'px ' + this.getFontName();
  }

  // Returns the font size in pixels.
  getFontSize(): number {
    return this.fontSize || this.parent.getFontSize();
  }

  // Returns the font name only.
  getFontName(): string {
    return this.fontName || this.parent.getFontName();
  }

  // Returns the default foreground color for this control.
  getColor(): string {
    return this.color || this.parent.getColor();
  }

  // Call this to cause at least this and all controls inside it to repaint.
  // Don't rely on this to repaint the entire form, where possible it will avoid causing the
  // entire form to repaint.
  repaint() {
    // But at the moment we have no such optimisations, so keep searching up the
    // hierarchy for something that knows how to repaint.
    if (this.parent) {
      this.parent.repaint();
    }
  }

  // Call this to cause at least this and all controls inside it to relayout.
  relayout() {
    if (this.parent) {
      this.parent.relayout();
    }
  }

  // Recursively finds the drawing context from the `Form` that contains this control.
  context(): CanvasRenderingContext2D {
    if (this.parent) {
      return this.parent.context();
    }
  }

  editing(): boolean {
    if (this.parent) {
      return this.parent.editing();
    }
  }

  // Gets the x coordinate of this control relative to the surface.
  surfaceX() {
    let x = this.x;
    let p = this.parent;
    while (p) {
      x += p.x;
      p = p.parent;
    }
    return x;
  }

  // Gets the y coordinate of this control relative to the surface.
  surfaceY() {
    let y = this.y;
    let p = this.parent;
    while (p) {
      y += p.y;
      p = p.parent;
    }
    return y;
  }

  scrollBy(dx: number, dy: number) {
  }
}
