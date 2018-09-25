import { AlertDialog, Button, ButtonGroup, CheckBox, CheckBoxListItem, Coord, CoordAxis, Dialog, Easing, FillConstraint, FocusTextBox, Form, Grabber, Label, List, ListItem, OpacityAnimator, PromptDialog, RadioGroup, ScrollBox, Slider, Surface, TextBox, TextListItem, Tree, TreeNode, MenuItem, MenuItems, FontStyle, MenuSeparatorItem } from 'canvas-forms';

const form = new Form(new Surface('canvas'));

// UI is a list on the left, scrollbox on the right, separated by a vertical grabber.
const demoList = form.add(new List<string>(TextListItem), { x: 10, y: 10, y2: 10 });
const grabber = form.add(new Grabber(200), { y: 10, w: 20, y2: 10 });
const c = form.add(new ScrollBox(), { y: 10, x2: 10, y2: 10 });
c.border = true;

// Set up the grabber with the right edge of the list and the left edge of the scrollbox.
demoList.coords.xw.align(grabber.coords.x);
c.coords.x.align(grabber.coords.xw);
// Constrain grabber movement.
grabber.setBound(CoordAxis.X, 100, 400);

// When there is no selection, clear the container.
demoList.change.add(() => {
  if (!demoList.selected()) {
    c.clear();
  }
});

// Add a list item and register a callback for when it's selected.
function makeDemo(name: string, fn: () => void) {
  const item = demoList.addItem(name);
  item.select.add(() => {
    c.clear();
    fn();
  });
}

// async version of setTimeout.
function delay(ms: number): Promise<void> {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve();
    }, ms);
  });
}



// Blank dialog that fills the entire form.
class FillDialog extends Dialog {
  constructor() {
    super();

    const cancel = this.add(new Button('Cancel'), { x2: 20, y2: 20 });
    cancel.click.add(() => {
      this.close('Cancel');
    });
  }

  defaultConstraints() {
    // Override Dialog default which centers a fixed width/height dialog in the form.
    this.coords.x.set(20);
    this.coords.y.set(20);
    this.coords.x2.set(20);
    this.coords.y2.set(20);
  }
}

// Shows different types of modal dialogs.
makeDemo('Modal', () => {
  const b = c.add(new Button('Alert'), 10, 10);
  b.click.add(async () => {
    await new AlertDialog('You clicked the button!').modal(form);
  });

  const b2 = c.add(new Button('Prompt'), 10, 100);
  const l = c.add(new Label(), 20, 150);
  b2.click.add(async () => {
    const result = await new PromptDialog('Enter some text:').modal(form);
    l.text = 'You clicked: ' + result;
  });

  const b3 = c.add(new Button('Fill'), 10, 190);
  b3.click.add(() => {
    new FillDialog().modal(form);
  });
});


// Uses the `CenterConstraint` (via `coords.center`) to position a control in the center
// of the container.
makeDemo('Center', () => {
  const b = c.add(new Button('Click me'));
  b.coords.size(160, 60);
  b.coords.center(CoordAxis.X);
  b.coords.center(CoordAxis.Y);

  b.click.add(() => {
    b.text = 'Thanks';
  });
});


// Shows the fill constraint which makes controls automatically choose their width/height
// to fill the available space.
// In other words: automatically finds a value to use as the width for all the control
// such that all other constraints are satisfied.
makeDemo('Fill', () => {
  const buttons: Button[] = [
    new Button('Add more!'),
  ];

  // Remove and re-add the buttons every time a new one is added.
  function update() {
    for (const b of buttons) {
      b.remove();
    }
    buttons.push(new Button('Button ' + buttons.length));
    for (const b of buttons) {
      c.add(b, null, 20);
    }
    FillConstraint.fillParent(buttons, CoordAxis.X, 10);
  }

  buttons[0].click.add(() => {
    update();
  });

  update();
});


// This isn't a particularly useful example but it tests the constraint solver.
// The first two buttons are filling to the available width, but the third button
// is width-aligned with the second. So the fill needs to take this into account.
// [--[a]--[b]--[b]--].
makeDemo('Fill + Align', () => {
  const b1 = c.add(new Button('Fill 1'), 10, 20);
  const b2 = c.add(new Button('Fill 2'), null, 20);
  const b3 = c.add(new Button('Aligned to 2'), null, 20);
  b3.coords.x2.set(10);
  new FillConstraint([b1, b2], Coord.W);
  b2.coords.w.align(b3.coords.w);
  b2.coords.x.align(b1.coords.xw, 10);
  b3.coords.x.align(b2.coords.xw, 10);
});


