import { Control } from '../core/control';
import { Event } from '../core/events';
import { Label } from 'label';
import { Checkbox } from 'checkbox';
import { Scrollbox } from 'scrollbox';

export class ListItem extends Control {
  selected: boolean = false;
  select: Event;

  constructor() {
    super();

    this.select = new Event();
  }
}

export class TextListItem extends ListItem {
  constructor(text: string) {
    super();
    const l = this.add(new Label(text), 3, 1, null, null, 3, 1);
    l.fit = false;

    this.mouseup.add(() => {
      if (!this.selected) {
        this.selected = true;
        this.select.fire();
        this.repaint();
      }
    });
  }

  paint(ctx: CanvasRenderingContext2D) {
    if (this.selected) {
      ctx.fillStyle = 'orange';
      ctx.fillRect(0, 0, this.w, this.h);
    }

    super.paint(ctx);
  }
};

export class CheckboxListItem extends ListItem {
  constructor(text: string) {
    super();
    const c = this.add(new Checkbox(text), 3, 1, null, null, 3, 1);
  }
};

export class List<T> extends Scrollbox {
  change: Event;

  constructor(readonly itemType: (new (item: T) => ListItem)) {
    super();

    this.border = true;

    this.change = new Event();

    this.mouseup.add(() => {
      for (const c of this.controls) {
        (c as ListItem).selected = false;
      }
      this.change.fire();
      this.repaint();
    });
  }

  paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);
  }

  addItem(item: T): ListItem {
    const itemControl = new this.itemType(item);
    itemControl.select.add(() => {
      for (const c of this.controls) {
        if (c === itemControl) {
          continue;
        }
        (c as ListItem).selected = false;
      }
      this.change.fire();
    });
    this.add(itemControl, 0, this.controls.length * 26, null, 26, 0, null);
    return itemControl;
  }

  selected() {
    for (const c of this.controls) {
      if ((c as ListItem).selected) {
        return true;
      }
    }
    return false;
  }
}
