import { Surface, SurfaceMouseEvent, SurfaceScrollEvent, SurfaceKeyEvent } from './surface';
import { Control, ControlAtPointData, ControlAtPointOpts } from './control';
import { Animator } from '../animation';
import { Menu } from './menu';
import { Timer } from './utils';

export class FormMouseDownEvent extends SurfaceMouseEvent {
  constructor(x: number, y: number, button: number, buttons: number, private readonly form: Form, private readonly hit: ControlAtPointData, readonly control: Control) {
    super(x, y, button, buttons);
  }

  // Direct all future mouse events to this control until the mouse is released.
  capture() {
    this.form.setCapture(this.hit, false);
  }

  captureDrag() {
    this.form.setCapture(this.hit, true);
  }

  // Tell the form that if the mouse moves while still down, then begin a drag.
  allowDrag(data: any) {
    this.form.setAllowDrag(this.hit, data);
  }

  cancelBubble() {
    this.form.cancelBubble();
  }
}

export class FormMouseMoveEvent extends SurfaceMouseEvent {
  constructor(x: number, y: number, button: number, buttons: number, private readonly form: Form, readonly dragX: number, readonly dragY: number, readonly dx: number, readonly dy: number, readonly capture: boolean) {
    super(x, y, button, buttons);
  }

  cancelDragCapture() {
    this.form.restoreCapture();
  }
}

export class FormMouseUpEvent extends SurfaceMouseEvent {
  constructor(x: number, y: number, button: number, buttons: number, readonly control: Control, readonly capture: boolean) {
    super(x, y, button, buttons);
  }

  inside() {
    return this.control.inside(this.x, this.y);
  }
}

export class FormKeyEvent extends SurfaceKeyEvent {
  constructor(key: number) {
    super(key);
  }
}

// Control that sits at the top of the hierarchy and manages the underlying
// surface to draw on.
export class Form extends Control {
  private _pendingLayout = false;
  private _pendingPaint = false;

  private _editing = false;

  // The control that last received a mouse events.
  private _focus: ControlAtPointData;

  // A control that called `ev.capture()` on a FormMouseDownEvent.
  // (i.e. we should send future mouse events to it, rather than doing
  // hit detection).
  private _capture: ControlAtPointData;
  private _dragCapture: ControlAtPointData;
  private _restoreCapture: ControlAtPointData;

  // Should the next mousemove be considered to be a drag.
  private _dragAllowed: boolean;
  // Data (specified by the control that allowed dragging) to be passed to the drop target.
  private _dragData: any;
  // The coordinates that we're current dragging to (needed to so we can paint the overlay at
  // the correct location).
  private _dragCoordinates: SurfaceMouseEvent;
  // The last control that we thought was the drag target (i.e. we set `.dropTarget = true` on
  // it so we need to keep a reference to it so we can unset that if we move over a different control.
  private _dropTargetControl: Control;

  // Allows a mouse down event to keep bubbling up the hierarchy.
  private _bubbleMouseDown: boolean = true;

  // A list of top-level controls that should prevent all other controls from
  // using DOM content (i.e. textboxes).
  // If a control is a descendant of the topmost layer (or there are no layers), then
  // that control allowed to have DOM content.
  // Only controls that deliberately obscure other form content (e.g. modals, popups, etc)
  // should register as layers.
  private _layers: Control[] = [];

  // List of currently active animators (i.e. animators that should be receiving per-frame callbacks).
  private _animators: Animator[] = [];

