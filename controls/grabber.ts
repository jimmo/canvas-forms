import { MouseEventData } from '../core/surface';
import { Control } from '../core/control';
import { Event } from '../core/events';
import { CoordAxis } from '../core/enums';
import { StaticConstraint } from '../constraints/static';

export class Grabber extends Control {
  private startX: number;
  private startY: number;
  private xConstraint: StaticConstraint;
  private yConstraint: StaticConstraint;
  private bounds: Map<CoordAxis, [number, number]> = new Map();

  constructor(x: number, y: number, private readonly axes: CoordAxis[]) {
    super();

    this.startX = x;
    this.startY = y;

    this.bounds.set(CoordAxis.X, [null, null]);
    this.bounds.set(CoordAxis.Y, [null, null]);

    let down: MouseEventData = null;
    this.mousedown.add((data) => {
      data.capture();
      down = data;
    });
    this.mouseup.add((data) => {
      down = null;
      this.startX = this.x;
      this.startY = this.y;
    });
    this.mousemove.add((data) => {
      if (!down) {
        return;
      }

      if (this.xConstraint && this.axes.indexOf(CoordAxis.X) >= 0) {
        this.xConstraint.set(this.clamp(CoordAxis.X, this.startX + data.dx));
      }
      if (this.yConstraint && this.axes.indexOf(CoordAxis.Y) >= 0) {
        this.yConstraint.set(this.clamp(CoordAxis.Y, this.startY + data.dy));
      }
    });
  }

  private clamp(axis: CoordAxis, v: number) {
    const range = this.bounds.get(axis);
    if (range[0] !== null && range[0] !== undefined) {
      v = Math.max(range[0], v);
    }
    if (range[1] !== null && range[1] !== undefined) {
      v = Math.min(range[1], v);
    }
    return v;
  }

  bound(axis: CoordAxis, min?: number, max?: number) {
    this.bounds.set(axis, [min, max]);
  }

  protected added() {
    this.xConstraint = this.coords.x.set(this.startX);
    this.yConstraint = this.coords.y.set(this.startY);
  }
}
