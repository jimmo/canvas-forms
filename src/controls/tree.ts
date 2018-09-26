import { Control } from '../core/control';
import { EventSource } from '../core/events';
import { Label } from './label';
import { ScrollBox } from './scrollbox';
import { MenuItems } from '../core';

// To use the Tree control, you need to define your hierarchy using this TreeNode interface.
// Each root of the tree is a TreeNode that can return child TreeNodes and set other properties
// like text, and configure drag & drop.
// If you want to build a static hierarchy programatically, use the StaticTree class.
export interface TreeNode {
  treeChildren(): Promise<TreeNode[]>;
  treeHasChildren(): boolean;
  treeText(): string;
  treeIcon(): string;
  treeDrag(): boolean;
  treeDropAllowed(data: any): boolean;
  treeDrop(data: any): void;
  treeSelect(): void;
  treeActivate(): void;
  treeMenu(): Promise<MenuItems>;
}

export abstract class SimpleTreeNode implements TreeNode {
  constructor(readonly text: string, readonly icon?: string) {
  }

  treeHasChildren(): boolean {
    return true;
  }

  async treeChildren(): Promise<TreeNode[]> {
    return [];
  }

  treeText(): string {
    return this.text;
  }

  treeIcon(): string {
    return this.icon;
  }

  treeDrag(): boolean {
    return null;
  }

  treeDropAllowed(data: any): boolean {
    return false;
  }

  treeDrop(data: any): void {
  }

  treeSelect(): void {
  }

  treeActivate(): void {
  }

  async treeMenu(): Promise<MenuItems> {
    return null;
  }
}

export class SimpleTreeLeafNode extends SimpleTreeNode {
  constructor(text: string, icon?: string) {
    super(text, icon);
  }

  treeHasChildren() {
    return false;
  }

  async treeChildren(): Promise<TreeNode[]> {
    return [];
  }
}

// Helper class for definiing a static tree hierarchy.
// const root = new StaticTree('My Tree');
// const child = root.add(new StaticTree('Child'));
//
// TODO: Add methods for configuring drag & drop (and probably an EventSource for drop).
export class StaticTree implements TreeNode {
  private children: TreeNode[] = [];

  constructor(readonly text: string, readonly icon?: string) {
  }

  add(tree: TreeNode) {
    this.children.push(tree);
    return tree;
  }

  treeHasChildren(): boolean {
    return this.children.length > 0;
  }

  async treeChildren(): Promise<TreeNode[]> {
    return this.children;
  }

  treeText(): string {
    return this.text;
  }

  treeIcon(): string {
    return this.icon;
  }

  treeDrag(): boolean {
    return null;
  }

  treeDropAllowed(data: any): boolean {
    return false;
  }

  treeDrop(data: any): void {
  }

  treeSelect(): void {
  }

  treeActivate(): void {
  }

  async treeMenu(): Promise<MenuItems> {
    return null;
  }
}

class TreeLabel extends Label {
  constructor(private readonly node: TreeNode) {
    super(() => this.node.treeText());
    this.iconCallback = () => this.node.treeIcon();
    this.fit = true;
  }

  protected async contextMenu(): Promise<MenuItems> {
    return await this.node.treeMenu();
  }
}

// A tree item control is the actual node, and all of its (open) children.
// It's implemented as a self-painted open/close arrow, a label, and a subtree, and
// uses a content constraint to ensure that it's the right size to fit everything.
// The subtree itself is a repeated set of TreeItems.
class TreeItem extends Control {
  // Track selected state.
  private _selected: boolean = false;

  // Track open state.
  private _open: boolean = false;

  // The node text.
  private label: Label;

  // Contains all the child TreeItems.
  private sub: SubTree;

  // Fired when this node is clicked (or selected).
  select: EventSource;

  static ARROW_WIDTH = 32;

  constructor(private readonly tree: Tree, readonly node: TreeNode) {
    super();

    // This tree item may not be as wide as other tree items, so when selected
    // we need to draw far enough to the right so that the selection box is
    // at least as wide as any other tree item.
    // The parent Tree itself clips, so no risk of drawing outside of the tree scrollbox.
    //  x
    //    y
    //      z
    //  w
    // In the above example, when w is selected it needs to be as wide as z, but it's
    // only as wide as its children (it has none) and text. So we draw it much wider by
    // disabling clipping.
    this.clip = false;

    this.select = new EventSource();

    this.label = this.add(new TreeLabel(this.node), TreeItem.ARROW_WIDTH, 1);

    this.mousedown.add((ev) => {
      if (ev.y > this.label.h) {
        // Only care about events on the actual text.
        return;
      }

      // Any click in the text row will cause selection.
      this.selected = true;

      // But a click on the arrow will additionally toggle open/closed.
      if (ev.x < TreeItem.ARROW_WIDTH) {
        this.toggle();
      }

      // Set up for allowing a drag if there's a subsequent mousemove.
      if (this.node.treeDrag()) {
        ev.allowDrag(this.node);
      }
    });

    this.mousedbl.add((ev) => {
      if (ev.y > this.label.h) {
        // Only care about events on the actual text.
        return;
      }

      // Double click on the text toggles the node.
      if (ev.x > TreeItem.ARROW_WIDTH) {
        this.toggle();

        if (!this.node.treeHasChildren()) {
          this.node.treeActivate();
        }
      }
    });
  }