// CheckBoxes and RadioBoxes.
makeDemo('CheckBox', () => {
  const cb = c.add(new CheckBox('Enabled'), 10, 10);
  const b = c.add(new Button('Click me'), 10, 50);
  // The button only works if the checkbox is enabled.
  b.click.add(() => {
    if (cb.checked) {
      b.text = 'Thanks';
      setTimeout(() => {
        b.text = 'Click me';
      }, 1000);
    }
  });

  const r = new RadioGroup();
  for (let i = 0; i < 5; ++i) {
    const cb = c.add(new CheckBox('Radio ' + i), 10, 100 + i * 40);
    r.add(cb);
  }
});


// Sliders, continuous and discrete.
makeDemo('Slider', () => {
  // Slider with 20 discrete positions.
  const s1 = c.add(new Slider(4, 0, 20, 1), 10, 10, 400);
  const l1 = c.add(new Label('4'), 420, 10);
  s1.change.add(() => {
    l1.text = s1.value.toString();
  });

  // Continuous slider.
  const s2 = c.add(new Slider(20, 0, 100), 10, 50, 400);
  const l2 = c.add(new Label('20'), 420, 50);
  s2.change.add(() => {
    l2.text = (Math.round(s2.value * 10) / 10).toString();
  });
});


// Different types of textboxes.
makeDemo('TextBox', () => {
  // Always-visible DOM textbox.
  const t1 = c.add(new TextBox('Regular textbox'), 10, 10, 300);
  const l1 = c.add(new Label(t1.text), 10, 50);
  l1.fit = true;
  t1.change.add(() => {
    l1.text = t1.text;
  });

  // Textbox that only loads the DOM control when focused.
  // (Faster, but some slight differences in behavious).
  const t2 = c.add(new FocusTextBox('Created when focused'), 10, 140, 300, 60);
  const l2 = c.add(new Label(t2.text), 10, 210);
  l2.fit = true;
  t2.change.add(() => {
    l2.text = t2.text;
  });

  // Multi-line textbox (uses DOM textarea).
  const t3 = c.add(new FocusTextBox('Multi\nline\ntextbox'), 400, 10, 300, 200);
  t3.multiline = true;
  const l3 = c.add(new Label(t3.text), 400, 220);
  l3.fit = true;
  t3.change.add(() => {
    l3.text = t3.text;
  });
});


// Simple grabber that can move in both axes with a label that is aligned to it.
makeDemo('Grabber', () => {
  // 30x30 grabber at 100x00 that can move anywhere other than x<50 or y<50.
  const g = c.add(new Grabber(100, 100));
  g.setSnap(CoordAxis.X, 20);
  g.setSnap(CoordAxis.Y, 20);
  g.coords.size(30, 30);
  g.setBound(CoordAxis.X, 50);
  g.setBound(CoordAxis.Y, 50);

  // Create a label and align it to the bottom/right corner of the grabber.
  const l = c.add(new Label('Follow'));
  l.coords.x.align(g.coords.xw, 10);
  l.coords.y.align(g.coords.yh, 10);
});


// Custom list item that uses a button to select itself and has a set height.
class CustomListItem extends ListItem<string> {
  constructor(text: string) {
    super(text);

    const b = this.add(new Button(''), { x: 3, y: 3, w: 20, y2: 3 });
    b.click.add(() => {
      this.setSelected(true);
    });

    this.add(new Label(text), { x: 30, y: 3, x2: 3, y2: 3 });
  }

  protected defaultConstraints() {
    this.coords.h.set(40);
  }
}

// Different styles of list view.
makeDemo('List', () => {
  // Regular text items.
  const textList = c.add(new List<string>(TextListItem), 10, 10, 200, 500);
  for (let i = 0; i < 100; ++i) {
    textList.addItem('Item ' + i);
  }

  // Checkbox list.
  const checkList = c.add(new List<string>(CheckBoxListItem), 220, 10, 200, 500);
  for (let i = 0; i < 100; ++i) {
    checkList.addItem('Task ' + i);
  }

  // Custom list, see CustomListItem above.
  const customList = c.add(new List<string>(CustomListItem), 440, 10, 200, 500);
  for (let i = 0; i < 100; ++i) {
    customList.addItem('Action ' + i);
  }
});


// Example tree implementation supporting drag and drop.
class DemoTreeNode implements TreeNode {
  extra: TreeNode[] = [];

  constructor(private readonly name: string, readonly parent?: DemoTreeNode) {
  }

  treeText(): string {
    return this.name;
  }

  treeIcon(): string {
    return null;
  }

  treeHasChildren(): boolean {
    return true;
  }

  treeSelect() {
  }

  treeActivate() {
  }

