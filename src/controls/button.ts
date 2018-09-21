import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { FillConstraint } from '../constraints/fill';
import { CoordAxis, Coord } from '../core/enums';
import { StaticConstraint } from '../constraints/static';
import { TextControl } from './textcontrol';

export class Button extends TextControl {
  // Remember down state so paint can draw the button appropriately.
  private down: boolean = false;

  click: EventSource;

  constructor(text?: string) {
    super(text);

    this.click = new EventSource();

    // Simple button down, capture, and up-still-inside click handler.
    this.mousedown.add((ev) => {
      this.down = true;
      ev.capture();
      this.repaint();
    });
    this.mouseup.add((ev) => {
      if (!this.down) {
        return;
      }

      this.down = false;

      console.log(ev.capture);

      if (ev.capture && this.inside(ev.x, ev.y)) {
        this.click.fire();
      }

      this.repaint();
    });
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    // Background colour.
    if (this.down) {
      ctx.fillStyle = '#ff9800';
    } else {
      ctx.fillStyle = '#ffeecc';
    }

    // Border colour & style.
    if (this.down) {
      ctx.strokeStyle = 'black';
    } else {
      ctx.strokeStyle = '#cc8020';
    }
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    // Radius for the border edge. When in a ButtonGroup, the button needs
    // to disable rounded corners on one (or both) of it's left or right side.
    const r = 6;
    let rl = r;
    let rr = r;
    if (this.parent instanceof ButtonGroup) {
      if (this !== this.parent.controls[0]) {
        rl = 0;
      }
      if (this !== this.parent.controls[this.parent.controls.length - 1]) {
        rr = 0;
      }
    }

    // Define rounded rect.
    ctx.beginPath();
    ctx.moveTo(rl, 0);
    ctx.lineTo(this.w - rr, 0);
    ctx.arcTo(this.w, 0, this.w, rr, rr);
    ctx.lineTo(this.w, this.h - rr);
    ctx.arcTo(this.w, this.h, this.w - rr, this.h, rr);
    ctx.lineTo(rl, this.h);
    ctx.arcTo(0, this.h, 0, this.h - rl, rl);
    ctx.lineTo(0, rl);
    ctx.arcTo(0, 0, rl, 0, rl);

    // Draw a very faint dropshadow when the mouse is down.
    if (this.down) {
      ctx.shadowColor = '#c0c0c0';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }

    // Fill rounded rect, with shadow.
    ctx.fill();

    // Stroke border, no shadow.
    ctx.shadowColor = 'transparent';
    ctx.stroke();

    // Draw text.
    ctx.font = this.getFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.evalText(), this.w / 2, this.h / 2, this.w);
  }
}

// A control that contains a row of buttons, where the buttons automatically
// fill the width evenly.
export class ButtonGroup extends Control {
  // The fill constraint that applies to all the buttons.
  // If a button is added/removed, then the fill constraint is destroyed and replaced.
  private fill: FillConstraint;

  // The constraint that sets x2 on the final control. Replaced if a button is added/removed.
  private end: StaticConstraint;

  constructor() {
    super();
  }

  // Override `Control::add`.
  add<T extends Control>(control: T, x?: number | any, y?: number, w?: number, h?: number, x2?: number, y2?: number, xw?: number, yh?: number, x2w?: number, y2h?: number): T {
    if (!(control instanceof Button)) {
      throw new Error('Only Buttons can be added to ButtonGroups');
    }

    super.add(control);

    // All buttons are sized to the height of the ButtonGroup.
    control.coords.y.set(0);
    control.coords.y2.set(0);

    // If we already had some buttons, then replace the existing constraints.
    if (this.fill) {
      this.fill.remove();
      this.fill = null;
    }
    if (this.end) {
      this.end.remove();
      this.end = null;
    }

    // The first button is always aligned to the left edge.
    if (this.controls.length === 1) {
      control.coords.x.set(0);
    }
    // The last button is always aligned to the right edge.
    this.end = control.coords.x2.set(0);

    // Evenly distribute the parent's width to the buttons.
    // Note: A single button doesn't need a fill constraint.
    if (this.controls.length >= 2) {
      control.coords.x.align(this.controls[this.controls.length - 2].coords.xw);
      this.fill = new FillConstraint(this.controls, Coord.W);
    }

    return control;
  }
}
