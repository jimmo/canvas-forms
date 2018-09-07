import { FillConstraint, Button, ButtonGroup, CheckBox, RadioGroup, Dialog, Label, CheckBoxListItem, List, ListItem, TextListItem, Slider, FocusTextBox, TextBox, Tree, TreeNode, Coord, CoordAxis, Form, Surface, Grabber, ScrollBox } from 'canvas-forms';

const form = new Form(new Surface('canvas'));
const demoList = form.add(new List<string>(TextListItem), { x: 10, y: 10, y2: 10 });
const c = form.add(new ScrollBox(), { y: 10, x2: 10, y2: 10 });
c.border = true;

const grabber = form.add(new Grabber(200, 10, [CoordAxis.X]), { w: 10, y2: 10 });
demoList.coords.xw.align(grabber.coords.x);
c.coords.x.align(grabber.coords.xw);
grabber.bound(CoordAxis.X, 100, 400);

demoList.change.add(() => {
  if (!demoList.selected()) {
    c.clear();
  }
});

function makeDemo(name: string, desc: string, fn: () => void) {
  const item = demoList.addItem(name);
  item.select.add(() => {
    c.clear();
    c.add(new Label(desc), { x: 10, y2: 10 });
    fn();
  });
}

class PromptDialog extends Dialog {
  name: TextBox;

  constructor() {
    super(300, 160);

    this.add(new Label('What is your name?'), 20, 20);
    this.name = this.add(new TextBox(), 20, 54);
    this.name.coords.x2.set(20);

    this.add(new Button('Cancel'), { x2: 20, y2: 20 }).click.add(() => {
      this.close('Cancel');
    });
    this.add(new Button('OK'), { x2: 130, y2: 20 }).click.add(() => {
      this.close(this.name.text);
    });
  }

  submit() {
    this.close(this.name.text);
  }
}

makeDemo('Modal', 'Simple modal dialog with async/await result', () => {
  const b = c.add(new Button('Click me'), 10, 10);
  const l = c.add(new Label(), 20, 50);
  const tx = c.add(new TextBox('html textbox'));
  tx.coords.center(CoordAxis.X, 200);
  tx.coords.center(CoordAxis.Y, form.defaultHeight());
  b.click.add(async () => {
    const d = new Dialog(300, 160);
    const result = await new PromptDialog().modal(form);
    l.setText('You clicked: ' + result);
  });
});

makeDemo('Center', 'The button has a fixed size, centered on the parent.', () => {
  const b = c.add(new Button('Click me'));
  b.coords.size(160, 60);
  b.coords.center(CoordAxis.X);
  b.coords.center(CoordAxis.Y);

  b.click.add(() => {
    b.setText('Thanks');
  });
});

