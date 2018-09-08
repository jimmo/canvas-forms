import { Dialog } from './dialog';
import { Control } from '../core/control';
import { CoordAxis } from '../core/enums';
import { Form } from '../core/form';
import { OpacityAnimator } from '../animation/opacity';

export class Modal extends Control {
  _resolve: (data?: any) => void;

  constructor(readonly dialog: Dialog) {
    super();

    this.add(dialog);
    dialog.coords.center(CoordAxis.X);
    dialog.coords.center(CoordAxis.Y);

    this.enableHitDetection();
  }

  paint(ctx: CanvasRenderingContext2D) {
    const a = ctx.globalAlpha;
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = a;

    super.paint(ctx);
  }

  selfConstrain() {
    this.x = 0;
    this.y = 0;
    this.x2 = 0;
    this.y2 = 0;
    return true;
  }

  show(f: Form) {
    this.opacity = 0;
    f.add(this);
    f.pushLayer(this);
    return new Promise<any>(async resolve => {
      await new OpacityAnimator(this, 0, 1, 200).start();
      this._resolve = resolve;
    });
  }

  async close(data: any) {
    await new OpacityAnimator(this, 1, 0, 200).start();
    this.form().popLayer(this);
    this.remove();
    if (this._resolve) {
      this._resolve(data);
      this._resolve = null;
    }
  }
}
