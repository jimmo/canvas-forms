import { Control } from '../core/control';
import { Event } from '../core/events';
import { Label } from './label';
import { ScrollBox } from './scrollbox';

export interface TreeNode {
  treeChildren(): Promise<TreeNode[]>;
  treeText(): string;
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

  paint(ctx: CanvasRenderingContext2D) {
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
  open: boolean = false;
  label: Label;
  private sub: SubTree;

  constructor(private readonly tree: Tree, private readonly node: TreeNode) {
    super();

    this.clip = false;

    this.label = this.add(new Label(this.node.treeText()), 22, 1);

    this.mouseup.add((data) => {
      this.selected = true;

      if (data.y <= this.label.h) {
        if (!this.open) {
          this.open = true;
          this.sub = this.add(new SubTree(this.tree, this.node), { x: 22 });
          this.sub.coords.y.align(this.label.coords.yh);
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
      ctx.fillRect(0, 0, this.tree.scrollWidth(), this.label.h);
    }

    ctx.beginPath();

    const arrowX = 22 / 2;
    const arrowY = this.label.h / 2;

    if (this.open) {
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
  change: Event;
  sub: SubTree;

  constructor() {
    super();

    this.border = true;

    this.change = new Event();

    this.sub = new SubTree(this, null);
  }

  added() {
    this.add(this.sub, 0, 0);
  }

  addRoot(node: TreeNode) {
    this.sub.addItem(node);
  }
}
