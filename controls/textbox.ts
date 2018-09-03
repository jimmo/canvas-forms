import { Control, ControlEventData } from '../core/control';
import { Event } from '../core/events';

// Fired when a textbox's text changes by user input.
export class TextboxChangeEventData extends ControlEventData {
  constructor(control: Control, readonly text: string) {
    super(control)
  }
}

export class Textbox extends Control {
  text: string;
  change: Event;
  private elem: HTMLInputElement;

  constructor(text: string) {
    super();

    this.text = text || '';
    this.change = new Event();

    this.elem = null;
  }

  unpaint() {
    if (this.elem) {
      this.elem.remove();
      this.elem = null;
    }
  }

  paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    if (!this.elem) {
      this.elem = document.createElement('input');
      this.elem.type = 'text';
      this.elem.style.position = 'sticky';
      this.elem.style.boxSizing = 'border-box';
      this.elem.style.border = 'none';
      this.elem.style.background = 'none';
      this.elem.style.paddingLeft = '3px';
      this.elem.value = this.text;
      this.elem.addEventListener('input', (ev) => {
        this.text = this.elem.value;
        this.change.fire(new TextboxChangeEventData(this, this.text));
      });
      this.context().canvas.parentElement.appendChild(this.elem);
    }

    const s = this.form().surface.pixelScale();
    this.elem.style.left = this.surfaceX() / s + 'px';
    this.elem.style.top = this.surfaceY() / s + 'px';
    this.elem.style.width = this.w / s + 'px';
    this.elem.style.height = this.h / s + 'px';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, this.w, this.h);
  }

  removed() {
    this.unpaint();
  }
}