  get selected() {
    return this._selected;
  }

  // Set selected state, fire events, and remove selection from any other node in the tree.
  set selected(value: boolean) {
    if (value === this.selected) {
      return;
    }
    this._selected = value;
    this.repaint();
    if (this._selected) {
      this.select.fire();
      this.tree.selectedItem = this;
    }
    if (this._selected) {
      this.node.treeSelect();
    }
  }

  toggle() {
    if (!this.node.treeHasChildren()) {
      return;
    }
    if (this._open) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (!this.node.treeHasChildren()) {
      return;
    }
    // So we draw the arrow differently.
    this._open = true;

    // Add the subtree below the label.
    this.sub = this.add(new SubTree(this.tree, this.node), { x: TreeItem.ARROW_WIDTH });
    // Position it automatically below the label.
    this.sub.coords.y.align(this.label.coords.yh);
    // Fit the width of the subtree to all the treeitems inside it.
    this.sub.coords.w.fit();
    // Fit to the height of all the tree items inside it.
    // Min height set to 20 to make room for the loading '...' icon.
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
    // Forward to the TreeNode that this item is based on.
    return this.node.treeDropAllowed(data);
  }

  drop(data: any) {
    // Forward to the TreeNode that this item is based on.
    this.node.treeDrop(data);

    // Select and re-open the item so that we see the dropped item.
    this.selected = true;
    this.close();
    this.open();
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    // Draw a filled horizontal background on the text if selected or dragging onto.
    if (this.selected || this.dropTarget) {
      ctx.fillStyle = this.dropTarget ? this.form.style.color.hovered : this.form.style.color.selected;
      ctx.fillRect(0, 0, this.tree.scrollWidth, this.label.h);
    }

    if (this.node.treeHasChildren()) {
      // Draw the arrow either facing down or right, centered on these coordinates.
      const arrowX = TreeItem.ARROW_WIDTH / 2;
      const arrowY = this.label.h / 2;

      ctx.beginPath();
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

      ctx.fillStyle = this.form.style.color.symbol;
      ctx.fill();
    }

    super.paint(ctx);
  }

  // Override inside to ignore the right hand edge.
  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && y < this.h;
  }
}

// Sits inside an open TreeItem and contains all the child TreeItems.
class SubTree extends Control {
  // While we're waiting for TreeNode::treeChildren() to return data, show a visual indicator.
  private loading: boolean = false;

  constructor(private readonly tree: Tree, private readonly parentNode: TreeNode) {
    super();

    // See TreeItem.
    this.clip = false;
  }

  // Internal use only.
  addItem(node: TreeNode): TreeItem {
    // Creates a new child TreeItem and positions it below the previous one (or at
    // the top if there was none).
    const ti = this.add(new TreeItem(this.tree, node), { x: 0 });
    if (this.controls.length === 1) {
      ti.coords.y.set(0);
    } else {
      ti.coords.y.align(this.controls[this.controls.length - 2].coords.yh);
    }

    // Size the treeitem to the size of the text and subtree inside it.
    ti.coords.w.fit();
    ti.coords.h.fit();

    return ti;
  }

  added() {
    super.added();

    // Once the subtree is added (i.e. the parent TreeItem has been opened), then
    // immediately load children and add them when available.
    if (this.parentNode) {
      // So the loading indicator is shown while we wait for the treeChildren promise.
      this.loading = true;

      this.parentNode.treeChildren().then(children => {
        this.loading = false;

        // Lay them out vertically.
        for (const node of children) {
          this.addItem(node);
        }
      });
    }
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    super.paint(ctx);

    // Show a loading indicator in the blank space created by the min
    // bounds on the content constraint.
    if (this.loading) {
      ctx.fillStyle = this.form.style.color.symbol;
      ctx.fillRect(6, this.h / 2 - 1, 2, 2);
      ctx.fillRect(12, this.h / 2 - 1, 2, 2);
      ctx.fillRect(18, this.h / 2 - 1, 2, 2);
    }
  }

  inside(x: number, y: number) {
    // As for TreeItem.
    return x >= 0 && y >= 0 && y < this.h;
  }
}

export class Tree extends ScrollBox {
  change: EventSource;

  // This is implemented using just the children part of a regular tree item.
  private sub: SubTree;

  // Currently selected tree node.
  private _selected: TreeItem;

  constructor() {
    super();

    this.border = true;

    this.change = new EventSource();

    this.sub = new SubTree(this, null);
  }

  added() {
    super.added();

    // When we're added to a parent, we can start using constraints.
    this.add(this.sub, 0, 0);

    // See TreeItem::open.
    this.sub.coords.w.fit();
    this.sub.coords.h.fit();
  }

  // Add a top-level node to the tree.
  addRoot(node: TreeNode): TreeItem {
    return this.sub.addItem(node);
  }

  // De-selects the current selection and makes a new item selected.
  set selectedItem(item: TreeItem) {
    if (this._selected && this._selected !== item) {
      this._selected.selected = false;
    }
    this._selected = item;
    item.selected = true;
  }

  get selectedNode() {
    return this.selectedItem.node;
  }

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.form.style.color.background;
    ctx.fillRect(0, 0, this.w, this.h);
  }
}
