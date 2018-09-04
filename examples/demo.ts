import { FillConstraint } from "constraints/fill";
import { Button } from "controls/button";
import { Checkbox } from "controls/checkbox";
import { Dialog } from "controls/dialog";
import { Grabber } from 'controls/grabber';
import { Label } from "controls/label";
import { List, TextListItem } from "controls/list";
import { Slider } from "controls/slider";
import { Textbox } from "controls/textbox";
import { Control } from "core/control";
import { Coord, CoordAxis } from "core/enums";
import { Form } from "core/form";
import { Surface } from "core/surface";
import { Scrollbox } from "controls/scrollbox";

const form = new Form(new Surface('canvas'));

const list = form.add(new List<string>(TextListItem), { x: 10, y: 10, y2: 10 });
const c = form.add(new Scrollbox(), { y: 10, x2: 10, y2: 10 });
c.border = true;

const grabber = form.add(new Grabber(200, 10, [CoordAxis.X]));
grabber.coords.w.set(10);
grabber.coords.y2.set(10);
list.coords.xw.align(grabber.coords.x);
c.coords.x.align(grabber.coords.xw);
grabber.bound(CoordAxis.X, 100, 400);

list.change.add(() => {
  if (!list.selected()) {
    c.clear();
  }
});

function makeDemo(name: string, desc: string, fn: () => void) {
  const item = list.addItem(name);
  item.select.add(() => {
    c.clear();
    c.add(new Label(desc), { x: 10, y2: 10 });
    fn();
  });
}

makeDemo('Modal', 'Simple modal dialog with async/await result', () => {
  const b = c.add(new Button('Click me'), 10, 10);
  const l = c.add(new Label(), 20, 50);
  const tx = c.add(new Textbox('html textbox'));
  tx.coords.center(CoordAxis.X, 200);
  tx.coords.center(CoordAxis.Y, form.defaultHeight());
  b.click.add(async () => {
    const d = new Dialog();
    const tb = d.add(new Textbox(), 20, 20);
    tb.coords.x2.set(20);

    d.add(new Button('Cancel'), { x2: 10, y2: 10 }).click.add(() => {
      d.close('Cancel');
    });
    d.add(new Button('OK'), { x2: 120, y2: 10 }).click.add(() => {
      d.close(tb.text);
    });
    const result = await d.modal(form);
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

makeDemo('Checkbox', 'The button only works when the checkbox is enabled.', () => {
  const cb = c.add(new Checkbox('Enabled'), 10, 10);
  const b = c.add(new Button('Click me'), 10, 50);
  b.click.add(() => {
    if (cb.checked) {
      b.setText('Thanks');
      setTimeout(() => {
        b.setText('Click me');
      }, 1000);
    }
  });
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

makeDemo('Textbox', '', () => {
  const t1 = c.add(new Textbox('Hello'), 10, 10, 300);
  const l1 = c.add(new Label(t1.text), 10, 50);
  t1.change.add(() => {
    l1.setText(t1.text);
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
