import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { Label } from './label';
import { CheckBox } from './checkbox';
import { ScrollBox } from './scrollbox';

// TODO: make this API work more like Tree.

export class ListItem extends Control {
  selected: boolean = false;
  select: EventSource;

  constructor() {
    super();

    this.select = new EventSource();
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    if (this.selected) {
      ctx.fillStyle = 'orange';
      ctx.fillRect(0, 0, this.w, this.h);
    }

    super.paint(ctx);
  }

  selfConstrain() {
    this.h = this.form().defaultHeight();
    return true;
  }

  setSelected(value: boolean) {
    if (value === this.selected) {
      return;
    }
    // TODO: scroll into view.
    this.selected = value;
    this.repaint();
    if (this.selected) {
      this.select.fire();
    }
  }
}

export class TextListItem extends ListItem {
  draggable: boolean = false;

  constructor(text: string) {
    super();
    const l = this.add(new Label(text), 5, 1, null, null, 3, 1);
    l.fit = false;

    this.mousedown.add((ev) => {
      this.setSelected(true);

      if (this.draggable) {
        ev.allowDrag('hello');
      }
    });
  }
};

export class CheckBoxListItem extends ListItem {
  constructor(text: string) {
    super();
    const c = this.add(new CheckBox(text), 3, 1, null, null, 3, 1);
  }
};

export class List<T> extends ScrollBox {
  change: EventSource;

  constructor(readonly itemType: (new (item: T) => ListItem)) {
    super();

    this.border = true;

    this.change = new EventSource();

    // Clear selection when clicking on the list.
    this.mousedown.add((ev) => {
      if (ev.control !== this) {
        // Skip if the event was actually on a list item control.
        return;
      }
      for (const c of this.controls) {
        (c as ListItem).selected = false;
      }
      this.change.fire();
      this.repaint();
    });

    this.keydown.add((data) => {
      if (data.key === 38) {
        // Up
        for (let i = 1; i < this.controls.length; ++i) {
          if ((this.controls[i] as ListItem).selected) {
            (this.controls[i] as ListItem).setSelected(false);
            (this.controls[i - 1] as ListItem).setSelected(true);
            break;
          }
        }
      } else if (data.key === 40) {
        // Down
        for (let i = 0; i < this.controls.length - 1; ++i) {
          if ((this.controls[i] as ListItem).selected) {
            (this.controls[i] as ListItem).setSelected(false);
            (this.controls[i + 1] as ListItem).setSelected(true);
            break;
          }
        }
      }
    });
  }

  protected paint(ctx: CanvasRenderingContext2D) {
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
    this.add(itemControl, { x: 0, x2: 0 });
    if (this.controls.length === 1) {
      itemControl.coords.y.set(0);
    } else {
      itemControl.coords.y.align(this.controls[this.controls.length - 2].coords.yh);
    }
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
