// Todo list:
//  - Controls:
//    - Select
//    - List
//    - Radio
//    - Tab
//  - Popups & dialogs
//  - Size to child controls
//  - Mouse enter/leave
//  - Drag + Drag & Drop
//  - Focus

if (!window.ResizeObserver) {
  // FireFox polyfill.

  window.ResizeObserver = function(fn) {
    this.fn = fn;
    this.ma = new MutationObserver((entries) => {
      this.fn(entries);
    });
    setTimeout(() => {this.fn();},0);
  }

  window.ResizeObserver.prototype.observe = function(x) {
    this.ma.observe(x, {
      attributes: true,
      childList: false,
      characterData: false
    });
  };
}


// Manages the HTML Canvas element, in particular keeping it sized correctly.
class Surface {
  constructor(selector) {
    // The <canvas> DOM element.
    this.elem = document.querySelector(selector);
    this.scrollContainer = null;
    this.scrollElems = [];

    this.fitParent();

    // The 2D rendering context (used by all the `paint` methods).
    this.ctx = this.elem.getContext('2d');

    // Events (mostly used by Surface).
    this.resize = new Event();
    this.scroll = new Event();
    this.mousedown = new Event();
    this.mouseup = new Event();
    this.mousemove = new Event();

    // Forward DOM events to our own events.
    // if (navigator.maxTouchPoints || document.documentElement['ontouchstart']) {
    //   let tx = 0; let ty = 0;
    //   this.elem.addEventListener('touchstart', (ev) => {
    //     const s = window.devicePixelRatio;
    //     tx = ev.touches[0].clientX * s;
    //     ty = ev.touches[0].clientY * s;
    //     this.mousedown.fire(new MouseEventData(tx, ty));
    //   });
    //   this.elem.addEventListener('touchend', (ev) => {
    //     const s = window.devicePixelRatio;
    //     this.mouseup.fire(new MouseEventData(tx, ty));
    //   });
    //   this.elem.addEventListener('touchmove', (ev) => {
    //     const s = window.devicePixelRatio;
    //     tx = ev.touches[0].clientX * s;
    //     ty = ev.touches[0].clientY * s;
    //     this.mousemove.fire(new MouseEventData(tx, ty));
    //   });
    // }
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
    const parent = this.elem.parentElement;

    // Canvas elements don't work with percentage sizing.
    // So we make it absolutely positioned and use a resize observer to
    // set width and height explicitly.

    // We're absolutely positioned in the parent, so the parent needs to be relative or absolute.
    if (parent !== document.body && parent.style.position !== 'absolute') {
      parent.style.position = 'relative';
    }
    parent.style.overflow = 'hidden';

    if (parent === document.body) {
      // So that the resize observer can track height.
      parent.style.height = '100%';
      parent.parentElement.style.height = '100%';
    }

    this.scrollContainer = document.createElement('div');
    this.elem.remove();
    this.scrollContainer.append(this.elem);
    parent.append(this.scrollContainer);

    this.scrollContainer.style.position = 'absolute';
    this.scrollContainer.style.boxSizing = 'border-box';
    this.scrollContainer.style.left = '0px';
    this.scrollContainer.style.top = '0px';
    this.scrollContainer.style.overflow = 'scroll';

    this.scrollElems.push(document.createElement('div'));
    this.scrollElems.push(document.createElement('div'));
    for (const e of this.scrollElems) {
      e.style.position = 'absolute';
      e.style.width = '10px';
      e.style.height = '10px';
      this.scrollContainer.append(e);
    }
    const v = window.innerWidth;
    this.scrollElems[0].style.left = '0px';
    this.scrollElems[0].style.top = '0px';
    this.scrollElems[1].style.left = v * 5 + 'px';
    this.scrollElems[1].style.top = v * 5 + 'px';

    this.scrollContainer.scrollLeft = v * 2;
    this.scrollContainer.scrollTop = v * 2;

    // Position in top-left of parent.
    this.elem.style.position = 'sticky';
    this.elem.style.boxSizing = 'border-box';
    this.elem.style.left = 0 + 'px';
    this.elem.style.top = 0 + 'px';

    let sx = 0;
    let sy = 0;
    this.scrollContainer.addEventListener('scroll', () => {
      let dx = Math.round(window.devicePixelRatio * (v * 2 - this.scrollContainer.scrollLeft));
      let dy = Math.round(window.devicePixelRatio * (v * 2 - this.scrollContainer.scrollTop));
      this.scroll.fire(new ScrollEventData(dx - sx, dy - sy));
      sx = dx;
      sy = dy;

      if (Math.abs(dx) > v) {
        sx = 0;
        this.scrollContainer.scrollLeft = v * 2;
      }
      if (Math.abs(dy) > v) {
        sy = 0;
        this.scrollContainer.scrollTop = v * 2;
      }
    });

    // Listen for the parent's size changing.
    new ResizeObserver(entries => {
      let w = 0, h = 0;

      // Get the content size of the parent.
      if (parent === document.body) {
        w = window.innerWidth;
        h = window.innerHeight;
      } else {
        w = parent.clientWidth;
        h = parent.clientHeight;
      }

      console.log(w, h);

      // debug scrollbars
      // w -= 20;
      // h -= 20;

      this.scrollContainer.style.width = (w + 100) + 'px';
      this.scrollContainer.style.height = (h + 100) + 'px';

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
    }).observe(parent);
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
    // TODO: sort by z-order.
    for (let i = this.controls.length - 1; i >= 0; --i) {
      const c = this.controls[i];
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
        if (i >=2) {
          console.warn('Warning: Layout took ' + (i+1) + ' rounds.');
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
        c.recalculate();
        xx = Math.min(xx + 20, Math.max(xx, c.x) + 20);
      }
      if (c.y === null) {
        c.y = yy;
        c.recalculate();
        yy = Math.min(yy + 20, Math.max(yy, c.y) + 20);
      }
      if (c.w === null) {
        c.w = 100;
        c.recalculate();
        xx = Math.min(xx + 20, Math.max(xx, c.x) + 20);
      }
      if (c.h === null) {
        c.h = 26;
        c.recalculate();
        yy = Math.min(yy + 20, Math.max(yy, c.y) + 20);
      }

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
  }

  // Adds a child control, optionally with the specified static coordinates.
  // Any of the coordinates can be null/undefined to ignore.
  add(control, x, y, w, h, x2, y2) {
    const a = (b) => {
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

// Control that sits at the top of the hierarchy and manages the underlying
// surface to draw on.
class Form extends Control {
  constructor(surface) {
    super();

    this.surface = surface;
    this.pendingLayout = false;
    this.pendingPaint = false;

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

      // Asynchronously relayout (and repaint) the form.
      this.relayout();
    });

    this.focus = null;
    // TODO: this needs to default to the element under the cursor on page load.

    this.surface.scroll.add(data => {
      let c = this.focus;
      if (c) {
        c = c.control;
        while (c) {
          if (c.scrollable) {
            c.scrollBy(data.dx, data.dy);
            break;
          }
          c = c.parent;
        }
      }
    });

    // Map mouse events on the surface into the control that the mouse is over.
    this.surface.mousemove.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      this.focus = hit;
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
    this.pendingPaint = true;
    window.requestAnimationFrame((frameTime) => {
      //console.log('paint ' + frameTime);
      this.pendingPaint = false;
      this.paint(this.context());
    });
  }

  // Default implementation of relayout does a full paint of the entire form.
  relayout() {
    if (this.pendingLayout) {
      return;
    }

    if (this.w && this.h) {
      this.pendingLayout = true;
      window.requestAnimationFrame((frameTime) => {
        //console.log('layout ' + frameTime);
        this.pendingLayout = false;
        this.layout();
        if (!this.pendingPaint) {
          //console.log('paint ' + frameTime);
          this.paint(this.context());
        }
      });
    }
  }

  // We're the top of the hierarchy. The default implementation of this expects
  // the parent to be able to provide it, so that's what we do.
  context() {
    return this.surface.ctx;
  }
}
