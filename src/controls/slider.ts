import { FormMouseDownEvent } from '../core/form';
import { Control } from '../core/control';
import { EventSource } from '../core/events';

export class Slider extends Control {
  change: EventSource;
  value: number = 0;
  min: number = 0;
  max: number = 1;
  snap: number = 0;

  constructor(value?: number, min?: number, max?: number, snap?: number) {
    super();

    this.value = value || 0;
    this.min = min || 0;
    this.max = max === undefined ? 1 : max;
    this.snap = snap;

    this.change = new EventSource();

    let down: FormMouseDownEvent = null;
    this.mousedown.add((data) => {
      data.capture();
      down = data;
    });
    this.mouseup.add((data) => {
      down = null;
    });
    this.mousemove.add((data) => {
      if (!down) {
        return;
      }
      this.setValue(Math.min(1, Math.max(0, ((data.x - 8) / (this.w - 16)))) * (this.max - this.min) + this.min);
    });
  }

  setValue(v: number) {
    this.value = Math.min(this.max, Math.max(this.min, v));
    if (this.snap) {
      this.value = Math.round(this.value / this.snap) * this.snap;
    }
    this.change.fire();
    this.repaint();
  }

  paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    ctx.fillStyle = '#ff9800';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    ctx.strokeRect(0, 0, this.w, this.h);

    let x = (this.w - 16) * (this.value - this.min) / (this.max - this.min);
    ctx.fillRect(x, 2, 16, this.h - 4);
  }

  scrollBy(dx: number, dy: number): boolean {
    if (this.snap) {
      this.setValue(this.value + Math.sign(dy) * this.snap);
    } else {
      this.setValue(this.value + dy * (this.max - this.min) / 2000);
    }
    return true;
  }
}
