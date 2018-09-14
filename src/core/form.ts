import { Surface, SurfaceMouseEvent, SurfaceScrollEvent, SurfaceKeyEvent } from './surface';
import { Control, ControlAtPointData } from './control';
import { Animator } from '../animation';

export class FormMouseDownEvent extends SurfaceMouseEvent {
  constructor(x: number, y: number, buttons: number, private readonly form: Form, private readonly hit: ControlAtPointData) {
    super(x, y, buttons);
  }

  // Direct all future mouse events to this control until the mouse is released.
  capture() {
    this.form.setCapture(this.hit);
  }

  // Tell the form that if the mouse moves while still down, then begin a drag.
  allowDrag(data: any) {
    this.form.setAllowDrag(this.hit, data);
  }
}

export class FormMouseMoveEvent extends SurfaceMouseEvent {
  constructor(x: number, y: number, buttons: number, readonly dx: number, readonly dy: number) {
    super(x, y, buttons);
  }
}

export class FormMouseUpEvent extends SurfaceMouseEvent {
  constructor(x: number, y: number, buttons: number) {
    super(x, y, buttons);
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

  fontSize = 18;
  fontName = 'sans';
  color = '#202020';

  private _editing = false;

  // The control that last received a mouse events.
  private _focus: ControlAtPointData;

  // A control that called `ev.capture()` on a FormMouseDownEvent.
  // (i.e. we should send future mouse events to it, rather than doing
  // hit detection).
  private _capture: ControlAtPointData;

  // Should the next mousemove be considered to be a drag.
  private _dragAllowed: boolean;
  // Data (specified by the control that allowed dragging) to be passed to the drop target.
  private _dragData: any;
  // The coordinates that we're current dragging to (needed to so we can paint the overlay at
  // the correct location).
  private _dragCoordinates: MouseEvent;
  // The last control that we thought was the drag target (i.e. we set `.dragTarget = true` on
  // it so we need to keep a reference to it so we can unset that if we move over a different control.
  private _dragTargetControl: Control;

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

    // When the mouse wheel is activated on the surface, send a scroll event to
    // the last control that a mouse event was delivered to.
    this.surface.scroll.add(data => {
      if (this._focus) {
        // Walk up the tree to find a control that actually accepts the scroll event.
        // This allows us to have scrollboxes inside scrollboxes, etc.
        // Scrolling controls should return false at the end of their range.
        let c = this._focus.control;
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
      if (this._capture && !data.primaryButton()) {
        // We have capture, but the mouse is moving without the button down.
        // This means we missed the mouseup event (maybe happened outside browser), so
        // inject a fake one.
        this._capture.update(data.x, data.y);
        this._capture.control.mouseup.fire(new FormMouseUpEvent(this._capture.x, this._capture.y, data.buttons));
        this.endCapture();
      }

      if (this._capture && this._dragAllowed) {
        // Capture is enabled and the control has indicated that it's a drag source.
        this._dragCoordinates = data;

        // Remove the `dragTarget` state from the previous target.
        if (this._dragTargetControl) {
          (this._dragTargetControl as Form).dragTarget = false;
        }

        // Hit test and set `dragTarget` on the current target.
        // Note we set `all=true` to hit test all controls (not just the ones with
        // mouse event handlers).
        const dragTarget = this.controlAtPoint(data.x, data.y, true).control;
        if (dragTarget !== this._capture.control && dragTarget.allowDrop(this._dragData)) {
          (dragTarget as Form).dragTarget = true;
          this._dragTargetControl = dragTarget;
        }
      }

      // Either deliver the mouse move event to the current capture, or hit test to find
      // the control under the mouse.
      let target = this._capture;
      if (target) {
        target.update(data.x, data.y);
      } else {
        target = this.controlAtPoint(data.x, data.y);
        // Remember the last control that saw a mouse event.
        this.updateFocus(target);
      }

      // Send the mouse move event to the target.
      target.control.mousemove.fire(new FormMouseMoveEvent(target.x, target.y, data.buttons, data.x - target.startX, data.y - target.startY));

      // Editing means that we likely need to redraw the constraints.
      if (!this._capture && this.editing()) {
        this.repaint();
      }

      // If we're currently mid-drag, then we'll need to paint the drag overlay.
      if (this._capture && this._dragCoordinates) {
        this.repaint();
      }
    });

    // Forward mouse down events to the control under the cursor.
    this.surface.mousedown.add(data => {
      if (!data.primaryButton()) {
        return;
      }
      if (this._capture) {
        // Should be impossible.
        return;
      }
      const hit = this.controlAtPoint(data.x, data.y);
      hit.control.mousedown.fire(new FormMouseDownEvent(hit.x, hit.y, data.buttons, this, hit));
    });

    this.surface.mouseup.add(data => {
      if (data.primaryButton()) {
        return;
      }

      // If we have a capture rarget, then send the up event to it instead.
      let target = this._capture;
      if (target) {
        // Update the control-at-point data with the new mouse coordinates.
        // (Note that this might indicate that the coordinates are outside the bounds of the control
        // which is fine because that's how capture works).
        target.update(data.x, data.y);

        // But if we're mid-drag, then we need to also notify the drop (if allowed).
        if (this._dragCoordinates) {
          const dropTarget = this.controlAtPoint(data.x, data.y).control;
          if (dropTarget.allowDrop(this._dragData)) {
            dropTarget.drop(this._dragData);
          }
        }

        this.endCapture();

        // Repaint to hide the drag overlay.
        this.repaint();
      } else {
        // Otherwise, send the up event to whatever is undert the cursor.
        target = this.controlAtPoint(data.x, data.y);
      }

      target.control.mouseup.fire(new FormMouseUpEvent(target.x, target.y, data.buttons));
    });

    // TODO: Remove this event and just have the surface send scroll events (which should
    // include the mouse coordinates, so we can just do a regular hit test).
    this.surface.mousewheel.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      this.updateFocus(hit);
    });

