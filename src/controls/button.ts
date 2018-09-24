import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { FillConstraint } from '../constraints/fill';
import { CoordAxis, Coord } from '../core/enums';
import { StaticConstraint } from '../constraints/static';
import { LabelText, TextControl, FontStyle } from './textcontrol';

export class Button extends TextControl {
  // Remember down state so paint can draw the button appropriately.
  protected down: boolean = false;
  protected active: boolean = false;

  click: EventSource;

  constructor(text?: LabelText, icon?: LabelText) {
    super(text, icon);

    // Buttons have a border by default.
    this.border = true;

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

      if (ev.capture && this.inside(ev.x, ev.y)) {
        this.click.fire();
      }

      this.repaint();
    });
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    this.paintText(ctx);
  }

  protected paintText(ctx: CanvasRenderingContext2D) {
    // Draw text.
    ctx.font = this.getFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.color;

    let x = this.w / 2;
    if (this.iconCode) {
      x += (this.getFontSize() + 5) / 2;
    }
    ctx.fillText(this.text, x, this.h / 2, this.w);

    if (this.iconCode) {
      ctx.font = this.getFontSize() + 'px ' + this.iconFontName;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      let w = Math.ceil(ctx.measureText(this.text).width);
      x = this.w / 2;
      if (this.text) {
        x -= w / 2 + 5;
      }
      ctx.fillText(this.iconCode, x, this.h / 2);
    }

  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    // Background colour.
    if (this.down) {
      ctx.fillStyle = '#ff9800';
    } else if (this.active) {
      ctx.fillStyle = '#ffaa44';
    } else {
      ctx.fillStyle = '#ffeecc';
    }

    this.paintBorderPath(ctx);

    // Draw a very faint dropshadow when the mouse is down.
    if (this.down) {
      ctx.shadowColor = '#c0c0c0';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }

    // Fill rounded rect, with shadow.
    ctx.fill();

    ctx.shadowColor = 'transparent';

    if (this.parent instanceof ButtonGroup) {
      if (this !== this.parent.controls[0]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, this.h);
        ctx.strokeStyle = '#cc8020';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // Override this separately to customise the basic decorations (border, focus, etc).
  protected paintBorder(ctx: CanvasRenderingContext2D) {
    // Border colour & style.
    if (this.down) {
      ctx.strokeStyle = 'black';
    } else {
      ctx.strokeStyle = '#cc8020';
    }
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    this.paintBorderPath(ctx);

    // Stroke border, no shadow.
    ctx.stroke();
  }

  protected paintBorderPath(ctx: CanvasRenderingContext2D) {
    if (this.border) {
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
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(this.w, 0);
      ctx.lineTo(this.w, this.h);
      ctx.lineTo(0, this.h);
      ctx.closePath();
    }
  }

  setActive(value: boolean) {
    this.active = value;
    this.setStyleIf(FontStyle.BOLD, value);
    this.repaint();
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
