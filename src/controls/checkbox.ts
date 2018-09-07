import { Control, ControlEventData } from '../core/control';
import { Event } from '../core/events';


// Fired when a checkbox state changes by user input.
export class CheckBoxToggleEventData extends ControlEventData {
  constructor(control: Control, readonly checked: boolean) {
    super(control);
  }
}

export class CheckBox extends Control {
  text: string;
  checked: boolean;

  private down: boolean;
  radio: RadioGroup;

  on: Event;
  off: Event;
  toggle: Event;

  constructor(text?: string, checked?: boolean) {
    super();

    this.text = text || '';
    this.down = false;
    this.checked = checked || false;

    this.on = new Event();
    this.off = new Event();
    this.toggle = new Event();

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
        this.setChecked(!this.checked);
      }
      this.repaint();
    });
  }

  setChecked(checked: boolean) {
    if (this.checked === checked) {
      return;
    }
    if (this.radio) {
      this.radio.clear(this);
    }
    this.checked = checked;
    const ev = new CheckBoxToggleEventData(this, this.checked);
    this.toggle.fire(ev);
    if (this.checked) {
      this.on.fire(ev);
    } else {
      this.off.fire(ev);
    }
  }

  paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.h, this.h);

    if (this.down) {
      ctx.strokeStyle = 'orange';
    } else {
      ctx.strokeStyle = 'black';
    }
    ctx.lineJoin = 'round';

    if (this.radio) {
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.arc(this.h / 2, this.h / 2, this.h / 2, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, this.h, this.h);
    }

    if (this.checked) {
      ctx.fillStyle = 'orange';
      if (this.radio) {
        ctx.beginPath();
        ctx.arc(this.h / 2, this.h / 2, this.h / 2 - 3, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillRect(3, 3, this.h - 6, this.h - 6);
      }
    }

    ctx.font = this.getFont();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, this.h + 7, this.h / 2, this.w - this.h - 4);
  }
}

export class RadioGroup {
  private checkboxes: CheckBox[] = [];

  constructor(checkboxes?: CheckBox[]) {
    if (checkboxes) {
      for (const checkbox of checkboxes) {
        this.add(checkbox);
      }
    }
  }

  add(checkbox: CheckBox) {
    checkbox.radio = this;
    this.checkboxes.push(checkbox);
  }

  clear(selected: CheckBox) {
    for (const checkbox of this.checkboxes) {
      if (checkbox === selected) {
        continue;
      }
      checkbox.setChecked(false);
    }
  }
};