    // Send the key event to all the controls in the hierarchy above the current focus.
    // TODO: provide a way to stop walking up the hierarchy, e.g. `ev.cancelBubble()`.
    this.surface.keydown.add(data => {
      if (this._focus) {
        let control = this._focus.control;
        while (control) {
          control.keydown.fire(new FormKeyEvent(data.key));
          control = control.parent;
        }
      }
    });
  }

  // Somehow the mouse was released, so end capture.
  private endCapture() {
    this._capture = null;
    this._dragAllowed = false;
    this._dragData = null;
    if (this._dragTargetControl) {
      (this._dragTargetControl as Form).dragTarget = false;
    }
    this._dragTargetControl = null;
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

  protected paint(ctx: CanvasRenderingContext2D) {
    // Forms have a default (opaque) background color.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.w, this.h);

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
      this.paint(this.context());
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
  context() {
    return this.surface.ctx;
  }

  // Returns true if this form is in edit mode.
  // TODO: Make only sub-hierarchies editable.
  editing(enable?: boolean) {
    if (enable !== undefined) {
      this._editing = enable;
    }
    return this._editing;
  }

  // Override the default implementation in Control (that returns `parent.form()`).
  form(): Form {
    return this;
  }

  // Default width & height for controls that do not get these through constraints.
  defaultWidth(): number {
    return 160;
  }
  defaultHeight(): number {
    return 32;
  }

  // Override the default implementaiton in Control (we're the root control, so at 0,0).
  formX(): number {
    return 0;
  }
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

  // Register the animator with this form (so it receives callback every frame).
  addAnimator(animator: Animator) {
    this._animators.push(animator);
  }

  // Stop this animator from receiving frame callbacks.
  // Many animators are single-use, so this will remove the last reference to these temporary animators.
  removeAnimator(animator: Animator) {
    for (let i = 0; i < this._animators.length; ++i) {
      if (this._animators[i] === animator) {
        this._animators.splice(i, 1);
        return;
      }
    }
  }

  // For FormMouseDownEvent only.
  setCapture(control: ControlAtPointData) {
    this._capture = control;
  }

  // For FormMouseDownEvent only.
  setAllowDrag(control: ControlAtPointData, data: any) {
    this.setCapture(control);
    this._dragAllowed = true;
    this._dragData = data;
  }

}
