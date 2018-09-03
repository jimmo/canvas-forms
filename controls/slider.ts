import { MouseEventData } from '../core/surface';
import { Control } from '../core/control';
import { Event } from '../core/events';

export class Slider extends Control {
  change: Event;
  value: number = 0;
  min: number = 0;
  max: number = 1;

  constructor(value?: number, min?: number, max?: number) {
    super();

    this.value = value || 0;
    this.min = min || 0;
    this.max = max === undefined ? 1 : max;

    this.change = new Event();

    let down: MouseEventData = null;
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
      this.value = Math.min(1, Math.max(0, ((data.x - 8) / (this.w - 16)))) * (this.max - this.min) + this.min;
      this.change.fire();
      this.repaint();
    });
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
}
