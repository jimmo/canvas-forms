import { Control, LabelText } from '../core/control';

// Simple text control that can size to content.
export class Label extends Control {
  // The text is either a string or a callback that returns a string.
  // This allows for extremely simple "data binding".
  text: LabelText;

  // If true, then this control will "self-constrain" its width and height to fit
  // the text exactly.
  fit: boolean = true;

  constructor(text?: LabelText) {
    super();

    this.text = text || '';
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    // // For testing, fill the background.
    // ctx.fillStyle = '#c0c0c0';
    // ctx.fillRect(0, 0, this.w, this.h);

    // Draw the text, centered vertically and left aligned.
    ctx.font = this.getFont();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();

    // Split the text by newline and draw each line individually.
    const lines = this.evalText().split('\n');
    const lineHeight = (this.getFontSize() + 3);
    const y = this.h / 2 - lineHeight * (lines.length - 1) / 2;
    for (let i = 0; i < lines.length; ++i) {
      ctx.fillText(lines[i], 0, y + i * lineHeight);
    }
  }

  // Returns the text as a string (i.e. handles when `this.text` is a function).
  private evalText(): string {
    if (this.text instanceof Function) {
      return this.text();
    } else {
      return this.text;
    }
  }

  // Replace the Label's text.
  setText(text: string) {
    this.text = text;

    if (this.parent && this.fit) {
      // If we're sized to content, then we'll need a relayout.
      this.parent.relayout();
    } else {
      // Otherwise just a paint.
      this.repaint();
    }
  }

  // Overriden from Control -- apply fit-to-text.
  selfConstrain() {
    if (!this.fit) {
      return false;
    }

    // Width is the measured width of the widest line.
    this.context().font = this.getFont();
    const lines = this.evalText().split('\n');
    this.w = 0;
    for (const line of lines) {
      this.w = Math.max(this.w, Math.ceil(this.context().measureText(this.evalText()).width) + 10);
    }

    // Height is based on number-of-lines times line-height.
    this.h = Math.max(this.form().defaultHeight(), lines.length * (this.getFontSize() + 3));
    return true;
  }
}
