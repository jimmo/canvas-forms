import { Control, LabelText } from '../core/control';
import { TextControl } from './textcontrol';

// Simple text control that can size to content.
export class Label extends TextControl {
  // If true, then this control will "self-constrain" its width and height to fit
  // the text exactly.
  fit: boolean = false;

  // TODO: make Enum.
  center: boolean = false;

  constructor(text?: LabelText) {
    super(text);
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

    if (this.center) {
      ctx.textAlign = 'center';
    } else {
      ctx.textAlign = 'left';
    }

    // Split the text by newline and draw each line individually.
    const lines = this.text.split('\n');
    const lineHeight = (this.getFontSize() + 3);
    const y = this.h / 2 - lineHeight * (lines.length - 1) / 2;
    let x = 0;
    if (this.center) {
      x = this.w / 2;
      if (this.icon) {
        x += (this.getFontSize() + 10) / 2;
      }
    } else {
      if (this.icon) {
        x += this.getFontSize() + 10;
      }
    }
    let w = 0;
    for (let i = 0; i < lines.length; ++i) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
      w = Math.max(w, Math.ceil(ctx.measureText(lines[i]).width));
    }

    if (this.icon) {
      ctx.font = this.getFontSize() + 'px ' + this.iconFontName;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      if (this.center) {
        x = this.w / 2 - (this.getFontSize() + 10) / 2 - w;
      } else {
        x = this.getFontSize() / 2;
      }
      ctx.fillText(this.icon, x, this.h / 2);
    }
  }

  // Override from `TextControl` to also do a relayout.
  setText(text: string) {
    super.setText(text);

    if (this.fit) {
      // If we're sized to content, then we'll need a relayout.
      this.relayout();
    }
  }

  // Overriden from Control -- apply fit-to-text.
  selfConstrain() {
    if (!this.fit) {
      return false;
    }

    const text = this.text;

    // Width is the measured width of the widest line.
    this.context().font = this.getFont();
    const lines = text.split('\n');
    this.w = 0;
    for (const line of lines) {
      this.w = Math.max(this.w, Math.ceil(this.context().measureText(line).width) + 10);
    }

    if (this.icon) {
      this.w += this.getFontSize();
      if (this.text) {
        this.w += 10;
      }
    }

    // Height is based on number-of-lines times line-height.
    this.h = Math.max(this.form().defaultHeight(), lines.length * (this.getFontSize() + 3));
    return true;
  }
}