  async treeChildren(): Promise<TreeNode[]> {
    await delay(300);
    let children = [];
    // Always return 5 default children.
    for (let i = 0; i < 5; ++i) {
      children.push(new DemoTreeNode(this.name + '.' + i, this));
    }
    // Plus any that have been dropped onto this node.
    for (const e of this.extra) {
      children.push(e);
    }
    return children;
  }

  treeDrag(): boolean {
    // All nodes are draggable.
    return true;
  }

  treeDropAllowed(data: any): boolean {
    // Don't allow drop onto self or onto parent.
    if (data === this || data.parent === this) {
      return false;
    }
    return true;
  }

  treeDrop(data: any): void {
    // Add this node as an extra child.
    this.extra.push(data as TreeNode);
  }

  async treeMenu(): Promise<MenuItems> {
    return [
      new MenuItem('One'),
      new MenuItem('Two'),
      new MenuItem('Three'),
    ]
  }
};

makeDemo('Tree', () => {
  const tree = c.add(new Tree(), 10, 10, 200, 500);
  tree.addRoot(new DemoTreeNode('A'));
  tree.addRoot(new DemoTreeNode('B'));
});


// Button and ButtonGroup.
makeDemo('Button', () => {
  const b1 = c.add(new Button('Hello'), 10, 10);
  b1.click.add(async () => {
    b1.text = 'Goodbye';
    await delay(1000);
    b1.text = 'Hello';
  });

  const g1 = c.add(new ButtonGroup(), 10, 100, 400, 32);
  const gb1 = g1.add(new Button('One'));
  const gb2 = g1.add(new Button('Two'));
  const gb3 = g1.add(new Button('Three'));
  const gb4 = g1.add(new Button('Four'));
  const gb5 = g1.add(new Button('Five'));

  gb1.click.add(() => {
    const bx = g1.add(new Button('More!'));
  });
});


// Different types of animation (coord, opacity).
makeDemo('Animation', () => {
  const b1 = c.add(new Button('Here'), null, 10);
  const a1 = b1.coords.x.set(10).animate(10, 800, 1000, Easing.easeInOutCubic);
  b1.click.add(async () => {
    // Doesn't set the button text until after the animation is finished.
    await a1.start();
    b1.text = 'There';
  });

  // Buttons that fade out then remove themselves.
  for (let i = 0; i < 6; ++i) {
    const b = c.add(new Button(`${i}`), 10 + i * 170, 50);
    b.click.add(async () => {
      await new OpacityAnimator(b, 1, 0.1, 200).start();
      b.remove();
    });
  }

  // Toggles the grabber state.
  const b3 = c.add(new Button('Open / Close'), 10, 100);
  b3.click.add(() => {
    if (grabber.x > 110) {
      grabber.animate(CoordAxis.X, grabber.x, 100, 100).start();
    } else {
      grabber.animate(CoordAxis.X, grabber.x, 400, 100).start();
    }
  });
});


// Simple demonstration of control opacity.
makeDemo('Opacity', () => {
  for (let i = 0; i < 10; ++i) {
    const b = c.add(new Button(`${(i + 1) / 10}`), 10 + i * 56, 10 + i * 16);
    b.opacity = (i + 1) / 10;
  }
});


// Nested scrolling containers. Simple test of scroll bubbling.
makeDemo('Scrolling', () => {
  const s1 = c.add(new ScrollBox(), 10, 10, 200, 300);
  s1.border = true;
  const s2 = s1.add(new ScrollBox(), 10, 200, 180, 300);
  s2.border = true;
  const sl = s2.add(new Slider(), 10, 300, 140);
  const l1 = s1.add(new Label('hello'), 10, 600);
  const l2 = s2.add(new Label('hello'), 10, 600);
});


class MenuButton extends Button {
  protected async contextMenu(): Promise<MenuItems> {
    const remove = new MenuItem('Remove');
    remove.click.add(async () => {
      await new OpacityAnimator(this, 1, 0.1, 200).start();
      this.remove();
    });

    const text = new MenuItem('Change Text');
    text.click.add(() => {
      this.text = 'Menu';
    });

    const bold = new MenuItem('Bold');
    bold.click.add(() => {
      this.toggleStyle(FontStyle.BOLD);
    });

    const italic = new MenuItem('Italic');
    italic.click.add(() => {
      this.toggleStyle(FontStyle.ITALIC);
    });

    return [
      remove,
      text,
      new MenuSeparatorItem(),
      bold,
      italic,
    ]
  }
}

makeDemo('Context Menu', () => {
  for (let i = 0; i < 6; ++i) {
    const b = c.add(new MenuButton(`${i}`), 10 + i * 170, 50);
  }
});
