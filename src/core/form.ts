import { Surface, MouseEventData, ScrollEventData, KeyEventData } from './surface';
import { Control, ControlAtPointData } from './control';
import { Animator } from '../animation';

export class MouseDownEventData extends MouseEventData {
  constructor(x: number, y: number, buttons: number, private readonly form: Form, private readonly hit: ControlAtPointData) {
    super(x, y, buttons);
  }

  capture() {
    this.form.capture = this.hit;
  }
}

export class MouseMoveEventData extends MouseEventData {
  constructor(x: number, y: number, buttons: number, readonly dx: number, readonly dy: number) {
    super(x, y, buttons);
  }
}

// Control that sits at the top of the hierarchy and manages the underlying
// surface to draw on.
export class Form extends Control {
  pendingLayout = false;
  pendingPaint = false;

  fontSize = 20;
  fontName = 'sans';
  color = '#202020';

  private _editing = false;

  focus: ControlAtPointData;
  capture: ControlAtPointData;

  // A list of top-level controls that should prevent all other controls from
  // using DOM content (i.e. textboxes).
  // If a control is a descendant of the topmost layer (or there are no layers), then
  // that control allowed to have DOM content.
  // Only controls that deliberately obscure other form content (e.g. modals, popups, etc)
  // should register as layers.
  private _layers: Control[] = [];

  private _animators: Animator[] = [];

  constructor(readonly surface: Surface) {
    super();

    // When the canvas resizes, relayout and repaint the entire form.
    this.surface.resize.add(data => {
      this.x = 0;
      this.y = 0;
      this.w = data.w;
      this.h = data.h;
      this.x2 = 0;
      this.y2 = 0;
      this.x2w = this.w;
      this.y2h = this.h
      this.xw = this.w;
      this.yh = this.h;

      // Asynchronously relayout (and repaint) the form.
      this.relayout();
    });

    this.surface.scroll.add(data => {
      if (this.focus) {
        let c = this.focus.control;
        while (c) {
          if (c.scrollBy(data.dx, data.dy)) {
            break;
          }
          c = c.parent;
        }
      }
    });

    // Map mouse events on the surface into the control that the mouse is over.
    this.surface.mousemove.add(data => {
      if (this.capture && !data.primaryButton()) {
        // We missed the mouseup event (maybe happened outside browser), so
        // inject a fake one.
        this.capture.update(data.x, data.y);
        this.capture.control.mouseup.fire(new MouseEventData(this.capture.x, this.capture.y, data.buttons));
        this.capture = null;
      }

      let target = this.capture;
      if (target) {
        target.update(data.x, data.y);
      } else {
        target = this.controlAtPoint(data.x, data.y);
        this.updateFocus(target);
      }

      target.control.mousemove.fire(new MouseMoveEventData(target.x, target.y, data.buttons, data.x - target.startX, data.y - target.startY));

      if (!this.capture && this.editing()) {
        this.repaint();
      }
    });

    this.surface.mousedown.add(data => {
      if (!data.primaryButton()) {
        return;
      }
      if (this.capture) {
        console.warn('Mouse down with capture?');
        return;
      }
      const hit = this.controlAtPoint(data.x, data.y);
      hit.control.mousedown.fire(new MouseDownEventData(hit.x, hit.y, data.buttons, this, hit));
    });

    this.surface.mouseup.add(data => {
      if (data.primaryButton()) {
        return;
      }
      let target = this.capture;
      if (target) {
        target.update(data.x, data.y);
        this.capture = null;
      } else {
        target = this.controlAtPoint(data.x, data.y);
      }
      target.control.mouseup.fire(new MouseEventData(target.x, target.y, data.buttons));
    });

    this.surface.mousewheel.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      this.updateFocus(hit);
    });

    this.surface.keydown.add(data => {
      if (this.focus) {
        let control = this.focus.control;
        while (control) {
          control.keydown.fire(new KeyEventData(data.key));
          control = control.parent;
        }
      }
    });
  }

  private updateFocus(hit: ControlAtPointData) {
    if (this.focus) {
      this.focus.control.focused = false;
    }
    this.focus = hit;
    this.focus.control.focused = true;
  }

  layout() {
    // const t = new Date().getTime();
    super.layout();
    // console.log('layout: ', new Date().getTime() - t);
  }

  paint(ctx: CanvasRenderingContext2D) {
    // Forms have a default (opaque) background color.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.w, this.h);

    // const t = new Date().getTime();
    super.paint(ctx);
    // console.log('paint: ', new Date().getTime() - t);
  }

  // Default implementation of repaint does a full paint of the entire form.
  repaint() {
    this.pendingPaint = true;
    window.requestAnimationFrame((frameTimeMs) => {
      this.pendingPaint = false;

      for (const a of this._animators) {
        a.apply(frameTimeMs);
      }
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
      window.requestAnimationFrame((frameTimeMs) => {
        this.pendingLayout = false;
        for (const a of this._animators) {
          a.apply(frameTimeMs);
        }
        this.layout();
        if (!this.pendingPaint) {
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

  editing(enable?: boolean) {
    if (enable !== undefined) {
      this._editing = enable;
    }
    return this._editing;
  }

  form(): Form {
    return this;
  }

  defaultWidth(): number {
    return 160;
  }

  defaultHeight(): number {
    return 32;
  }

  // Gets the x coordinate of this control relative to the form.
  formX(): number {
    return 0;
  }

  // Gets the y coordinate of this control relative to the form.
  formY(): number {
    return 0;
  }

  // Is the specified control allowed to use DOM content.
  // The problems is that all DOM content sits above the canvas,
  // so will not participate in the layering of form content.
  // So a control that wants to use a DOM element must be
  // in the current top-most layer.
  // TODO: can we partially obscure DOM content? i.e. should
  // a selectbox dropdown cause all HTML content to disappear?
  // This isn't a big deal for (e.g. textboxes, which can also
  // use the just-in-time DOM mode), but maybe down the track
  // something like an iframe or HTML content control?
  allowDom(control: Control): boolean {
    if (this._layers.length === 0) {
      return true;
    }

    if (control.parent === this) {
      return control === this._layers[this._layers.length - 1];
    } else {
      return this.allowDom(control.parent);
    }
  }

  // Make the top-level control that contains the specified control
  // the new top layer.
  pushLayer(control: Control): void {
    if (control.parent !== this) {
      return this.pushLayer(control.parent);
    }
    this._layers.push(control);
  }

  // Remove the current top layer (i.e. when the modal closes).
  popLayer(control: Control): void {
    if (control.parent !== this) {
      return this.popLayer(control.parent);
    }
    if (this._layers[this._layers.length - 1] !== control) {
      throw new Error('Wrong layer popped from stack.');
    }
    this._layers.pop();
  }

  addAnimator(animator: Animator) {
    this._animators.push(animator);
  }

  removeAnimator(animator: Animator) {
    for (let i = 0; i < this._animators.length; ++i) {
      if (this._animators[i] === animator) {
        this._animators.splice(i, 1);
        return;
      }
    }
  }
}
