// Todo list:
//  - Controls:
//    - Select
//    - List
//    - Radio
//    - Tab
//  - Popups & dialogs
//  - Size to child controls
//  - Drag + Drag & Drop


// Fired by a surface when the browser cases the Canvas element to resize.
class ResizeEventData {
  constructor(w, h) {
    this.w = w;
    this.h = h;
  }
}

// Fired by a surface when a mouse event happens on the canvas.
class MouseEventData {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Base class for events raised from controls.
class ControlEventData {
  constructor(control) {
    this.control = control;
  }
}

// Fired when a textbox's text changes by user input.
class TextboxChangeEventData extends ControlEventData {
  constructor(control, text) {
    super(control)
    this.text = text;
  }
}

// Fired when a checkbox state changes by user input.
class CheckboxToggleEventData extends ControlEventData {
  constructor(control, checked) {
    super(control);
    this.checked = checked;
  }
}

// Structure to represent a successful hit test.
class ControlAtPointData {
  constructor(control, x, y) {
    this.control = control;
    // These coordinates are relative to the control.
    this.x = x;
    this.y = y;
  }
}

// Represents a single event that can be fired or listened to.
class Event {
  constructor(addCallback) {
    // List of callbacks to invoke when the event fires.
    this.listeners = [];

    // Optionally specify a callback to be invoked when a new listener is added.
    this.addCallback = addCallback;
  }

  fire(data) {
    // Invoke all the listeners with the specified data payload.
    for (const h of this.listeners) {
      h(data);
    }
  }

  add(h) {
    // Register listener and optionally notify the owner of this event that a listener was added.
    this.listeners.push(h);
    if (this.addCallback) {
      this.addCallback();
    }
  }
}

// Manages the HTML Canvas element, in particular keeping it sized correctly.
class Surface {
  constructor(selector) {
    // The <canvas> DOM element.
    this.elem = document.querySelector(selector);

    // The 2D rendering context (used by all the `paint` methods).
    this.ctx = this.elem.getContext('2d');

    // Events (mostly used by Surface).
    this.resize = new Event();
    this.mousedown = new Event();
    this.mouseup = new Event();
    this.mousemove = new Event();

    // Forward DOM events to our own events.
    this.elem.addEventListener('mousedown', (ev) => {
      const s = window.devicePixelRatio;
      this.mousedown.fire(new MouseEventData(ev.offsetX * s, ev.offsetY * s));
    });
    this.elem.addEventListener('mouseup', (ev) => {
      const s = window.devicePixelRatio;
      this.mouseup.fire(new MouseEventData(ev.offsetX * s, ev.offsetY * s));
    });
    this.elem.addEventListener('mousemove', (ev) => {
      const s = window.devicePixelRatio;
      this.mousemove.fire(new MouseEventData(ev.offsetX * s, ev.offsetY * s));
    });
  }

