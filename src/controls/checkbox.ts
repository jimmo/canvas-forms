import { Control, ControlEvent } from '../core/control';
import { EventSource } from '../core/events';
import { TextControl } from './textcontrol';


// Fired when a checkbox state changes by user input.
export class CheckBoxToggleEvent extends ControlEvent {
  constructor(control: Control, readonly checked: boolean) {
    super(control);
  }
}

export class CheckBox extends TextControl {
  // Current state of the checkbox.
  private _checked: boolean = false;

  // Tracks whether we're currently in the middle of a mouse capture.
  private down: boolean = false;

  // If we're inside a radio group, we need to coordinate with other checkboxes.
  radio: RadioGroup;

  // CheckBox events.
  on: EventSource<CheckBoxToggleEvent>;
  off: EventSource<CheckBoxToggleEvent>;
  toggle: EventSource<CheckBoxToggleEvent>;

  constructor(text?: string, checked?: boolean) {
    super(text);

    this._checked = this._checked || false;

    this.on = new EventSource();
    this.off = new EventSource();
    this.toggle = new EventSource();

    // On mouse down, change down state and enable capture so we get the mouse up event
    // no matter where it happens.
    this.mousedown.add((ev) => {
      this.down = true;
      ev.capture();
      this.repaint();
    });

    // On mouse up, if it happened inside the bounds of this control, then change checked state.
    this.mouseup.add((ev) => {
      if (!this.down) {
        return;
      }

      if (ev.capture && ev.inside) {
        this.checked = !this._checked;
      }

      this.down = false;
      this.repaint();
    });
  }

  get checked() {
    return this._checked;
  }

  set checked(checked: boolean) {
    // No-op if we're already in the desired state.
    if (this._checked === checked) {
      return;
    }

    // Update other checkboxes in the radio group if necessary.
    if (this.radio) {
      this.radio.clear(this);
    }

    // Change state and fire events.
    this._checked = checked;
    const ev = new CheckBoxToggleEvent(this, this._checked);
    this.toggle.fire(ev);
    if (this._checked) {
      this.on.fire(ev);
    } else {
      this.off.fire(ev);
    }
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    // Solid white background for the actual box part.
    ctx.fillStyle = this.form.style.color.background;

    // Make the box have a highlighted border if the mouse is currently down.
    if (this.down) {
      ctx.strokeStyle = this.form.style.color.selected;
    } else {
      ctx.strokeStyle = this.form.style.color.insetLeft;
    }

    ctx.lineJoin = 'round';

    if (this.radio) {
      // Radio boxes are round.
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.arc(this.h / 2, this.h / 2, this.h / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      // Checkboxes are square.
      ctx.fillRect(0, 0, this.h, this.h);
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, this.h, this.h);
    }

    // Add the orange check mark inside the box.
    if (this._checked) {
      ctx.fillStyle = this.form.style.color.selected;
      if (this.radio) {
        ctx.beginPath();
        ctx.arc(this.h / 2, this.h / 2, this.h / 2 - 3, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillRect(3, 3, this.h - 6, this.h - 6);
      }
    }

    // Draw the label part.
    ctx.font = this.getFont();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.h + 7, this.h / 2, this.w - this.h - 4);
  }
}

// Manages a set of checkboxes in a radio group.
// The checkboxes must be individually already added to the form, then added to the radio group.
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
    // Uncheck all but the currently selected checkbox.
    for (const checkbox of this.checkboxes) {
      if (checkbox === selected) {
        continue;
      }
      checkbox.checked = false;
    }
  }
};
