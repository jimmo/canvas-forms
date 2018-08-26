const s = new Surface('canvas');
s.fitParent();

const f = new Form(s);

const l = f.add(new Label('this is some text'), 10, 10);
const l2 = f.add(new Label('aligned label'), null, 20);
f.constrain(new AlignConstraint(l2, Coord.X, l, Coord.XW, 20));
const b = f.add(new Button('Cancel'), 80, 130, 80, 26);
const b2 = f.add(new Button('Wide'), 20, 200, null, 26, 20, null);
const c = f.add(new Checkbox('Enabled'), 10, 70, 100, 26);

const bf1 = f.add(new Button('One'), 10, 300, null, 26);
const bf2 = f.add(new Button('Two'), null, 300, null, 26);
const bf3 = f.add(new Button('Three'), null, 300, null, 26, 10, null);
f.constrain(new FillConstraint([bf1, bf2, bf3], Coord.W));
f.constrain(new AlignConstraint(bf2, Coord.X, bf1, Coord.XW, 10));
f.constrain(new AlignConstraint(bf3, Coord.X, bf2, Coord.XW, 10));

const bf11 = f.add(new Button('+One'), 40, 360, null, 26);
f.constrain(new AlignConstraint(bf11, Coord.W, bf1, Coord.W));

const bfx1 = f.add(new Button('Two A'), null, 420, null, 26);
const bfx2 = f.add(new Button('Two B'), null, 420, null, 26);

f.constrain(new AlignConstraint(bfx1, Coord.X, bf2, Coord.X));
f.constrain(new AlignConstraint(bfx2, Coord.XW, bf2, Coord.XW));
f.constrain(new AlignConstraint(bfx1, Coord.XW, bfx2, Coord.X));
f.constrain(new FillConstraint([bfx1, bfx2], Coord.W));

const t = f.add(new Textbox('hello'), null, 480, null, 26);
f.constrain(new AlignConstraint(t, Coord.W, bf1, Coord.W));
f.constrain(new AlignConstraint(t, Coord.X, bfx2, Coord.X));

const bfy1 = f.add(new Button('One Y'), 10, 530, null, 26);
const bfy2 = f.add(new Button('Two Y'), null, 530, null, 26);
const bfy3 = f.add(new Button('Three Y'), null, 530, null, 26, 10, null);
f.constrain(new FillConstraint([bfy1, bfy2], Coord.W));
f.constrain(new AlignConstraint(bfy2, Coord.W, bfy3, Coord.W));
f.constrain(new AlignConstraint(bfy2, Coord.X, bfy1, Coord.XW, 10));
f.constrain(new AlignConstraint(bfy3, Coord.X, bfy2, Coord.XW, 10));


let n = 0;
b.click.add(() => {
  if (c.checked) {
    n += 1;
    l.setText('you clicked the button ' + n + ' times');
  }
});

t.change.add(() => {
  l2.setText(t.text);
});
