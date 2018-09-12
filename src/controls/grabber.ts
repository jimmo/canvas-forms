import { SurfaceMouseEvent } from '../core/surface';
import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { CoordAxis } from '../core/enums';
import { StaticConstraint } from '../constraints/static';
import { CoordAnimator, EasingFunction } from '../animation';

export class Grabber extends Control {
  private _startX: number;
  private _startY: number;
  private _xConstraint: StaticConstraint;
  private _yConstraint: StaticConstraint;
  private _bounds: Map<CoordAxis, [number, number]> = new Map();

  constructor(x: number, y: number, private readonly axes: CoordAxis[]) {
    super();

    this._startX = x;
    this._startY = y;

    this._bounds.set(CoordAxis.X, [null, null]);
    this._bounds.set(CoordAxis.Y, [null, null]);

    let down: MouseEvent = null;
    this.mousedown.add((data) => {
      data.capture();
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

      if (this._xConstraint && this.axes.indexOf(CoordAxis.X) >= 0) {
        this._xConstraint.set(this.clamp(CoordAxis.X, this._startX + data.dx));
      }
      if (this._yConstraint && this.axes.indexOf(CoordAxis.Y) >= 0) {
        this._yConstraint.set(this.clamp(CoordAxis.Y, this._startY + data.dy));
      }
    });
  }

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

  bound(axis: CoordAxis, min?: number, max?: number) {
    this._bounds.set(axis, [min, max]);
  }

  protected added() {
    this._xConstraint = this.coords.x.set(this._startX);
    this._yConstraint = this.coords.y.set(this._startY);
  }

  animate(axis: CoordAxis, min: number, max: number, duration?: number, easing?: EasingFunction) {
    if (axis === CoordAxis.X) {
      return new CoordAnimator(this._xConstraint, min, max, duration, easing);
    } else if (axis === CoordAxis.Y) {
      return new CoordAnimator(this._yConstraint, min, max, duration, easing);
    }
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, this.w, this.h);
  }
}
