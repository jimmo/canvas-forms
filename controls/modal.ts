import { Control } from '../core/control';
import { Coord } from '../core/enums';
import { Form } from '../core/form';
import { Dialog } from 'dialog';
import { Spacer } from 'spacer';
import { CoordAxis } from '../core/enums';
import { CenterConstraint } from '../constraints/center';

export class Modal extends Control {
  _resolve: (data?: any) => void;

  constructor(readonly dialog: Dialog) {
    super();

    this.add(dialog, null, null, 600, 300, null, null);
    new CenterConstraint(dialog, CoordAxis.X);
    new CenterConstraint(dialog, CoordAxis.Y);

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
    return new Promise<any>(resolve => {
      this._resolve = resolve;
    });
  }

  close(data: any) {
    this.remove();
    if (this._resolve) {
      this._resolve(data);
      this._resolve = null;
    }
  }
}
