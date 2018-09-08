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

    const lines = this.text.split('\n');
    const lineHeight = (this.getFontSize() + 3);
    const y = this.h / 2 - lineHeight * (lines.length - 1) / 2;
    for (let i = 0; i < lines.length; ++i) {
      ctx.fillText(lines[i], 0, y + i * lineHeight);
    }
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
    const lines = this.text.split('\n');
    this.w = 0;
    for (const line of lines) {
      this.w = Math.max(this.w, Math.ceil(this.context().measureText(this.text).width) + 10);
    }
    this.h = Math.max(this.form().defaultHeight(), lines.length * (this.getFontSize() + 3));
    return true;
  }
}
