import { Control, ControlEventData } from '../core/control';
import { Event } from '../core/events';


// Fired when a checkbox state changes by user input.
export class CheckboxToggleEventData extends ControlEventData {
  constructor(control: Control, readonly checked: boolean) {
    super(control);
  }
}

export class Checkbox extends Control {
  text: string;
  private down: boolean;
  checked: boolean;

  on: Event;
  off: Event;
  toggle: Event;

  constructor(text: string, checked?: boolean) {
    super();

    this.text = text || '';
    this.down = false;
    this.checked = checked || false;

    this.on = new Event();
    this.off = new Event();
    this.toggle = new Event();

    this.mousedown.add((data) => {
      this.down = true;
      this.repaint();
    });
    this.mouseup.add((data) => {
      if (this.down) {
        this.checked = !this.checked;
        const ev = new CheckboxToggleEventData(this, this.checked);
        this.toggle.fire(ev);
        if (this.checked) {
          this.on.fire(ev);
        } else {
          this.off.fire(ev);
        }
      }
      this.down = false;
      this.repaint();
    });
  }

  paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.h, this.h);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, this.h, this.h);

    if (this.checked) {
      ctx.fillStyle = 'orange';
      ctx.fillRect(3, 3, this.h - 6, this.h - 6);
    }

    ctx.font = this.getFont();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, this.h + 5, this.h / 2, this.w - this.h - 4);
  }
}
