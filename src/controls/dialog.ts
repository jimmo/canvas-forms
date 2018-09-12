import { Control } from '../core/control';
import { Form } from '../core/form';
import { Modal } from './modal';

export class Dialog extends Control {
  private _modal: Modal = null;
  private _w: number = 500;
  private _h: number = 300;

  constructor(w?: number, h?: number) {
    super();
    this._w = w || this._w;
    this._h = h || this._h;
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
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

    ctx.fill();
    ctx.stroke();

    super.paint(ctx);
  }

  async modal(f: Form) {
    this._modal = new Modal(this);
    return await this._modal.show(f);
  }

  close(data?: any) {
    if (this._modal) {
      this._modal.close(data);
    } else {
      this.remove();
    }
  }

  selfConstrain() {
    this.w = this._w;
    this.h = this._h;
    return true;
  }
}
