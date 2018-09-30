import { Control } from '../core/control';

export enum TextAlign {
  LEFT = 1,
  CENTER,
  // TODO: RIGHT,
}

export enum FontStyle {
  BOLD = 1,
  ITALIC = 2,
  STRIKETHROUGH = 4,
  UNDERLINE = 8,
}

// For simple text controls (label, button, checkbox), their text can
// be set directly or bound via a function.
export type LabelText = string | (() => string);

// Base class for controls such as Label/Button/Checkbox that have some sort of text.
export abstract class TextControl extends Control {
  // The text is either a string or a callback that returns a string.
  // This allows for extremely simple "data binding".
  private _text: LabelText;
  private _style: FontStyle;
  private _icon: LabelText;

  // Default font and color used by many controls (e.g. Label, Button, Checkbox, etc).
  private _fontName: string = null;
  private _fontSize: number = null;
  private _color: string = null;

  constructor(text?: LabelText, icon?: LabelText) {
    super();

    this._text = text || '';
    this._icon = icon || null;
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
    if (this._icon instanceof Function) {
      return this._icon();
    } else {
      return this._icon;
    }
  }

  get iconCode(): string {
    const icon = this.icon;
    if (icon) {
      return icon.split(',')[1];
    } else {
      return null;
    }
  }

  get iconFontName(): string {
    const icon = this.icon;
    if (icon) {
      return icon.split(',')[0];
    } else {
      return null;
    }
  }

  // Replace the control's text and repaint.
  // Some controls might choose to override this and additionally `relayout()`.
  set text(text: string) {
    this._text = text;
    this.repaint();
  }

  set textCallback(text: () => string) {
    this._text = text;
    this.repaint();
  }

  set icon(icon: string) {
    this._icon = icon;
    this.repaint();
  }

  set iconCallback(icon: () => string) {
    this._icon = icon;
    this.repaint();
  }

  setFont(name?: string, size?: number, color?: string) {
    this._fontName = name || this._fontName;
    this._fontSize = size || this._fontSize;
    this._color = color || this._color;
    this.repaint();
  }

  set fontName(name: string) {
    this._fontName = name;
    this.repaint();
  }

  set fontSize(size: number) {
    this._fontSize = size;
    this.repaint();
  }

  setStyleIf(style: FontStyle, enable?: boolean) {
    if (enable === true) {
      this.addStyle(style);
    } else if (enable === false) {
      this.removeStyle(style);
    } else {
      this._style = style;
    }
  }

  get style() {
    return this._style;
  }

  set style(style: FontStyle) {
    this._style = style;
  }

  addStyle(style: FontStyle) {
    this._style |= style;
  }

  removeStyle(style: FontStyle) {
    this._style &= ~style;
  }

  hasStyle(style: FontStyle) {
    return (this._style & style) !== 0;
  }

  toggleStyle(style: FontStyle) {
    this.setStyleIf(style, !this.hasStyle(style));
  }

  // Returns a font that can be used by the context.
  protected getFont() {
    let prefix = '';
    if (this._style & FontStyle.BOLD) {
      prefix += 'bold ';
    }
    if (this._style & FontStyle.ITALIC) {
      prefix += 'italic ';
    }
    return prefix + this.getFontSize() + 'px ' + this.getFontName();
  }

  // Returns the font name only.
  protected getFontName(): string {
    return this._fontName || this.form.style.font.name;
  }

  // Returns the font size in pixels.
  protected getFontSize(): number {
    return this._fontSize || this.form.style.font.size;
  }

  // Returns the default foreground color for this control.
  get color(): string {
    return this._color || this.form.style.color.text;
  }

  set color(color: string) {
    this._color = color;
    this.repaint();
  }
}
