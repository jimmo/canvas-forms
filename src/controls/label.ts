import { Control } from '../core/control';
import { LabelText, TextControl, TextAlign } from './textcontrol';
import { MenuItem } from '../core';

// Simple text control that can size to content.
export class Label extends TextControl {
  // If true, then this control will "self-constrain" its width and height to fit
  // the text exactly.
  private _fit: boolean = false;

  private _align: TextAlign = TextAlign.LEFT;

  constructor(text?: LabelText, icon?: LabelText) {
    super(text, icon);
  }

  get align() {
    return this._align;
  }

  set align(value: TextAlign) {
    this._align = value;
    this.repaint();
  }

  get fit() {
    return this._fit;
  }

  set fit(value: boolean) {
    this._fit = value;
    this.relayout();
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    // Draw the text, centered vertically and left aligned.
    ctx.font = this.getFont();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.color;

    if (this._align === TextAlign.CENTER) {
      ctx.textAlign = 'center';
    } else {
      ctx.textAlign = 'left';
    }

    // Split the text by newline and draw each line individually.
    const lines = this.text.split('\n');
    const lineHeight = (this.getFontSize() + 3);
    const y = this.h / 2 - lineHeight * (lines.length - 1) / 2;
    let x = 0;
    if (this._align === TextAlign.CENTER) {
      x = this.w / 2;
      if (this.iconCode) {
        x += (this.getFontSize() + 10) / 2;
      }
    } else {
      if (this.iconCode) {
        x += this.getFontSize() + 10;
      }
    }
    let w = 0;
    for (let i = 0; i < lines.length; ++i) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
      w = Math.max(w, Math.ceil(ctx.measureText(lines[i]).width));
    }

    if (this.iconCode) {
      ctx.font = this.getFontSize() + 'px ' + this.iconFontName;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      if (this._align === TextAlign.CENTER) {
        x = this.w / 2 - (this.getFontSize() + 10) / 2 - w;
      } else {
        x = this.getFontSize() / 2;
      }
      ctx.fillText(this.iconCode, x, this.h / 2);
    }
  }

  // Override from `TextControl` to also do a relayout.
  get text() {
    return super.text;
  }

  set text(text: string) {
    super.text = text;

    if (this._fit) {
      // If we're sized to content, then we'll need a relayout.
      this.relayout();
    }
  }

  // Overriden from Control -- apply fit-to-text.
  selfConstrain() {
    if (!this._fit) {
      return false;
    }

    const text = this.text;

    // Width is the measured width of the widest line.
    this.form.context.font = this.getFont();
    const lines = text.split('\n');
    this.w = 0;
    for (const line of lines) {
      this.w = Math.max(this.w, Math.ceil(this.form.context.measureText(line).width) + 10);
    }

    if (this.iconCode) {
      this.w += this.getFontSize();
      if (this.text) {
        this.w += 10;
      }
    }

    // Height is based on number-of-lines times line-height.
    this.h = Math.max(this.form.defaultHeight, lines.length * (this.getFontSize() + 3));
    return true;
  }
}
