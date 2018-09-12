import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { FillConstraint } from '../constraints/fill';
import { CoordAxis, Coord } from '../core/enums';
import { StaticConstraint } from '../constraints/static';

export class Button extends Control {
  private text: string;
  private down: boolean = false;

  click: EventSource;

  constructor(text?: string) {
    super();

    this.text = text || '';
    this.click = new EventSource();

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


    let rl = 6;
    let rr = 6;
    if (this.parent instanceof ButtonGroup) {
      if (this !== this.parent.controls[0]) {
        rl = 0;
      }
      if (this !== this.parent.controls[this.parent.controls.length - 1]) {
        rr = 0;
      }
    }

    ctx.moveTo(rl, 0);
    ctx.lineTo(this.w - rr, 0);
    ctx.arcTo(this.w, 0, this.w, rr, rr);
    ctx.lineTo(this.w, this.h - rr);
    ctx.arcTo(this.w, this.h, this.w - rr, this.h, rr);
    ctx.lineTo(rl, this.h);
    ctx.arcTo(0, this.h, 0, this.h - rl, rl);
    ctx.lineTo(0, rl);
    ctx.arcTo(0, 0, rl, 0, rl);

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

export class ButtonGroup extends Control {
  private fill: FillConstraint;
  private end: StaticConstraint;

  constructor() {
    super();
  }

  add<T extends Control>(control: T, x?: number | any, y?: number, w?: number, h?: number, x2?: number, y2?: number, xw?: number, yh?: number, x2w?: number, y2h?: number): T {
    super.add(control);
    control.coords.y.set(0);
    control.coords.y2.set(0);

    if (this.fill) {
      this.fill.remove();
      this.fill = null;
    }
    if (this.end) {
      this.end.remove();
      this.end = null;
    }

    if (this.controls.length === 1) {
      control.coords.x.set(0);
    }
    this.end = control.coords.x2.set(0);

    if (this.controls.length >= 2) {
      control.coords.x.align(this.controls[this.controls.length - 2].coords.xw);
      this.fill = new FillConstraint(this.controls, Coord.W);
    }

    return control;
  }
}
