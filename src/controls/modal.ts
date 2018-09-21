import { Dialog } from './dialog';
import { Control } from '../core/control';
import { CoordAxis } from '../core/enums';
import { Form } from '../core/form';
import { OpacityAnimator } from '../animation/opacity';

// Container for a dialog that masks out the rest of the form.
export class Modal extends Control {
  // Call this to resolve the promise returned from `show`.
  private _resolve: (data?: any) => void;

  private constructor(readonly dialog: Dialog) {
    super();

    // Add the dialog and center it.
    this.add(dialog);
    dialog.coords.center(CoordAxis.X);
    dialog.coords.center(CoordAxis.Y);

    // As we're self-constrained to take up the entire form, by
    // enabling hit-detection and cancelling the event, we will prevent anything
    // else receiving mouse events as we'll always be the first match (other than the dialog
    // itself).
    this.mousedown.add((ev) => {
      ev.cancelBubble();
    });
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    // Draw an opaque background over the rest of the form.
    const a = ctx.globalAlpha;
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = a;

    super.paint(ctx);
  }

  // Override to fill the form.
  selfConstrain() {
    this.x = 0;
    this.y = 0;
    this.x2 = 0;
    this.y2 = 0;
    return true;
  }

  // Called from `Dialog::modal()`.
  static show(dialog: Dialog, f: Form) {
    // Add the Modal control to the form, animate it showing, and return a promise that will
    // complete when the dialog is closed.
    const modal = new Modal(dialog);
    f.add(modal);

    // Prevent HTML controls on other layers from being visible.
    f.pushLayer(modal);

    return new Promise<any>(async resolve => {
      // Animate the modal becoming visible.
      modal.opacity = 0;
      await new OpacityAnimator(modal, 0, 1, 200).start();

      // Remember the resolve callback so we can complete the promise in `close`.
      modal._resolve = resolve;
    });
  }

  // Make the modal (and the dialog) close. This is called from `Dialog::close()`.
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