  constructor(readonly surface: Surface) {
    super();

    // When the canvas resizes, relayout and repaint the entire form.
    this.surface.resize.add(ev => {
      this.x = 0;
      this.y = 0;
      this.w = ev.w;
      this.h = ev.h;
      this.x2 = 0;
      this.y2 = 0;
      this.x2w = this.w;
      this.y2h = this.h
      this.xw = this.w;
      this.yh = this.h;

      // Asynchronously relayout (and repaint) the form.
      this.relayout();
    });

    // When the mouse wheel is activated on the surface, send a scroll event to
    // the last control that a mouse event was delivered to.
    this.surface.scroll.add(ev => {
      if (this._focus) {
        // Walk up the tree to find a control that actually accepts the scroll event.
        // This allows us to have scrollboxes inside scrollboxes, etc.
        // Scrolling controls should return false at the end of their range.
        let c = this._focus.control;
        while (c) {
          if (c.scrollBy(ev.dx, ev.dy)) {
            break;
          }
          c = c.parent;
        }
      }
    });

    // Map mouse events on the surface into the control that the mouse is over.
    let lastMoveX = -1, lastMoveY = -1;
    let menuTimer: Timer = null;
    let hovered = new Set<Control>();

    this.surface.mousemove.add(ev => {
      if (menuTimer) {
        menuTimer.reset();
      }

      if (this._capture && !ev.primaryButton()) {
        // We have capture, but the mouse is moving without the button down.
        // This means we missed the mouseup event (maybe happened outside browser), so
        // inject a fake one.
        this._capture.update(ev.x, ev.y);
        this._capture.control.mouseup.fire(new FormMouseUpEvent(this._capture.x, this._capture.y, ev.button, ev.buttons, this._capture.control, false));
        this.endCapture();
      }

      const restoreCapture = this._capture;
      if (this._dragCapture && ev.primaryButton()) {
        if (!this._capture || (ev.x !== this._capture.formX || ev.y !== this._capture.formY)) {
          const newCapture = this._dragCapture;
          this.endCapture();
          this._restoreCapture = restoreCapture;
          this._capture = newCapture;
        }
      }

      if (this._capture && this._dragAllowed) {
        if (menuTimer) {
          menuTimer.cancel();
          menuTimer = null;
        }

        // Capture is enabled and the control has indicated that it's a drag source.
        this._dragCoordinates = ev;

        // Remove the `dropTarget` state from the previous target.
        if (this._dropTargetControl) {
          (this._dropTargetControl as Form).dropTarget = false;
        }

        // Hit test and set `dropTarget` on the current target.
        // Note we set `all=true` to hit test all controls (not just the ones with
        // mouse event handlers).
        this._dropTargetControl = this.dropTargetAtPoint(ev.x, ev.y);
        if (this._dropTargetControl) {
          (this._dropTargetControl as Form).dropTarget = true;
        }
      }

      // Either deliver the mouse move event to the current capture, or hit test to find
      // the control under the mouse.
      let delta = [0, 0];
      let target = this._capture;
      if (target) {
        delta = target.update(ev.x, ev.y);
      } else {
        target = this.controlAtPoint(ev.x, ev.y);
        if (!target) {
          // TODO: restore capture?
          return;
        }
        // Remember the last control that saw a mouse event.
        this.updateFocus(target);
      }

      let hover = target.control;
      let repaint = false;
      let newHovered = new Set<Control>();
      while (hover) {
        newHovered.add(hover);
        if (!(hover as Form).hovered) {
          (hover as Form).hovered = true;
          repaint = true;
        }
        hover = hover.parent;
      }
      for (const oldHover of hovered) {
        if (newHovered.has(oldHover)) {
          continue;
        }
        (oldHover as Form).hovered = false;
        repaint = true;
      }
      hovered = newHovered;

      // Send the mouse move event to the target.
      target.control.mousemove.fire(new FormMouseMoveEvent(target.x, target.y, ev.button, ev.buttons, this, ev.x - target.startX, ev.y - target.startY, delta[0], delta[1], target === this._capture));

      if (restoreCapture && this._capture !== restoreCapture) {
        restoreCapture.update(ev.x, ev.y);
        restoreCapture.control.mouseup.fire(new FormMouseUpEvent(restoreCapture.x, restoreCapture.y, ev.button, ev.buttons, restoreCapture.control, false));
      }
      this._restoreCapture = null;

      // Editing means that we likely need to redraw the constraints.
      repaint = repaint || (!this._capture && this.designMode);
      // If we're currently mid-drag, then we'll need to paint the drag overlay.
      repaint = repaint || (this._capture !== null && this._dragCoordinates !== null);

      if (repaint) {
        this.repaint();
      }
    });

    // Forward mouse down events to the control under the cursor.
    this.surface.mousedown.add(ev => {
      if (!ev.primaryButton()) {
        return;
      }
      if (this._capture) {
        // Should be impossible.
        return;
      }

      if (menuTimer) {
        menuTimer.cancel();
        menuTimer = null;
      }
      menuTimer = new Timer(() => {
        this.surface.contextmenu.fire(ev);
      }, 400);

      // Keep bubbling until a listener calls `cancelBubble`.
      this._bubbleMouseDown = true;
      let control = null;

      // Controls that we've already sent the event to.
      const exclude = [];

      while (this._bubbleMouseDown) {
        const hit = this.controlAtPoint(ev.x, ev.y, { exclude: exclude });
        if (!hit) {
          break;
        }

        // If this is the first hit, then record that to pass to the event.
        if (!control) {
          control = hit.control;
        }

        // Activate the listeners for the control.
        hit.control.mousedown.fire(new FormMouseDownEvent(hit.x, hit.y, ev.button, ev.buttons, this, hit, control));

        // If we're bubbling, don't search this control again.
        exclude.push(hit.control);
      }
    });

    this.surface.mouseup.add(ev => {
      if (ev.primaryButton()) {
        return;
      }
      if (!ev.wasPrimary()) {
        return;
      }
      if (menuTimer) {
        menuTimer.cancel();
        menuTimer = null;
      }

      const wasCapture = this._capture !== null;

      // If we have a capture target, then send the up event to it instead.
      let target = this._capture;
      if (target) {
        // Update the control-at-point data with the new mouse coordinates.
        // (Note that this might indicate that the coordinates are outside the bounds of the control
        // which is fine because that's how capture works).
        target.update(ev.x, ev.y);

        // But if we're mid-drag, then we need to also notify the drop (if allowed).
        if (this._dragCoordinates && this._dropTargetControl) {
          this._dropTargetControl.drop(this._dragData);
          (this._dropTargetControl as Form).dropTarget = false;
        }

        // Repaint to hide the drag overlay.
        this.repaint();
      } else {
        // Otherwise, send the up event to whatever is undert the cursor.
        target = this.controlAtPoint(ev.x, ev.y);
      }

      this.endCapture();

      if (target) {
        target.control.mouseup.fire(new FormMouseUpEvent(target.x, target.y, ev.button, ev.buttons, target.control, wasCapture));
      }
    });

    // TODO: Remove this event and just have the surface send scroll events (which should
    // include the mouse coordinates, so we can just do a regular hit test).
    this.surface.mousewheel.add(ev => {
      const hit = this.controlAtPoint(ev.x, ev.y);
      if (hit) {
        this.updateFocus(hit);
      }
    });

    this.surface.mousedbl.add(ev => {
      const hit = this.controlAtPoint(ev.x, ev.y);
      if (hit) {
        hit.control.mousedbl.fire(new FormMouseUpEvent(hit.x, hit.y, ev.button, ev.buttons, hit.control, false));
      }
    });

    this.surface.contextmenu.add(async ev => {
      const exclude = [];

      while (true) {
        const hit = this.controlAtPoint(ev.x, ev.y, { exclude: exclude, all: true });
        if (!hit) {
          break;
        }

        const items = await (hit.control as Form).contextMenu();
        if (items) {
          if (this._capture) {
            this._capture.update(ev.x, ev.y);
            this._capture.control.mouseup.fire(new FormMouseUpEvent(this._capture.x, this._capture.y, ev.button, ev.buttons, this._capture.control, false));
            this.endCapture();
          }
          this.add(new Menu(items), ev.x, ev.y);
          break;
        }

        exclude.push(hit.control);
      }
    });

    // Send the key event to all the controls in the hierarchy above the current focus.
    // TODO: provide a way to stop walking up the hierarchy, e.g. `ev.cancelBubble()`.
    this.surface.keydown.add(ev => {
      if (this._focus) {
        let control = this._focus.control;
        while (control) {
          control.keydown.fire(new FormKeyEvent(ev.key));
          control = control.parent;
        }
      }
    });
  }