  // Make the canvas automatically size itself to the parent element.
  fitParent() {
    // Canvas elements don't work with percentage sizing.
    // So we make it absolutely positioned and use a resize observer to
    // set width and height explicitly.

    // We're absolutely positioned in the parent, so the parent needs to be relative or absolute.
    if (this.elem.parentElement !== document.body && this.elem.parentElement.style.position !== 'absolute') {
      this.elem.parentElement.style.position = 'relative';
    }
    this.elem.parentElement.style.overflow = 'hidden';

    // Position in top-left of parent.
    this.elem.style.position = 'absolute';
    this.elem.style.boxSizing = 'border-box';
    this.elem.style.left = '0px';
    this.elem.style.top = '0px';

    // Listen for the parent's size changing.
    new ResizeObserver(entries => {
      let w = 0, h = 0;

      // Get the content size of the parent.
      if (this.elem.parentElement === document.body) {
        w = window.innerWidth;
        h = window.innerHeight;
      } else {
        w = this.elem.parentElement.clientWidth;
        h = this.elem.parentElement.clientHeight;
      }

      // Make our element sized correctly (CSS).
      this.elem.style.width = w + 'px';
      this.elem.style.height = h + 'px';

      // Get the content size of the canvas (just incase it has a border).
      w = this.elem.clientWidth;
      h = this.elem.clientHeight;

      // Set the actual canvas dimensions to take into account scaling.
      const s = window.devicePixelRatio;
      this.elem.width = Math.round(w * s);
      this.elem.height = Math.round(h * s);
      this.ctx.resetTransform();

      // Add a 0.5px offset so that all operations align to the pixel grid.
      // TODO: figure out why this is needed. Does canvas consider coordinates to be on the
      // pixel boundaries by default?
      this.ctx.translate(0.5, 0.5);

      this.resize.fire(new ResizeEventData(Math.round(w * s), Math.round(h * s)));
    }).observe(this.elem.parentElement);
  }
}

// Enum to represent the two axes.
// Used for some constraints that must apply to coordinates on the same axis.
const CoordAxis = {
  X: 1,
  Y: 2,
};

// Different types of coordinates.
const CoordType = {
  A: 1,  // X,Y      (i.e. left/top edge, relative to parent left/top)
  B: 2,  // W,H      (i.e. width/height)
  C: 3,  // X2,Y2    (i.e. right/bottom edge, relative to parent right/bottom)
  D: 4,  // XW, YH   (i.e. right/bottom edge, relative to parent left/top)
  E: 5,  // X2W, Y2H (i.e. left/top edge, relative to parent right/bottom)
};

// Represents a CoordType on a CoordAxis.
class CoordData {
  constructor(axis, type) {
    this.axis = axis;
    this.type = type;
  }
}

// All the different ways that a control's layout can be specified.
// Any two on the same axis are enough to specify that axis (other than x2+xw or x+x2w).
const Coord = {
  X: new CoordData(CoordAxis.X, CoordType.A),
  Y: new CoordData(CoordAxis.Y, CoordType.A),
  W: new CoordData(CoordAxis.X, CoordType.B),
  H: new CoordData(CoordAxis.Y, CoordType.B),
  X2: new CoordData(CoordAxis.X, CoordType.C),
  Y2: new CoordData(CoordAxis.Y, CoordType.C),
  XW: new CoordData(CoordAxis.X, CoordType.D),
  YH: new CoordData(CoordAxis.Y, CoordType.D),
  X2W: new CoordData(CoordAxis.X, CoordType.E),
  Y2H: new CoordData(CoordAxis.Y, CoordType.E),
};

// Base control class - represents a control on a form.
// Do not instantiate directly.
class Control {
  constructor() {
    // Child controls.
    this.controls = [];
    // Constraints applied to children.
    this.constraints = [];

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
  recalculate(axis) {
    function nn(v) {
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
  controlAtPoint(x, y) {
    for (const c of this.controls) {
      if (c._enableHitDetection && x >= c.x && y >= c.y && x < c.x + c.w && y < c.y + c.h) {
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
      // At the end of this, update `this.constraints` with the new re-ordered list.
      // Hopefully this means that next time `layout` is called, we're in the right order
      // and all constraints should apply first go.
      const applied = [];
      let pending = this.constraints;
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
      this.constraints = applied;

      // Check if all constraints have converged (only fill constraints can fail this).
      // If they all have, then we're done. Otherwise, go another iteration.
      let done = true;
      for (const c of this.constraints) {
        if (!c.done(i)) {
          done = false;
        }
      }
      if (done) {
        if (i >=2) {
          console.warn('Warning: Layout took ' + (i+1) + ' rounds.');
        }
        break;
      }
    }

    // Now that all the controls are themselves positions, layout their children.
    for (const c of this.controls) {
      c.layout();
    }
  }

  selfConstrain() {
  }

  // Override this (and always call `super.paint()`) to customise appearance of child controls.
  paint(ctx) {
    // This base implementation just makes sure all children are painted too.
    for (const c of this.controls) {
      ctx.save();
      // Not we offset the context so that all drawing operations are relative to the control.
      ctx.translate(c.x, c.y);
      c.paint(ctx);
      ctx.restore();
    }
  }

  // Adds a child control, optionally with the specified static coordinates.
  // Any of the coordinates can be null/undefined to ignore.
  add(control, x, y, w, h, x2, y2) {
    const a = (b) => {
      return b !== undefined && b !== null;
    }

    // TODO: consider making StaticConstraint able to store multiple coordinates?

    if (a(x)) {
      this.constraints.push(new StaticConstraint(control, Coord.X, x));
    }
    if (a(y)) {
      this.constraints.push(new StaticConstraint(control, Coord.Y, y));
    }
    if (a(w)) {
      this.constraints.push(new StaticConstraint(control, Coord.W, w));
    }
    if (a(h)) {
      this.constraints.push(new StaticConstraint(control, Coord.H, h));
    }
    if (a(x2)) {
      this.constraints.push(new StaticConstraint(control, Coord.X2, x2));
    }
    if (a(y2)) {
      this.constraints.push(new StaticConstraint(control, Coord.Y2, y2));
    }

    control.parent = this;
    this.controls.push(control);

    // Tell the control it now has a parent.
    control.added();

    // TODO: This should detect, and only do this if, the form is visible and the control is fully specified.
    //this.relayout();
    //this.repaint();

    // Return the control so you can write, e.g. `let l = f.add(new Label());`
    return control;
  }

  // Override this in a subclass to get notified when added to a parent.
  added() {
  }

  // Remove this control from its parent.
  remove() {
    while (this.controls.length > 0) {
      this.controls[0].remove();
    }

    for (let i = 0; i < this.parent.controls.length; ++i) {
      if (this.parent.controls[i] === this) {
        this.parent.controls.splice(i, 1);
        return;
      }
    }

    this.removed();
  }

  // Override this in a subclass to get notified when removed from a parent.
  removed() {
  }

  constrain(c) {
    // TODO: all the controls in this constraint must be in this.controls.
    this.constraints.push(c);

    // TODO: This should detect, and only do this if, the form is visible and the control is fully specified.
    //this.relayout();
    //this.repaint();
  }

  // Returns a font that can be used by the context.
  getFont() {
    return this.getFontSize() + 'px ' + this.getFontName();
  }

  // Returns the font size in pixels.
  getFontSize() {
    return this.fontSize || this.parent.getFontSize();
  }

  // Returns the font name only.
  getFontName() {
    return this.fontName || this.parent.getFontName();
  }

  // Returns the default foreground color for this control.
  getColor() {
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
  context() {
    if (this.parent) {
      return this.parent.context();
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
}

// Base class for constraints that can be applied to control coordinates.
class Constraint {
  constructor() {
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
    super();

    this.control = control;
    this.coord = coord;
    this.v = v;
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
    super();

    this.control1 = control1;
    this.coord1 = coord1;
    this.control2 = control2;
    this.coord2 = coord2;
    this.offset = offset || 0;
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
    super();

    // Fill makes no sense for anything other than width/height.
    if (coord !== Coord.W && coord !== Coord.H) {
      throw new Error('Can only set fill constraints on width/height.');
    }

    // TODO: make ratios work.

    // Save controls, coords, and generate default ratios if not specified.
    this.controls = controls;
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

// Control that sits at the top of the hierarchy and manages the underlying
// surface to draw on.
class Form extends Control {
  constructor(surface) {
    super();

    this.surface = surface;

    this.fontSize = 16;
    this.fontName = 'sans'
    this.color = 'black'

    // When the canvas resizes, relayout and repaint the entire form.
    this.surface.resize.add(data => {
      this.x = 0;
      this.y = 0;
      this.w = data.w;
      this.h = data.h;
      this.x2 = 0;
      this.y2 = 0;
      this.relayout();
      this.repaint();
    });

    // Map mouse events on the surface into the control that the mouse is over.
    this.surface.mousemove.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      hit.control.mousemove.fire(new MouseEventData(hit.x, hit.y));
    });
    this.surface.mousedown.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      hit.control.mousedown.fire(new MouseEventData(hit.x, hit.y));
    });
    this.surface.mouseup.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      hit.control.mouseup.fire(new MouseEventData(hit.x, hit.y));
    });
  }

  paint(ctx) {
    // Forms have a default (opaque) background color.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.w, this.h);

    super.paint(ctx);
  }

  // Default implementation of repaint does a full paint of the entire form.
  repaint() {
    this.paint(this.context());
  }

  // Default implementation of relayout does a full paint of the entire form.
  relayout() {
    if (this.w && this.h) {
      this.layout();
    }
  }

  // We're the top of the hierarchy. The default implementation of this expects
  // the parent to be able to provide it, so that's what we do.
  context() {
    return this.surface.ctx;
  }
}

// An empty control that can be used with constraints to provide an offset
// or a fill.
class Spacer extends Control {
}

// Simple single-line text control that sizes to content.
class Label extends Control {
  constructor(text) {
    super();

    this.text = text || '';
  }

  paint(ctx) {
    super.paint();

    // For testing, fill the background.
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, this.w, this.h);

    // Draw the text, centered vertically and left aligned.
    ctx.font = this.getFont();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, 0, this.h / 2);
  }

  setText(text) {
    this.text = text;
    this.relayout();
    this.repaint();
  }

  selfConstrain() {
    this.context().font = this.getFont();
    this.w = Math.ceil(this.context().measureText(this.text).width);
    this.h = this.getFontSize() + 2;
  }
}

class Button extends Control {
  constructor(text) {
    super();

    this.text = text || '';
    this.down = false;
    this.click = new Event();

    this.mousedown.add((data) => {
      this.down = true;
      this.repaint();
    });
    this.mouseup.add((data) => {
      if (this.down) {
        this.click.fire();
      }
      this.down = false;
      this.repaint();
    });
  }

