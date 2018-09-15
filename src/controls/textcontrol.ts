import { Control, LabelText } from '../core/control';

// Base class for controls such as Label/Button/Checkbox that have some sort of text.
export abstract class TextControl extends Control {
  // The text is either a string or a callback that returns a string.
  // This allows for extremely simple "data binding".
  text: LabelText;

  constructor(text?: LabelText) {
    super();

    this.text = text || '';
  }

  // Returns the text as a string (i.e. handles when `this.text` is a function).
  protected evalText(): string {
    if (this.text instanceof Function) {
      return this.text();
    } else {
      return this.text;
    }
  }

  // Replace the control's text and repaint.
  // Some controls might choose to override this and additionally `relayout()`.
  setText(text: string) {
    this.text = text;
    this.repaint();
  }
}
