import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { Label } from './label';
import { CheckBox } from './checkbox';
import { ScrollBox } from './scrollbox';

// TODO: make this API work more like Tree.

export class ListItem<T> extends Control {
  private _selected: boolean = false;
  select: EventSource;

  constructor(readonly value: T) {
    super();

    this.select = new EventSource();
  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    if (this._selected) {
      ctx.fillStyle = 'orange';
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  protected paintBorder(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.moveTo(0, this.h);
    ctx.lineTo(this.w, this.h);
    ctx.stroke();
  }

  protected defaultConstraints() {
    this.coords.h.set(this.form.defaultHeight);
  }

  get selected() {
    return this._selected;
  }

  set selected(value: boolean) {
    if (value === this._selected) {
      return;
    }
    // TODO: scroll into view.
    this._selected = value;
    this.repaint();
    if (this._selected) {
      this.select.fire();
    }
  }
}

export class TextListItem extends ListItem<string> {
  private _draggable: boolean = false;

  constructor(text: string) {
    super(text);
    const l = this.add(new Label(text), 5, 1, null, null, 3, 1);
    l.fit = false;

    this.mousedown.add((ev) => {
      this.selected = true;

      if (this._draggable) {
        ev.allowDrag('hello');
      }
    });
  }
};

export class CheckBoxListItem extends ListItem<string> {
  constructor(text: string) {
    super(text);
    const c = this.add(new CheckBox(text), 3, 1, null, null, 3, 1);
  }
};

export class List<T> extends ScrollBox {
  change: EventSource;

  constructor(readonly itemType: (new (item: T) => ListItem<T>)) {
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
        (c as ListItem<T>).selected = false;
      }
      this.change.fire();
      this.repaint();
    });

    this.keydown.add((data) => {
      if (data.key === 38) {
        // Up
        for (let i = 1; i < this.controls.length; ++i) {
          if ((this.controls[i] as ListItem<T>).selected) {
            (this.controls[i] as ListItem<T>).selected = false;
            (this.controls[i - 1] as ListItem<T>).selected = true;
            break;
          }
        }
      } else if (data.key === 40) {
        // Down
        for (let i = 0; i < this.controls.length - 1; ++i) {
          if ((this.controls[i] as ListItem<T>).selected) {
            (this.controls[i] as ListItem<T>).selected = false;
            (this.controls[i + 1] as ListItem<T>).selected = true;
            break;
          }
        }
      }
    });
  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.w, this.h);
  }

  addItem(item: T, itemType?: (new (item: T) => ListItem<T>)): ListItem<T> {
    itemType = itemType || this.itemType;
    const itemControl = new itemType(item);
    itemControl.select.add(() => {
      for (const c of this.controls) {
        if (c === itemControl) {
          continue;
        }
        (c as ListItem<T>).selected = false;
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

  get selectedItem() {
    for (const c of this.controls) {
      if ((c as ListItem<T>).selected) {
        return (c as ListItem<T>).value;
      }
    }
    return null;
  }
}
