// An empty control that can be used with constraints to provide an offset
// or a fill.
class Spacer extends Control {
}

// Simple single-line text control that sizes to content.
class Label extends Control {
  constructor(text) {
    super();

    this.text = text || '';
  }

  paint(ctx) {
    super.paint();

    // For testing, fill the background.
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, this.w, this.h);

    // Draw the text, centered vertically and left aligned.
    ctx.font = this.getFont();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, 0, this.h / 2);
  }

  setText(text) {
    this.text = text;
    if (this.parent) {
      this.parent.relayout();
    }
  }

  selfConstrain() {
    this.context().font = this.getFont();
    this.w = Math.ceil(this.context().measureText(this.text).width);
    this.h = this.getFontSize() + 2;
  }
}

class Button extends Control {
  constructor(text) {
    super();

    this.text = text || '';
    this.down = false;
    this.click = new Event();

    this.mousedown.add((data) => {
      this.down = true;
      this.repaint();
    });
    this.mouseup.add((data) => {
      if (this.down) {
        this.click.fire();
      }
      this.down = false;
      this.repaint();
    });
  }

  paint(ctx) {
    super.paint();


    if (this.down) {
      ctx.fillStyle = '#ff9800';
    } else {
      ctx.fillStyle = '#ffeecc';
    }

    if (this.down) {
      ctx.strokeStyle = 'black';
    } else {
      ctx.strokeStyle = '#cc8020';
    }
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    const r = 6;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(this.w - r, 0);
    ctx.arcTo(this.w, 0, this.w, r, r);
    ctx.lineTo(this.w, this.h - r);
    ctx.arcTo(this.w, this.h, this.w - r, this.h, r);
    ctx.lineTo(r, this.h);
    ctx.arcTo(0, this.h, 0, this.h - r, r);
    ctx.lineTo(0, r);
    ctx.arcTo(0, 0, r, 0, r);

    if (this.down) {
      ctx.shadowColor = '#c0c0c0';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.stroke();

    ctx.font = this.getFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, this.w / 2, this.h / 2, this.w);
  }
}

class Checkbox extends Control {
  constructor(text, checked) {
    super();

    this.text = text || '';
    this.down = false;
    this.checked = checked || false;

    this.on = new Event();
    this.off = new Event();
    this.toggle = new Event();

    this.mousedown.add((data) => {
      this.down = true;
      this.repaint();
    });
    this.mouseup.add((data) => {
      if (this.down) {
        this.checked = !this.checked;
        const ev = new CheckboxToggleEventData(this, this.checked);
        this.toggle.fire(ev);
        if (this.checked) {
          this.on.fire(ev);
        } else {
          this.off.fire(ev);
        }
      }
      this.down = false;
      this.repaint();
    });
  }

  paint(ctx) {
    super.paint();

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.h, this.h);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, this.h, this.h);

    if (this.checked) {
      ctx.fillStyle = 'orange';
      ctx.fillRect(3, 3, this.h - 6, this.h - 6);
    }

    ctx.font = this.getFont();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.getColor();
    ctx.fillText(this.text, this.h + 5, this.h / 2, this.w - this.h - 4);
  }
}

class Textbox extends Control {
  constructor(text) {
    super();

    this.text = text || '';
    this.change = new Event();

    this.elem = null;
  }

  paint(ctx) {
    super.paint();

    if (!this.elem) {
      this.elem = document.createElement('input');
      this.elem.type = 'text';
      this.elem.style.position = 'absolute';
      this.elem.style.boxSizing = 'border-box';
      this.elem.style.border = 'none';
      this.elem.style.background = 'none';
      this.elem.style.paddingLeft = '3px';
      this.elem.value = this.text;
      this.elem.addEventListener('input', (ev) => {
        this.text = this.elem.value;
        this.change.fire(new TextboxChangeEventData(this, this.text));
      });
      this.context().canvas.parentElement.append(this.elem);
    }

    const s = window.devicePixelRatio;
    this.elem.style.left = this.surfaceX() / s + 'px';
    this.elem.style.top = this.surfaceY() / s + 'px';
    this.elem.style.width = this.w / s + 'px';
    this.elem.style.height = this.h / s + 'px';

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.h, this.h);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, this.w, this.h);
  }

  removed() {
    if (this.elem) {
      this.elem.remove();
      this.elem = null;
    }
  }
}

class Scrollbox extends Control {
  constructor() {
    super();
    this.clip = true;
    this.scrollable = true;

    // Scroll coordinates.
    this.scrollX = 0;
    this.scrollY = 0;
    this.xmax = 0;
    this.ymax = 0;

    this.enableHitDetection();
  }

  shouldPaint(control) {
    // Optimisation to disable painting of controls that are completely outside the clip
    // region. For 4000 labels in a scroll view (with approx 20 visible) this gives 10x
    // faster repaints.
    return control.xw - this.scrollX >= 0 && control.x - this.scrollX <= this.w && control.yh - this.scrollY >= 0 && control.y - this.scrollY <= this.h;
  }

  paint(ctx) {
    // Do regular paint, but offset by the scroll coordinates.
    // TODO: this could be optimised to not paint children that are fully outside
    // the clipping region.
    ctx.translate(-this.scrollX, -this.scrollY);
    super.paint(ctx);
    ctx.translate(this.scrollX, this.scrollY);

    // Draw scrollbars.
    ctx.fillStyle = '#404040';

    // Horizontal scrollbar.
    if (this.xmax > this.w) {
      let w = this.w;
      if (this.ymax > this.h) {
        // Leave room for vertical scrollbar.
        w -= 12;
      }
      const sw = w * (this.w / this.xmax);
      const sx = (w - sw) * this.scrollX / (this.xmax - this.w);
      ctx.fillRect(sx, this.h - 10, sw, 7);
    }

    // Vertical scrollbar.
    if (this.ymax > this.h) {
      let h = this.h;
      if (this.xmax > this.w) {
        // Leave room for horizontal scrollbar.
        h -= 12;
      }
      const sh = h * (this.h / this.ymax);
      const sy = (h - sh) * this.scrollY / (this.ymax - this.h);
      ctx.fillRect(this.w - 10, sy, 7, sh);
    }
  }

  scrollBy(dx, dy) {
    // TODO: this should bubble up to parent scroll containers when bounds are hit.
    this.scrollX -= dx;
    this.scrollY -= dy;
    this.clipScroll();
    this.repaint();
  }

  clipScroll() {
    this.scrollX = Math.min(Math.max(0, this.xmax - this.w), Math.max(0, this.scrollX));
    this.scrollY = Math.min(Math.max(0, this.ymax - this.h), Math.max(0, this.scrollY));
  }

  layout() {
    // TODO: investigate skipping layout for controls that are outside the visible
    // area. This means we'd need to re-layout on scrolll potentially? Maybe there
    // could be a buffer of N px in all directions that can trigger relayout.
    // Need to figure out how much layout costs. Skipping painting is probably a much
    // better optimisation as layout happens less often.
    super.layout();

    this.xmax = 0;
    this.ymax = 0;
    for (const c of this.controls) {
      this.xmax = Math.max(this.xmax, c.xw);
      this.ymax = Math.max(this.ymax, c.yh);
    }

    this.clipScroll();
  }

  controlAtPoint(x, y) {
    return super.controlAtPoint(x + this.scrollX, y + this.scrollY);
  }

}