  paint(ctx) {
    super.paint();

    if (this.down) {
      ctx.fillStyle = 'red';
    } else {
      ctx.fillStyle = 'orange';
    }
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.font = this.getFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, this.w / 2, this.h / 2, this.w);

    if (this.down) {
      ctx.strokeStyle = 'red';
    } else {
      ctx.strokeStyle = 'black';
    }
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, this.w, this.h);
  }
}

class Checkbox extends Control {
  constructor(text, checked) {
    super();

    this.text = text || '';
    this.down = false;
    this.checked = checked || false;

    this.on = new Event();
    this.off = new Event();
    this.toggle = new Event();

    this.mousedown.add((data) => {
      this.down = true;
      this.repaint();
    });
    this.mouseup.add((data) => {
      if (this.down) {
        this.checked = !this.checked;
        const ev = new CheckboxToggleEventData(this, this.checked);
        this.toggle.fire(ev);
        if (this.checked) {
          this.on.fire(ev);
        } else {
          this.off.fire(ev);
        }
      }
      this.down = false;
      this.repaint();
    });
  }

  paint(ctx) {
    super.paint();

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.h, this.h);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, this.h, this.h);

    if (this.checked) {
      ctx.fillStyle = 'orange';
      ctx.fillRect(3, 3, this.h - 6, this.h - 6);
    }

    ctx.font = this.getFont();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, this.h + 5, this.h / 2, this.w - this.h - 4);
  }
}

class Textbox extends Control {
  constructor(text) {
    super();

    this.text = text || '';
    this.change = new Event();

    this.elem = null;
  }

  paint(ctx) {
    super.paint();

    if (!this.elem) {
      this.elem = document.createElement('input');
      this.elem.type = 'text';
      this.elem.style.position = 'absolute';
      this.elem.style.boxSizing = 'border-box';
      this.elem.style.border = 'none';
      this.elem.style.background = 'none';
      this.elem.style.paddingLeft = '3px';
      this.elem.value = this.text;
      this.elem.addEventListener('input', (ev) => {
        this.text = this.elem.value;
        this.change.fire(new TextboxChangeEventData(this, this.text));
      });
      this.context().canvas.parentElement.append(this.elem);
    }

    const s = window.devicePixelRatio;
    this.elem.style.left = this.surfaceX() / s + 'px';
    this.elem.style.top = this.surfaceY() / s + 'px';
    this.elem.style.width = this.w / s + 'px';
    this.elem.style.height = this.h / s + 'px';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.h, this.h);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, this.w, this.h);
  }

  removed() {
    if (this.elem) {
      this.elem.remove();
      this.elem = null;
    }
  }
}
