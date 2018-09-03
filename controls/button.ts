import { Control } from '../core/control';
import { Event } from '../core/events';

export class Button extends Control {
  private text: string;
  private down: boolean = false;

  click: Event;

  constructor(text?: string) {
    super();

    this.text = text || '';
    this.click = new Event();

    this.mousedown.add((data) => {
      this.down = true;
      data.capture();
      this.repaint();
    });
    this.mouseup.add((data) => {
      if (!this.down) {
        return;
      }

      this.down = false;

      if (this.inside(data.x, data.y)) {
        this.click.fire();
      }

      this.repaint();
    });
  }

  paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);


    if (this.down) {
      ctx.fillStyle = '#ff9800';
    } else {
      ctx.fillStyle = '#ffeecc';
    }

    if (this.down) {
      ctx.strokeStyle = 'black';
    } else {
      ctx.strokeStyle = '#cc8020';
    }
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    const r = 6;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(this.w - r, 0);
    ctx.arcTo(this.w, 0, this.w, r, r);
    ctx.lineTo(this.w, this.h - r);
    ctx.arcTo(this.w, this.h, this.w - r, this.h, r);
    ctx.lineTo(r, this.h);
    ctx.arcTo(0, this.h, 0, this.h - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);

    if (this.down) {
      ctx.shadowColor = '#c0c0c0';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.stroke();

    ctx.font = this.getFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, this.w / 2, this.h / 2, this.w);
  }

  setText(text: string) {
    this.text = text;
    if (this.parent) {
      this.parent.relayout();
    }
  }
}
