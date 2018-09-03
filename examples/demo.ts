import { AlignConstraint } from "constraints/align";
import { Button } from "controls/button";
import { Dialog } from "controls/dialog";
import { Label } from "controls/label";
import { List, TextListItem } from "controls/list";
import { Control } from "core/control";
import { Coord, CoordAxis } from "core/enums";
import { Form } from "core/form";
import { Surface } from "core/surface";
import { CenterConstraint } from "constraints/center";
import { FillConstraint } from "constraints/fill";
import { Checkbox } from "controls/checkbox";
import { Slider } from "controls/slider";
import { Textbox } from "controls/textbox";

const form = new Form(new Surface('canvas'));

const list = form.add(new List<string>(TextListItem), 10, 10, 200, null, null, 10);
const c = form.add(new Control(), null, 10, null, null, 10, 10);
c.border = true;
new AlignConstraint(c, Coord.X, list, Coord.XW, 10);

list.change.add(() => {
  if (!list.selected()) {
    c.clear();
  }
});

function makeDemo(name: string, desc: string, fn: () => void) {
  const item = list.addItem(name);
  item.select.add(() => {
    c.clear();
    c.add(new Label(desc), 10, null, null, null, null, 10);
    fn();
  });
}

makeDemo('Modal', 'Simple modal dialog with async/await result', () => {
  const b = c.add(new Button('Click me'), 10, 10, 100, 26);
  const l = c.add(new Label(), 20, 50);
  b.click.add(async () => {
    const d = new Dialog();
    d.add(new Button('Cancel'), null, null, 100, 26, 10, 10).click.add(() => {
      d.close('Cancel');
    });
    d.add(new Button('OK'), null, null, 100, 26, 120, 10).click.add(() => {
      d.close('OK');
    });
    const result = await d.modal(form);
    l.setText('You clicked: ' + result);
  });
});

makeDemo('Center', 'The button has a fixed size, centered on the parent.', () => {
  const b = c.add(new Button('Click me'));
  b.setSize(160, 60);
  new CenterConstraint(b, CoordAxis.X);
  new CenterConstraint(b, CoordAxis.Y);

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
      c.add(b, null, 20, null, 26);
    }
    FillConstraint.fillParent(buttons, CoordAxis.X, 10);
  }

  buttons[0].click.add(() => {
    update();
  });

  update();
});

makeDemo('Fill + Align', 'Only the first two buttons fill, the third matches the second\'s width.', () => {
  const b1 = c.add(new Button('Fill 1'), 10, 20, null, 26);
  const b2 = c.add(new Button('Fill 2'), null, 20, null, 26);
  const b3 = c.add(new Button('Aligned to 2'), null, 20, null, 26, 10, null);
  new FillConstraint([b1, b2], Coord.W);
  new AlignConstraint(b2, Coord.W, b3, Coord.W);
  new AlignConstraint(b2, Coord.X, b1, Coord.XW, 10);
  new AlignConstraint(b3, Coord.X, b2, Coord.XW, 10);
});

makeDemo('Checkbox', 'The button only works when the checkbox is enabled.', () => {
  const cb = c.add(new Checkbox('Enabled'), 10, 10, 100, 26);
  const b = c.add(new Button('Click me'), 10, 50, 100, 26);
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
  const s1 = c.add(new Slider(4, 0, 20, 1), 10, 10, 400, 26);
  const l1 = c.add(new Label('4'), 420, 10, 100, 26);
  l1.fit = false;
  s1.change.add(() => {
    l1.setText(s1.value.toString());
  });

  const s2 = c.add(new Slider(20, 0, 100), 10, 50, 400, 26);
  const l2 = c.add(new Label('20'), 420, 50, 100, 26);
  l2.fit = false;
  s2.change.add(() => {
    l2.setText((Math.round(s2.value * 10) / 10).toString());
  });
});

makeDemo('Textbox', '', () => {
  const t1 = c.add(new Textbox('Hello'), 10, 10, 300, 26);
  const l1 = c.add(new Label(t1.text), 10, 50, 300, 26);
  l1.fit = false;
  t1.change.add(() => {
    l1.setText(t1.text);
  });
});
