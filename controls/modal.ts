import { Dialog } from 'dialog';
import { Control } from '../core/control';
import { CoordAxis } from '../core/enums';
import { Form } from '../core/form';

export class Modal extends Control {
  _resolve: (data?: any) => void;

  constructor(readonly dialog: Dialog) {
    super();

    this.add(dialog);
    dialog.coords.size(600, 300);
    dialog.coords.center(CoordAxis.X);
    dialog.coords.center(CoordAxis.Y);

    this.enableHitDetection();
  }

  paint(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = 1;

    super.paint(ctx);
  }

  selfConstrain() {
    this.x = 0;
    this.x2 = 0;
    this.y = 0;
    this.y2 = 0;
    return true;
  }

  show(f: Form) {
    f.add(this);
    f.pushLayer(this);
    return new Promise<any>(resolve => {
      this._resolve = resolve;
    });
  }

  close(data: any) {
    this.form().popLayer(this);
    this.remove();
    if (this._resolve) {
      this._resolve(data);
      this._resolve = null;
    }
  }
}
