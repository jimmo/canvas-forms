import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { Label } from './label';
import { ScrollBox } from './scrollbox';

export interface TreeNode {
  treeChildren(): Promise<TreeNode[]>;
  treeText(): string;
  treeDrag(): boolean;
  treeDropAllowed(data: any): boolean;
  treeDrop(data: any): void;
}

class SubTree extends Control {
  private loading: boolean = false;

  constructor(private readonly tree: Tree, private readonly parentNode: TreeNode) {
    super();

    this.clip = false;
  }

  addItem(node: TreeNode) {
    const ti = this.add(new TreeItem(this.tree, node), { x: 0 });
    if (this.controls.length === 1) {
      ti.coords.y.set(0);
    } else {
      ti.coords.y.align(this.controls[this.controls.length - 2].coords.yh);
    }
    ti.coords.w.fit();
    ti.coords.h.fit();
  }

  added() {
    if (this.parentNode) {
      this.loading = true;

      this.parentNode.treeChildren().then(children => {
        this.loading = false;

        for (const node of children) {
          this.addItem(node);
        }
      });
    }
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    if (this.loading) {
      ctx.fillStyle = 'grey';
      ctx.fillRect(6, this.h / 2 - 1, 2, 2);
      ctx.fillRect(12, this.h / 2 - 1, 2, 2);
      ctx.fillRect(18, this.h / 2 - 1, 2, 2);
    }
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && y < this.h;
  }
}

class TreeItem extends Control {
  selected: boolean = false;
  private _open: boolean = false;
  label: Label;
  private sub: SubTree;
  select: EventSource;

  constructor(private readonly tree: Tree, private readonly node: TreeNode) {
    super();

    this.clip = false;

    this.select = new EventSource();

    this.label = this.add(new Label(() => this.node.treeText()), 22, 1);

    this.mousedown.add((data) => {
      if (data.y > this.label.h) {
        return;
      }

      this.setSelected(true);

      if (data.x < 22) {
        this.toggle();
      }

      if (this.node.treeDrag()) {
        data.allowDrag(this.node);
      }
    });
  }

  setSelected(value: boolean) {
    if (value === this.selected) {
      return;
    }
    this.selected = value;
    this.repaint();
    if (this.selected) {
      this.select.fire();
      this.tree.setSelected(this);
    }
  }

  toggle() {
    if (this._open) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this._open = true;
    this.sub = this.add(new SubTree(this.tree, this.node), { x: 22 });
    this.sub.coords.y.align(this.label.coords.yh);
    this.sub.coords.w.fit();
    // Min height set to 20 to make room for the loading ... icon.
    this.sub.coords.h.fit(0, 20);
  }

  close() {
    if (!this._open) {
      return;
    }
    this._open = false;
    this.sub.remove();
    this.sub = null;
  }

  allowDrop(data: any) {
    return this.node.treeDropAllowed(data);
  }

  drop(data: any) {
    this.node.treeDrop(data);
    this.setSelected(true);
    this.close();
    this.open();
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    if (this.selected || this.dragTarget) {
      ctx.fillStyle = this.dragTarget ? 'cornflowerblue' : 'orange';
      ctx.fillRect(0, 0, this.tree.scrollWidth(), this.label.h);
    }

    ctx.beginPath();

    const arrowX = 22 / 2;
    const arrowY = this.label.h / 2;

    if (this._open) {
      // Down
      ctx.moveTo(arrowX - 5, arrowY - 4);
      ctx.lineTo(arrowX + 5, arrowY - 4);
      ctx.lineTo(arrowX, arrowY + 4);
    } else {
      // Right
      ctx.moveTo(arrowX - 4, arrowY - 5);
      ctx.lineTo(arrowX + 4, arrowY);
      ctx.lineTo(arrowX - 4, arrowY + 5);
    }
    ctx.closePath();

    ctx.fillStyle = 'black';
    ctx.fill();

    super.paint(ctx);
  }

  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && y < this.h;
  }
}

export class Tree extends ScrollBox {
  change: EventSource;
  sub: SubTree;
  selected: TreeItem;

  constructor() {
    super();

    this.border = true;

    this.change = new EventSource();

    this.sub = new SubTree(this, null);
  }

  added() {
    this.add(this.sub, 0, 0);
    this.sub.coords.w.fit();
    this.sub.coords.h.fit();
  }

  addRoot(node: TreeNode) {
    this.sub.addItem(node);
  }

  setSelected(node: TreeItem) {
    if (this.selected && this.selected !== node) {
      this.selected.setSelected(false);
    }
    this.selected = node;
    node.setSelected(true);
  }
}
