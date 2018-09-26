import { Control, ControlEvent } from '../core/control';
import { EventSource } from '../core/events';
import { TextControl, TextAlign, FontStyle } from './textcontrol';

// Fired when a textbox's text changes by user input.
export class TextBoxChangeEvent extends ControlEvent {
  constructor(control: Control, readonly text: string) {
    super(control)
  }
}

class _TextBox extends TextControl {
  change: EventSource<TextBoxChangeEvent>;
  multiline: boolean = false;
  protected elem: (HTMLTextAreaElement | HTMLInputElement) = null;

  private _align: TextAlign = TextAlign.LEFT;

  constructor(text?: string) {
    super(text);

    this.border = true;

    this.change = new EventSource();
  }

  get align() {
    return this._align;
  }

  set align(value: TextAlign) {
    this._align = value;
    this.repaint();
  }

  unpaint() {
    if (this.elem) {
      // The blur event may be fired by 'remove', so clear this.elem first.
      const e = this.elem;
      this.elem = null;
      e.remove();
    }
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    if (this.elem && !this.form.allowDom(this)) {
      this.unpaint();
    }
    if (this.elem) {
      this.positionElem();
    }

    ctx.clearRect(0, 0, this.w, this.h);

    super.paint(ctx);

    if (!this.elem) {
      // TODO: This positioning is sometimes off by one pixel.
      // Possibly due to pixel rounding of the input/textarea positioning.
      ctx.font = this.getFont();
      let y = 3;
      if (this.multiline) {
        ctx.textBaseline = 'top';
      } else {
        ctx.textBaseline = 'middle';
        y = Math.round(this.h / 2);
      }
      if (this._align === TextAlign.CENTER) {
        ctx.textAlign = 'center';
      } else {
        ctx.textAlign = 'left';
      }

      let x = 3;
      if (this._align === TextAlign.CENTER) {
        x = this.w / 2 + 1;
      }

      ctx.fillStyle = this.color;

      const lines = this.text.split('\n');
      for (let i = 0; i < lines.length; ++i) {
        ctx.fillText(lines[i], x, y + i * (this.getFontSize() + 3));
      }
    }
  }

  protected createElem() {
    if (this.multiline) {
      this.elem = document.createElement('textarea');
    } else {
      this.elem = document.createElement('input');
      this.elem.type = 'text';
    }
    this.elem.value = this.text;
    this.elem.style.position = 'absolute';
    this.elem.style.boxSizing = 'border-box';
    this.elem.style.border = 'none';
    this.elem.style.background = 'none';
    this.elem.style.paddingLeft = '3px';
    this.elem.style.fontSize = this.form.surface.htmlunits(this.getFontSize()) + 'px';
    this.elem.style.fontFamily = this.getFontName();
    this.elem.style.fontWeight = this.hasStyle(FontStyle.BOLD) ? ' bold' : 'normal';
    this.elem.style.fontStyle = this.hasStyle(FontStyle.ITALIC) ? ' italic' : 'normal';
    this.elem.style.textAlign = this._align === TextAlign.CENTER ? 'center' : 'left';
    this.elem.addEventListener('input', (ev) => {
      this.text = this.elem.value;
      this.change.fire(new TextBoxChangeEvent(this, this.text));
    });
    (this.elem as HTMLElement).addEventListener('keypress', (ev) => {
      if (ev.keyCode === 13) {
        this.parent.submit();
      }
    });
    this.context.canvas.parentElement.insertBefore(this.elem, this.context.canvas);
  }

  protected positionElem() {
    this.elem.style.left = this.form.surface.htmlunits(this.formX) + 'px';
    this.elem.style.top = this.form.surface.htmlunits(this.formY) + 'px';
    this.elem.style.width = this.form.surface.htmlunits(this.w) + 'px';
    this.elem.style.height = this.form.surface.htmlunits(this.h) + 'px';

    // TODO: something's not quite right here when inside a modal and open/close
    // is animating.
    // Probably because the modal backdrop is mixing with the opaque dialog contents
    // (but not with the HTML textbox).
    this.elem.style.opacity = this.context.globalAlpha.toString();

    this.elem.value = this.text;
  }

  protected removed() {
    this.unpaint();
  }

  allowDrop(data: any) {
    return typeof data === 'string';
  }

  drop(data: any) {
    this.text = data;
  }
}

export class TextBox extends _TextBox {

  constructor(text?: string) {
    super(text);
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    if (!this.elem && this.form.allowDom(this)) {
      this.createElem();
    }

    super.paint(ctx);
  }
}

export class FocusTextBox extends _TextBox {
  constructor(text?: string) {
    super(text);

    this.mousedown.add((data) => {
      if (this.elem) {
        return;
      }

      this.createElem();
      this.positionElem();

      setTimeout(() => {
        this.elem.focus();

        const text = this.text;

        // TODO: Make 2d version of this for multiline.
        if (!this.multiline) {
          // Figure out which letter they clicked on and set the cursor appropriately.
          this.context.font = this.getFont();
          for (let i = 0; i < text.length; ++i) {
            // TODO: This should round, rathern than trunc.
            if (data.x < this.context.measureText(text.substr(0, i)).width) {
              this.elem.setSelectionRange(i - 1, i - 1);
              break;
            }
          }
        }
      }, 0);

      this.repaint();
    });
  }

  protected createElem() {
    super.createElem();
    this.elem.addEventListener('blur', (ev) => {
      this.unpaint();
      this.repaint();
    });
  }
}
