import { CoordAxis, CoordData, Coord } from './enums';
import { Event } from './events';
import { Form } from './form';
import { Constraint } from '../constraints/constraint';
import { AlignConstraint } from '../constraints/align';
import { StaticConstraint } from '../constraints/static';
import { FillConstraint } from '../constraints/fill';


// Base class for events raised from controls.
export class ControlEventData {
  constructor(readonly control: Control) {
  }
}

// Structure to represent a successful hit test.
export class ControlAtPointData {
  // These coordinates are relative to the control.
  x: number;
  y: number;
  formX: number;
  formY: number;
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

  update(formX: number, formY: number) {
    this.x += formX - this.formX;
    this.y += formY - this.formY;
    this.formX = formX;
    this.formY = formY;
  }
}

class ControlCoord {
  constructor(readonly control: Control, readonly coord: CoordData) {
  }

  align(other: ControlCoord, offset?: number) {
    return new AlignConstraint(this.control, this.coord, other.control, other.coord, offset);
  }

  set(v: number) {
    if (v === null || v === undefined) {
      return null;
    }
    return new StaticConstraint(this.control, this.coord, v);
  }
}

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
  size(w: number, h: number) {
    this.w.set(w);
    this.h.set(h);
  }
  center(axis: CoordAxis, wh?: number) {
    const s1 = new Control();
    const s2 = new Control();
    this.control.parent.add(s1);
    this.control.parent.add(s2);
    if (axis === CoordAxis.X) {
      s1.coords.x.set(0);
      s2.coords.x2.set(0);
      this.x.align(s1.coords.xw);
      this.xw.align(s2.coords.x);
      new FillConstraint([s1, s2], Coord.W);
      if (wh !== undefined) {
        this.w.set(wh);
      }
    } else if (axis === CoordAxis.Y) {
      s1.coords.y.set(0);
      s2.coords.y2.set(0);
      this.y.align(s1.coords.yh);
      this.yh.align(s2.coords.y);
      new FillConstraint([s1, s2], Coord.H);
      if (wh !== undefined) {
        this.h.set(wh);
      }
    }
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
  protected layoutComplete: boolean = false;

  protected clip: boolean;
  focused: boolean;

  fontSize: number;
  fontName: string;
  color: string;
  border: boolean = false;

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
    // TODO: Consider aggregating these under a 'layout' member,
    // i.e. c.layout.x instead of c.x.
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
    this.clip = true;

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
  controlAtPoint(x: number, y: number, formX?: number, formY?: number): ControlAtPointData {
    formX = (formX === undefined) ? x : formX;
    formY = (formY === undefined) ? y : formY;

    // TODO: sort by z-order.
    const editing = this.editing();

    for (let i = this.controls.length - 1; i >= 0; --i) {
      const c = this.controls[i];
      const cx = x - c.x;
      const cy = y - c.y;
      if ((editing || c._enableHitDetection) && c.inside(cx, cy)) {
        return c.controlAtPoint(cx, cy, formX, formY);
      }
    }

    return new ControlAtPointData(this, x, y, formX, formY);
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  // Applies all constraints to direct children of this control.
  // Don't call this directly -- call `relayout` instead.
  layout() {
    if (this.layoutComplete) {
      return;
    }

    // First give it a size if it doesn't have one, and can't calculate from its children.
    if (this.w === null && this.controls.length === 0) {
      this.w = this.form().defaultWidth();
      this.recalculate(CoordAxis.X);
    }
    if (this.h === null && this.controls.length === 0) {
      this.h = this.form().defaultHeight();
      this.recalculate(CoordAxis.Y);
    }

    // Ensure each control is positioned somewhere.
    if (this.x === null) {
      this.x = 10;
      this.recalculate(CoordAxis.X);
    }
    if (this.y === null) {
      this.y = 10;
      this.recalculate(CoordAxis.Y);
    }

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
        c.layoutComplete = false;

        // For controls that can automatically figure out their own coordinates
        // (i.e. label sets its own width and height) then apply that.
        if (c.selfConstrain()) {
          c.recalculate(CoordAxis.X);
          c.recalculate(CoordAxis.Y);
        }
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
          let unstuck = false;
          for (const c of pending) {
            unstuck = unstuck || c.unstick();
          }
          if (!unstuck) {
            throw new Error('Unable to apply remaining constraints.');
          }
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

    // Now that all the controls have constraints applied, recursively layout their children.
    for (const c of this.controls) {
      c.layout();
    }

    // If it still doesn't have a size, then fit to its children.
    if (!this.w && this.controls.length > 0) {
      for (const cc of this.controls) {
        this.w = Math.max(this.w, cc.xw);
      }
      this.recalculate(CoordAxis.X);
    }
    if (!this.h && this.controls.length > 0) {
      for (const cc of this.controls) {
        this.h = Math.max(this.h, cc.yh);
      }
      this.recalculate(CoordAxis.Y);
    }

    this.layoutComplete = true;
  }

  selfConstrain(): boolean {
    return false;
  }

  shouldPaint(control: Control) {
    return true;
  }

  unpaint() {
  }

  // Override this (and always call `super.paint()`) to customise appearance of child controls.
  paint(ctx: CanvasRenderingContext2D) {
    // This base implementation just makes sure all children are painted too.
    for (const c of this.controls) {
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

    this.paintDecorations(ctx);
  }

  paintDecorations(ctx: CanvasRenderingContext2D) {
    if (this.border) {
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';

      // Left/Top
      ctx.beginPath();
      ctx.moveTo(0, this.h);
      ctx.lineTo(0, 0);
      ctx.lineTo(this.w, 0);
      ctx.strokeStyle = '#202020';
      ctx.stroke();

      // Right/Bottom
      ctx.beginPath();
      ctx.moveTo(this.w, 0);
      ctx.lineTo(this.w, this.h);
      ctx.lineTo(0, this.h);
      ctx.strokeStyle = '#707070';
      ctx.stroke();
    }
  }

  // Adds a child control, optionally with the specified static coordinates.
  // Any of the coordinates can be null/undefined to ignore.
  add<T extends Control>(control: T, x?: number | any, y?: number, w?: number, h?: number, x2?: number, y2?: number, xw?: number, yh?: number, x2w?: number, y2h?: number): T {
    if (x && typeof x === 'object') {
      return this.add(control, x['x'], x['y'], x['w'], x['h'], x['x2'], x['y2'], x['xw'], x['yh'], x['x2w'], x['y2w']);
    }

    const a = (b: number) => {
      return b !== undefined && b !== null;
    }

    control.parent = this;
    this.controls.push(control);

    // TODO: consider making StaticConstraint able to store multiple coordinates?

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

    if (control._enableHitDetection) {
      this.enableHitDetection();
    }

    // Tell the control it now has a parent.
    control.added();

    // Asynchronously relayout (and repaint) the form.
    this.relayout();

    // Return the control so you can write, e.g. `let l = f.add(new Label());`
    return control;
  }

  // Override this in a subclass to get notified when added to a parent.
  protected added() {
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
      this.removed();
    }
  }

  // Override this in a subclass to get notified when removed from a parent.
  protected removed() {
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
    } else {
      return false;
    }
  }


  form(): Form {
    if (this.parent) {
      return this.parent.form();
    } else {
      return null;
    }
  }

  // Gets the x coordinate of this control relative to the surface.
  surfaceX(): number {
    if (this.parent) {
      return this.x + this.parent.surfaceX();
    } else {
      return this.x;
    }
  }

  // Gets the y coordinate of this control relative to the surface.
  surfaceY(): number {
    if (this.parent) {
      return this.y + this.parent.surfaceY();
    } else {
      return this.y;
    }
  }

  scrollBy(dx: number, dy: number): boolean {
    return false;
  }

  get coords() {
    return new ControlCoords(this);
  }

  submit() {
    if (this.parent) {
      this.parent.submit();
    }
  }
}
