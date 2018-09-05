import { Control } from '../core/control';

// Simple single-line text control that sizes to content.
export class Label extends Control {
  text: string;
  fit: boolean = true;

  constructor(text?: string) {
    super();

    this.text = text || '';
  }

  paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    // // For testing, fill the background.
    // ctx.fillStyle = '#c0c0c0';
    // ctx.fillRect(0, 0, this.w, this.h);

    // Draw the text, centered vertically and left aligned.
    ctx.font = this.getFont();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, 0, this.h / 2);
  }

  setText(text: string) {
    this.text = text;
    if (this.parent) {
      this.parent.relayout();
    }
  }

  selfConstrain() {
    if (!this.fit) {
      return false;
    }
    this.context().font = this.getFont();
    this.w = Math.ceil(this.context().measureText(this.text).width) + 10;
    this.h = Math.max(this.form().defaultHeight(), this.getFontSize() + 2);
    return true;
  }
}
