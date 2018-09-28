import { Control } from '../core/control';
import { Form } from '../core/form';
import { Modal } from './modal';
import { CoordAxis } from '../core';
import { TextBox } from './textbox';
import { Label } from './label';
import { Button } from './button';

// Floating modal (TODO: or modeless) dialog.
export class Dialog extends Control {
  private _modal: Modal = null;

  constructor() {
    super();
  }

  protected defaultConstraints() {
    this.coords.center(CoordAxis.X);
    this.coords.center(CoordAxis.Y);
  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    // Modals have a solid background inside a rounded-rect border.
    ctx.fillStyle = this.form.style.color.background;
    ctx.strokeStyle = this.form.style.color.background;
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
  }

  // Call this to show this dialog as a modal.
  // e.g. `const result = await new FooDialog().modal(myForm);`
  // Note: Dialog instances are single-use.
  async modal(f: Form) {
    return await Modal.show(this, f);
  }

  // Close this dialog, passing the specified data to the promise returned from `modal`.
  close(data?: any) {
    if (this.parent instanceof Modal) {
      this.parent.close(data);
    } else {
      this.remove();
    }
  }
}


// Simple dialog that asks for user input with OK/Cancel.
export class AlertDialog extends Dialog {
  constructor(text: string) {
    super();

    const l = this.add(new Label(text), 20, 20);
    l.fit = true;

    this.add(new Button('OK'), { x2: 20, y2: 20 }).click.add(() => {
      this.close();
    });
  }

  protected defaultConstraints() {
    this.coords.size(420, 180);
    super.defaultConstraints();
  }
}


// Simple dialog that asks for OK/Cancel.
export class ConfirmDialog extends Dialog {
  constructor(text: string) {
    super();

    const l = this.add(new Label(text), 20, 20);
    l.fit = true;

    this.add(new Button('Cancel'), { x2: 20, y2: 20 }).click.add(() => {
      this.close(false);
    });
    this.add(new Button('OK'), { x2: 190, y2: 20 }).click.add(() => {
      this.close(true);
    });
  }

  protected defaultConstraints() {
    this.coords.size(420, 180);
    super.defaultConstraints();
  }
}


// Simple dialog that asks for user input with OK/Cancel.
export class PromptDialog extends Dialog {
  name: TextBox;

  constructor(prompt: string, text?: string) {
    super();

    const l = this.add(new Label(prompt), 20, 20);
    l.fit = true;

    this.name = this.add(new TextBox(text), 20, 54);
    this.name.coords.x2.set(20);

    this.add(new Button('Cancel'), { x2: 20, y2: 20 }).click.add(() => {
      this.close(null);
    });
    this.add(new Button('OK'), { x2: 190, y2: 20 }).click.add(() => {
      this.close(this.name.text);
    });
  }

  protected defaultConstraints() {
    this.coords.size(420, 180);
    super.defaultConstraints();
  }

  submit() {
    this.close(this.name.text);
  }
}
