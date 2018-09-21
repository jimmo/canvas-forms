import { SurfaceMouseEvent } from '../core/surface';
import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { CoordAxis } from '../core/enums';
import { StaticConstraint } from '../constraints/static';
import { CoordAnimator, EasingFunction } from '../animation';
import { FormMouseDownEvent } from '../core';

// Draggable control that can adjust the value of a static constraint.
// A common use case would be to make a control resizable -- place the grabber
// next to it (positioned using the x and/or y coordinates passed to the constructor),
// and use an align constraint to position the control relative to the grabber.
export class Grabber extends Control {
  // The mouse coordinates that started a drag.
  private _startX: number;
  private _startY: number;

  // The constraints that this grabber should adjust when dragged.
  private _xConstraint: StaticConstraint;
  private _yConstraint: StaticConstraint;

  // Optional (min,max) bounds for each of the axes.
  private _bounds: Map<CoordAxis, [number, number]> = new Map();

  // Place the grabber at the specified x and/or y location.
  // Whichever of x and/or y is specified will define the axes that the grabber can slide along.
  constructor(x?: number, y?: number) {
    super();

    this._startX = x;
    this._startY = y;

    // No bounds by default.
    this._bounds.set(CoordAxis.X, [null, null]);
    this._bounds.set(CoordAxis.Y, [null, null]);

    // Simple mouse down/move/up drag handler.
    let down: FormMouseDownEvent = null;
    this.mousedown.add((data) => {
      data.capture();
      data.cancelBubble();
      down = data;
      this._startX = this.x;
      this._startY = this.y;
    });
    this.mouseup.add((data) => {
      down = null;
    });
    this.mousemove.add((data) => {
      if (!down) {
        return;
      }

      if (this._xConstraint) {
        this._xConstraint.set(this.clamp(CoordAxis.X, this._startX + data.dragX));
      }
      if (this._yConstraint) {
        this._yConstraint.set(this.clamp(CoordAxis.Y, this._startY + data.dragY));
      }
    });
  }

  // Clamp a new attempted x or y value to the grabber's bounds (if any).
  private clamp(axis: CoordAxis, v: number) {
    const range = this._bounds.get(axis);
    if (range[0] !== null && range[0] !== undefined) {
      v = Math.max(range[0], v);
    }
    if (range[1] !== null && range[1] !== undefined) {
      v = Math.min(range[1], v);
    }
    return v;
  }

  // Set the min and/or max bounds for a specified axis.
  setBound(axis: CoordAxis, min?: number, max?: number) {
    this._bounds.set(axis, [min, max]);
  }

  protected added() {
    // Now that we've been added to a parent, create the static constraints that position the grabber.
    if (this._startX) {
      this._xConstraint = this.coords.x.set(this._startX);
    }
    if (this._startY) {
      this._yConstraint = this.coords.y.set(this._startY);
    }
  }

  // Helper to animate this grabber's static constraint.
  animate(axis: CoordAxis, min: number, max: number, duration?: number, easing?: EasingFunction) {
    if (axis === CoordAxis.X && this._xConstraint) {
      return new CoordAnimator(this._xConstraint, min, max, duration, easing);
    } else if (axis === CoordAxis.Y && this._yConstraint) {
      return new CoordAnimator(this._yConstraint, min, max, duration, easing);
    }
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    // TODO: Figure out a good visual style for the grabber.
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, this.w, this.h);
  }
}
