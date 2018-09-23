import { Control, LabelText } from '../core/control';

export enum FontStyle {
  BOLD = 1,
  ITALIC = 2,
  STRIKETHROUGH = 4,
  UNDERLINE = 8,
}

// Base class for controls such as Label/Button/Checkbox that have some sort of text.
export abstract class TextControl extends Control {
  // The text is either a string or a callback that returns a string.
  // This allows for extremely simple "data binding".
  private _text: LabelText;
  private style: FontStyle;
  private _icon: string;
  private _iconFontName: string;

  // Default font and color used by many controls (e.g. Label, Button, Checkbox, etc).
  private fontName: string = null;
  private fontSize: number = null;
  private color: string = null;

  constructor(text?: LabelText) {
    super();

    this._text = text || '';
  }

  // Returns the text as a string (i.e. handles when `this._text` is a function).
  get text(): string {
    if (this._text instanceof Function) {
      return this._text();
    } else {
      return this._text;
    }
  }

  get icon(): string {
    return this._icon;
  }

  get iconFontName(): string {
    return this._iconFontName;
  }

  // Replace the control's text and repaint.
  // Some controls might choose to override this and additionally `relayout()`.
  setText(text: string) {
    this._text = text;
    this.repaint();
  }

  setFont(name?: string, size?: number, color?: string) {
    this.fontName = name || this.fontName;
    this.fontSize = size || this.fontSize;
    this.color = color || this.color;
  }

  setStyle(style: FontStyle, enable?: boolean) {
    if (enable === true) {
      this.addStyle(style);
    } else if (enable === false) {
      this.removeStyle(style);
    } else {
      this.style = style;
    }
  }

  addStyle(style: FontStyle) {
    this.style |= style;
  }

  removeStyle(style: FontStyle) {
    this.style &= ~style;
  }

  // Returns a font that can be used by the context.
  protected getFont() {
    let prefix = '';
    if (this.style & FontStyle.BOLD) {
      prefix += 'bold ';
    }
    if (this.style & FontStyle.ITALIC) {
      prefix += 'italic ';
    }
    return prefix + this.getFontSize() + 'px ' + this.getFontName();
  }

  // Returns the font name only.
  protected getFontName(): string {
    return this.fontName || 'sans';
  }

  // Returns the font size in pixels.
  protected getFontSize(): number {
    return this.fontSize || 18;
  }

  // Returns the default foreground color for this control.
  protected getColor(): string {
    return this.color || '#202020';
  }

  setIcon(icon: string) {
    const v = icon.split(',');
    this._iconFontName = v[0];
    this._icon = v[1];
    this.repaint();
  }
}
