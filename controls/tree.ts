import { Control } from '../core/control';
import { Event } from '../core/events';
import { Label } from 'label';
import { Scrollbox } from 'scrollbox';

class SubTree extends Control {
  constructor() {
    super();
    // this.border = true;
  }

  selfConstrain() {
    this.h = this.controls.length * 26 + 300;
    return true;
  }

  added() {
    this.add(new TreeItem(), { x: 0, y: 0, x2: 0 });
  }
}

export class TreeItem extends Control {
  selected: boolean = false;
  open: boolean = false;
  sub: SubTree;

  constructor() {
    super();

    const l = this.add(new Label('tree'), 22, 1);

    this.mouseup.add((data) => {
      this.selected = true;

      if (data.y <= 26) {
        if (!this.open) {
          this.open = true;
          this.sub = this.add(new SubTree(), { x: 22, x2: 0 });
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

  selfConstrain() {
    this.h = 800;
    return true;
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
    this.add(new TreeItem(), { x: 0, y: 0, x2: 0 });
  }
}
