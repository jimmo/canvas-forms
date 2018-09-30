import { Control } from "./control";
import { EventSource } from "./events";

class BaseMenuItem extends Control {
  protected defaultConstraints() {
    this.coords.w.set(220);
    this.coords.h.set(this.form.defaultHeight);
  }
}

export class MenuItem extends BaseMenuItem {
  click: EventSource;
  down: boolean;

  constructor(readonly text: string, readonly icon?: string) {
    super();

    this.click = new EventSource();

    this.mousedown.add((ev) => {
      this.down = true;
      this.repaint();
    });
    this.mouseup.add((ev) => {
      this.down = false;
      this.parent.remove();
      this.click.fire();
    });
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    ctx.font = this.form.style.font.size + 'px ' + this.form.style.font.name;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.form.style.color.text;
    ctx.textAlign = 'left';
    ctx.fillText(this.text, 3, this.h / 2);
  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    if (this.hovered) {
      ctx.fillStyle = this.form.style.color.hovered;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    if (this.down) {
      ctx.fillStyle = this.form.style.color.selected;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }
}

export class MenuHeadingItem extends BaseMenuItem {
  constructor(readonly text: string, readonly icon?: string) {
    super();
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    ctx.font = this.form.style.font.size + 'px ' + this.form.style.font.name;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.form.style.color.text;
    ctx.textAlign = 'left';
    ctx.fillText(this.text, 3, this.h / 2);
  }
}

export class MenuSeparatorItem extends BaseMenuItem {
  constructor() {
    // Make Control's private ctor public.
    super();
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.form.style.color.separator;
    ctx.beginPath();
    ctx.moveTo(10, this.h / 2);
    ctx.lineTo(this.w - 10, this.h / 2);
    ctx.stroke();
  }

  protected defaultConstraints() {
    this.coords.w.set(220);
    this.coords.h.set(10);
  }
}

export type MenuItems = (MenuItem | MenuHeadingItem | MenuSeparatorItem)[];

export class Menu extends Control {
  constructor(items: MenuItems) {
    super();
    this.border = true;
    this.clip = false;

    let last: Control = null;

    for (const item of items) {
      this.add(item, { x: 1 });
      if (last) {
        item.coords.y.align(last.coords.yh);
      } else {
        item.coords.y.set(1);
      }
      last = item;
    }

    this.mousedown.add((ev) => {
      if (ev.control === this) {
        this.remove();
        ev.cancelBubble();
      }
    });
  }

  protected defaultConstraints() {
    super.defaultConstraints();
    this.coords.x.fit(1);
    this.coords.y.fit(1);
  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.form.style.color.menu;
    ctx.shadowColor = this.form.style.color.shadow;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.shadowColor = 'transparent';
  }

  protected added() {
    super.added();
    this.form.pushLayer(this);
  }

  protected removed() {
    super.removed();
    this.form.popLayer(this);
  }
}
