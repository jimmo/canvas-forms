import { FormMouseDownEvent } from '../core/form';
import { Control } from '../core/control';
import { EventSource } from '../core/events';

export class Slider extends Control {
  change: EventSource;
  private _value: number = 0;
  private _min: number = 0;
  private _max: number = 1;
  private _snap: number = 0;

  constructor(value?: number, min?: number, max?: number, snap?: number) {
    super();

    this._value = value || 0;
    this._min = min || 0;
    this._max = max === undefined ? 1 : max;
    this._snap = snap;

    this.change = new EventSource();

    this.mousedown.add((data) => {
      data.capture();
      data.cancelBubble();
    });
    this.mousemove.add((data) => {
      if (!data.capture) {
        return;
      }
      this.value = Math.min(1, Math.max(0, ((data.x - 8) / (this.w - 16)))) * (this._max - this._min) + this._min;
    });
  }

  get value() {
    return this._value;
  }

  set value(v: number) {
    this._value = Math.min(this._max, Math.max(this._min, v));
    if (this._snap) {
      this._value = Math.round(this._value / this._snap) * this._snap;
    }
    this.change.fire();
    this.repaint();
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    ctx.fillStyle = '#ff9800';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    ctx.strokeRect(0, 0, this.w, this.h);

    let x = (this.w - 16) * (this._value - this._min) / (this._max - this._min);
    ctx.fillRect(x, 2, 16, this.h - 4);
  }

  scrollBy(dx: number, dy: number): boolean {
    const v = this._value;
    if (this._snap) {
      this.value = this._value + Math.sign(dy) * this._snap;
    } else {
      this.value = this._value + dy * (this._max - this._min) / 2000;
    }
    return this._value !== v;
  }
}