  // Somehow the mouse was released, so end capture.
  private endCapture() {
    this._capture = null;
    this._dragCapture = null;
    this._dragAllowed = false;
    this._dragData = null;
    if (this._dropTargetControl) {
      (this._dropTargetControl as Form).dropTarget = false;
    }
    this._dropTargetControl = null;
    this._dragCoordinates = null;
  }

  // Any time we use the mouse coordinates to do a hit test, remember which control
  // we found so that we can send scroll/key events to it.
  private updateFocus(hit: ControlAtPointData) {
    if (this._focus) {
      // Unfocus the previous target.
      (this._focus.control as Form).focused = false;
    }
    this._focus = hit;
    (this._focus.control as Form).focused = true;
  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    // Forms have a default (opaque) background color.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.w, this.h);
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    // Recursively paint the control hierarchy.
    super.paint(ctx);

    // If we have a drag active, then ask the current drag source to paint itself
    // a second time, at the mouse coordinates (this is the drag overlay).
    if (this._capture && this._dragCoordinates) {
      ctx.save();

      // Not we offset the context so that all drawing operations are relative to the control.
      ctx.translate(this._dragCoordinates.x + 10, this._dragCoordinates.y + 10);

      // Always clip the drag overlay (ignoring Control::clip).
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this._capture.control.w, 0);
      ctx.lineTo(this._capture.control.w, this._capture.control.h);
      ctx.lineTo(0, this._capture.control.h);
      ctx.closePath();
      ctx.clip();

      // Make the overlay translucent, and paint it.
      ctx.globalAlpha *= 0.5;
      (this._capture.control as Form).paint(ctx);  // Cast to workaround the way protected works in typescript.
      ctx.globalAlpha /= 0.5;

      ctx.restore();
    }
  }

  // Both repaint and relayout schedule this. Do whichever operation that was required (or both)
  animationFrame(frameTimeMs: number) {
    if (this._pendingLayout) {
      this._pendingLayout = false;

      // const t = new Date().getTime();
      this.layout();
      // console.log('layout: ', new Date().getTime() - t);

      // Should always be set, but just incase.
      this._pendingPaint = true;
    }

    if (this._pendingPaint) {
      this._pendingPaint = false;

      // Notify any active animators that a frame is starting.
      for (const a of this._animators) {
        a.apply(frameTimeMs);
      }

      // Recursively paint the form.
      // const t = new Date().getTime();
      this.paint(this.context);
      // console.log('paint: ', new Date().getTime() - t);
    }
  }

  // Default implementation of repaint does a full paint of the entire form.
  repaint() {
    // Don't queue more than one paint at a time.
    if (this._pendingPaint) {
      return;
    }
    this._pendingPaint = true;

    // If a layout is already pending, then piggyback our paint onto that.
    if (this._pendingLayout) {
      return;
    }

    // Schedule a paint callback.
    window.requestAnimationFrame(this.animationFrame.bind(this));
  }

  // Default implementation of relayout does a full layout and paint of the entire form.
  relayout() {
    // Don't queue more than one layout at a time.
    if (this._pendingLayout) {
      return;
    }
    this._pendingLayout = true;

    // If a paint is already pending, then piggyback the layout onto that.
    if (this._pendingPaint) {
      return;
    }

    // Layout always requires a paint.
    this._pendingPaint = true;

    // Schedule a paint callback.
    window.requestAnimationFrame(this.animationFrame.bind(this));
  }

  // We're the top of the hierarchy. The default implementation of this expects
  // the parent to be able to provide it, so that's what we do.
  get context() {
    return this.surface.ctx;
  }

  // Returns true if this form is in edit mode.
  // TODO: Make only sub-hierarchies editable.
  get designMode() {
    return this._editing;
  }

  // Override the default implementation in Control (that returns `parent.form`).
  get form(): Form {
    return this;
  }

  // Default width & height for controls that do not get these through constraints.
  get defaultWidth(): number {
    return 160;
  }
  get defaultHeight(): number {
    return 32;
  }

  // Override the default implementaiton in Control (we're the root control, so at 0,0).
  get formX(): number {
    return 0;
  }
  get formY(): number {
    return 0;
  }

  dropTargetAtPoint(x: number, y: number) {
    const exclude = [];

    while (true) {
      const hit = this.controlAtPoint(x, y, { exclude: exclude, all: true });
      if (!hit) {
        break;
      }

      if (hit.control !== this._capture.control) {
        const allow = hit.control.allowDrop(this._dragData);
        if (allow === true) {
          return hit.control;
        }
        if (allow === false) {
          return null;
        }
        // default (null) means bubble.
      }

      exclude.push(hit.control);
    }

    return null;
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

  controlAtPoint(x: number, y: number, opts?: ControlAtPointOpts): ControlAtPointData {
    if (this._layers.length === 0) {
      return super.controlAtPoint(x, y, opts);
    }
    const layer = this._layers[this._layers.length - 1];
    opts = opts || {};
    opts.formX = x;
    opts.formY = y;
    const cx = x - layer.x;
    const cy = y - layer.y;
    return layer.controlAtPoint(cx, cy, opts);
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

  // Register the animator with this form (so it receives callback every frame).
  addAnimator(animator: Animator) {
    this._animators.push(animator);
    this.repaint();
  }

  // Stop this animator from receiving frame callbacks.
  // Many animators are single-use, so this will remove the last
  // reference to these temporary animators.
  removeAnimator(animator: Animator) {
    for (let i = 0; i < this._animators.length; ++i) {
      if (this._animators[i] === animator) {
        this._animators.splice(i, 1);
        return;
      }
    }
  }

  // For FormMouseDownEvent only.
  setCapture(control: ControlAtPointData, drag: boolean) {
    if (this._capture) {
      // TODO... this is probably fine in most cases?
    }
    if (drag) {
      this._dragCapture = control;
    } else {
      this._capture = control;
    }
  }

  restoreCapture() {
    if (this._restoreCapture) {
      this._capture = this._restoreCapture;
    }
  }

  // For FormMouseDownEvent only.
  setAllowDrag(control: ControlAtPointData, data: any) {
    this.setCapture(control, false);
    this._dragAllowed = true;
    this._dragData = data;
    this.cancelBubble();
  }

  cancelBubble() {
    this._bubbleMouseDown = false;
  }
}