makeDemo('Fill', 'The buttons automatically fill the parent\'s width.', () => {
  const buttons: Button[] = [
    new Button('Add more!'),
  ];

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

makeDemo('Fill + Align', 'Only the first two buttons fill, the third matches the second\'s width.', () => {
  const b1 = c.add(new Button('Fill 1'), 10, 20);
  const b2 = c.add(new Button('Fill 2'), null, 20);
  const b3 = c.add(new Button('Aligned to 2'), null, 20);
  b3.coords.x2.set(10);
  new FillConstraint([b1, b2], Coord.W);
  b2.coords.w.align(b3.coords.w);
  b2.coords.x.align(b1.coords.xw, 10);
  b3.coords.x.align(b2.coords.xw, 10);
});

makeDemo('CheckBox', 'The button only works when the checkbox is enabled.', () => {
  const cb = c.add(new CheckBox('Enabled'), 10, 10);
  const b = c.add(new Button('Click me'), 10, 50);
  b.click.add(() => {
    if (cb.checked) {
      b.setText('Thanks');
      setTimeout(() => {
        b.setText('Click me');
      }, 1000);
    }
  });

  const r = new RadioGroup();
  for (let i = 0; i < 5; ++i) {
    const cb = c.add(new CheckBox('Radio ' + i), 10, 100 + i * 30);
    r.add(cb);
  }
});

makeDemo('Slider', '', () => {
  const s1 = c.add(new Slider(4, 0, 20, 1), 10, 10, 400);
  const l1 = c.add(new Label('4'), 420, 10);
  s1.change.add(() => {
    l1.setText(s1.value.toString());
  });

  const s2 = c.add(new Slider(20, 0, 100), 10, 50, 400);
  const l2 = c.add(new Label('20'), 420, 50);
  s2.change.add(() => {
    l2.setText((Math.round(s2.value * 10) / 10).toString());
  });
});

makeDemo('TextBox', '', () => {
  const t1 = c.add(new TextBox('Hello'), 10, 10, 300);
  const l1 = c.add(new Label(t1.text), 10, 50);
  t1.change.add(() => {
    l1.setText(t1.text);
  });


  const t2 = c.add(new FocusTextBox('Created when focused'), 10, 100, 300);
  const l2 = c.add(new Label(t2.text), 10, 150);
  t2.change.add(() => {
    l2.setText(t2.text);
  });


  const t3 = c.add(new TextBox('One\nTwo\nThree'), 400, 10, 300, 200);
  t3.multiline = true;
  const l3 = c.add(new Label(t3.text), 400, 250);
  t3.change.add(() => {
    l3.setText(t3.text);
  });
});

makeDemo('Grabber', '', () => {
  const g = c.add(new Grabber(100, 100, [CoordAxis.X, CoordAxis.Y]));
  g.coords.size(20, 20);
  g.bound(CoordAxis.X, 50);
  g.bound(CoordAxis.Y, 50);
  const l = c.add(new Label('Follow'));
  l.coords.x.align(g.coords.xw, 10);
  l.coords.y.align(g.coords.yh, 10);
});

class CustomListItem extends ListItem {
  constructor(text: string) {
    super();

    const b = this.add(new Button(text), 3, 3, null, null, 3, 3);
    b.click.add(() => {
      if (!this.selected) {
        this.selected = true;
        this.select.fire();
        this.repaint();
      }
    });
  }

  selfConstrain() {
    this.h = 40;
    return true;
  }
}

makeDemo('List', '', () => {
  const textList = c.add(new List<string>(TextListItem), 10, 10, 200, 500);
  for (let i = 0; i < 100; ++i) {
    textList.addItem('Item ' + i);
  }

  const checkList = c.add(new List<string>(CheckBoxListItem), 220, 10, 200, 500);
  for (let i = 0; i < 100; ++i) {
    checkList.addItem('Task ' + i);
  }

  const customList = c.add(new List<string>(CustomListItem), 440, 10, 200, 500);
  for (let i = 0; i < 100; ++i) {
    customList.addItem('Action ' + i);
  }
});

function delay(ms: number): Promise<void> {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve();
    }, ms);
  });
}

class DemoTreeNode implements TreeNode {
  constructor(private readonly name: string) {
  }

  treeText(): string {
    return this.name;
  }

  async treeChildren(): Promise<TreeNode[]> {
    await delay(300);
    let children = [];
    for (let i = 0; i < 5; ++i) {
      children.push(new DemoTreeNode(this.name + '.' + i));
    }
    return children;
  }
};

makeDemo('Tree', '', () => {
  const tree = c.add(new Tree(), 10, 10, 200, 500);
  tree.addRoot(new DemoTreeNode('A'));
  tree.addRoot(new DemoTreeNode('B'));
});

makeDemo('Button', '', () => {
  const b1 = c.add(new Button('Hello'), 10, 10, 100, 26);
  b1.click.add(async () => {
    b1.setText('Goodbye');
    await delay(1000);
    b1.setText('Hello');
  });

  const g1 = c.add(new ButtonGroup(), 10, 100, 400, 26);
  const gb1 = g1.add(new Button('One'));
  const gb2 = g1.add(new Button('Two'));
  const gb3 = g1.add(new Button('Three'));
  const gb4 = g1.add(new Button('Four'));
  const gb5 = g1.add(new Button('Five'));

  gb1.click.add(() => {
    const bx = g1.add(new Button('More!'));
  });
});

makeDemo('Animation', '', () => {
  const b1 = c.add(new Button('Here'), null, 10, 100, 26);
  const a1 = b1.coords.x.set(10).animate();
  b1.click.add(async () => {
    await a1.start();
    b1.setText('There');
  });
});
