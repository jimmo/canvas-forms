import { Control, LabelText } from '../core/control';

// Simple single-line text control that sizes to content.
export class Label extends Control {
  text: LabelText;
  fit: boolean = true;

  constructor(text?: LabelText) {
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

    const lines = this.evalText().split('\n');
    const lineHeight = (this.getFontSize() + 3);
    const y = this.h / 2 - lineHeight * (lines.length - 1) / 2;
    for (let i = 0; i < lines.length; ++i) {
      ctx.fillText(lines[i], 0, y + i * lineHeight);
    }
  }

  private evalText(): string {
    if (this.text instanceof Function) {
      return this.text();
    } else {
      return this.text;
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
    const lines = this.evalText().split('\n');
    this.w = 0;
    for (const line of lines) {
      this.w = Math.max(this.w, Math.ceil(this.context().measureText(this.evalText()).width) + 10);
    }
    this.h = Math.max(this.form().defaultHeight(), lines.length * (this.getFontSize() + 3));
    return true;
  }
}
