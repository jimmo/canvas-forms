import { Control } from '../core/control';
import { Event } from '../core/events';
import { Label } from 'label';
import { Scrollbox } from 'scrollbox';

class SubTree extends Control {
  constructor() {
    super();
  }

  addItem(text: string) {
    const ti = this.add(new TreeItem(text), { x: 0 });
    if (this.controls.length === 1) {
      ti.coords.y.set(0);
    } else {
      ti.coords.y.align(this.controls[this.controls.length - 2].coords.yh);
    }
  }

  added() {
    for (let i = 0; i < 10; ++i) {
      this.addItem('Child ' + i);
    }
  }
}

export class TreeItem extends Control {
  selected: boolean = false;
  open: boolean = false;
  sub: SubTree;

  constructor(text: string) {
    super();

    const l = this.add(new Label(text), 22, 1);

    this.mouseup.add((data) => {
      this.selected = true;

      if (data.y <= 26) {
        if (!this.open) {
          this.open = true;
          this.sub = this.add(new SubTree(), { x: 22 });
          this.sub.coords.y.align(l.coords.yh);
        } else {
          this.open = false;
          this.sub.remove();
          this.sub = null;
        }
      }
    });
  }

  paint(ctx: CanvasRenderingContext2D) {
    if (this.selected) {
      ctx.fillStyle = 'orange';
      ctx.fillRect(0, 0, this.w, 26);
    }

    ctx.beginPath();
    if (this.open) {
      ctx.moveTo(6, 8);
      ctx.lineTo(16, 8);
      ctx.lineTo(11, 17);
    } else {
      ctx.moveTo(8, 7);
      ctx.lineTo(14, 13);
      ctx.lineTo(8, 20);
    }
    ctx.closePath();

    ctx.fillStyle = 'black';
    ctx.fill();

    super.paint(ctx);
  }
}

export class Tree extends Scrollbox {
  change: Event;

  constructor() {
    super();

    this.border = true;

    this.change = new Event();
  }

  setRoot() {
    this.add(new TreeItem('Root'), { x: 0, y: 0 });
  }
}
