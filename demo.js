const s = new Surface('canvas');

const f = new Form(s);

const l = f.add(new Label('this is some text'), 10, 10);
const l2 = f.add(new Label('aligned label'), null, 20);
new AlignConstraint(l2, Coord.X, l, Coord.XW, 20);
const b = f.add(new Button('Cancel'), 80, 130, 80, 26);
const b2 = f.add(new Button('Wide'), 20, 200, null, 26, 200, null);
const c = f.add(new Checkbox('Enabled'), 10, 70, 100, 26);

const bf1 = f.add(new Button('One'), 10, 300, null, 26);
const bf2 = f.add(new Button('Two'), null, 300, null, 26);
const bf3 = f.add(new Button('Three'), null, 300, null, 26, 10, null);
new FillConstraint([bf1, bf2, bf3], Coord.W);
new AlignConstraint(bf2, Coord.X, bf1, Coord.XW, 10);
new AlignConstraint(bf3, Coord.X, bf2, Coord.XW, 10);

const bf11 = f.add(new Button('+One'), 40, 360, null, 26);
new AlignConstraint(bf11, Coord.W, bf1, Coord.W);

const bfx1 = f.add(new Button('Two A'), null, 420, null, 26);
const bfx2 = f.add(new Button('Two B'), null, 420, null, 26);

new AlignConstraint(bfx1, Coord.X, bf2, Coord.X);
new AlignConstraint(bfx2, Coord.XW, bf2, Coord.XW);
new AlignConstraint(bfx1, Coord.XW, bfx2, Coord.X);
new FillConstraint([bfx1, bfx2], Coord.W);

const t = f.add(new Textbox('hello'), null, 480, null, 26);
new AlignConstraint(t, Coord.W, bf1, Coord.W);
new AlignConstraint(t, Coord.X, bfx2, Coord.X);

const bfy1 = f.add(new Button('One Y'), 10, 530, null, 26);
const bfy2 = f.add(new Button('Two Y'), null, 530, null, 26);
const bfy3 = f.add(new Button('Three Y'), null, 530, null, 26, 10, null);
new FillConstraint([bfy1, bfy2], Coord.W);
new AlignConstraint(bfy2, Coord.W, bfy3, Coord.W);
new AlignConstraint(bfy2, Coord.X, bfy1, Coord.XW, 10);
new AlignConstraint(bfy3, Coord.X, bfy2, Coord.XW, 10);

const sb = f.add(new Scrollbox(), null, 20, 300, null, 20, 20);
const lx = sb.add(new Label('Label ' + 0), 20, 20);
for (let i = 1; i < 100; ++i) {
  const l = sb.add(new Label('Label ' + i), null, 20 + i * 40);
  new AlignConstraint(l, Coord.X, lx, Coord.X, 0);
}

const br = f.add(new Button('click to resize'), 10, 580, null, 26);
const brw = new StaticConstraint(br, Coord.W, 100);
const lr = f.add(new Label('aligned'), null, 580);
new AlignConstraint(lr, Coord.X, br, Coord.XW, 10);
br.click.add(() => {
  brw.add(20);
});

let n = 0;
b.click.add(() => {
  if (c.checked) {
    n += 1;
    l.setText('you clicked the button ' + n + ' times');
  }
});

b2.click.add(() => {
  f._editing = !f._editing;
});

t.change.add(() => {
  l2.setText(t.text);
});

bfy3.click.add(() => {
  f.clear();
  const bb1 = f.add(new Button('BB 1'), 10, 30, null, 26);
  const bb2 = f.add(new Button('BB 2'), null, 30, null, 26);
  const bb3 = f.add(new Button('BB 3'), null, 30, null, 26, 10, null);
  new FillConstraint([bb1, bb2], Coord.W);
  new AlignConstraint(bb2, Coord.W, bb3, Coord.W);
  new AlignConstraint(bb2, Coord.X, bb1, Coord.XW, 10);
  new AlignConstraint(bb3, Coord.X, bb2, Coord.XW, 10);

  bb2.click.add(() => {
    bb2.remove();
  });
});
