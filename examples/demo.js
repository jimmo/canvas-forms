require(['candle'], function(candle) {

  const s = new candle.Surface('canvas');

  const f = new candle.Form(s);

  const l = f.add(new candle.Label('this is some text'), 10, 10);
  const l2 = f.add(new candle.Label('aligned label'), null, 20);
  new candle.AlignConstraint(l2, candle.Coord.X, l, candle.Coord.XW, 20);
  const b = f.add(new candle.Button('Cancel'), 80, 130, 80, 26);
  const b2 = f.add(new candle.Button('Wide'), 20, 200, null, 26, 200, null);
  const c = f.add(new candle.Checkbox('Enabled'), 10, 70, 100, 26);

  const bf1 = f.add(new candle.Button('One'), 10, 300, null, 26);
  const bf2 = f.add(new candle.Button('Two'), null, 300, null, 26);
  const bf3 = f.add(new candle.Button('Three'), null, 300, null, 26, 10, null);
  new candle.FillConstraint([bf1, bf2, bf3], candle.Coord.W);
  new candle.AlignConstraint(bf2, candle.Coord.X, bf1, candle.Coord.XW, 10);
  new candle.AlignConstraint(bf3, candle.Coord.X, bf2, candle.Coord.XW, 10);

  const bf11 = f.add(new candle.Button('+One'), 40, 360, null, 26);
  new candle.AlignConstraint(bf11, candle.Coord.W, bf1, candle.Coord.W);

  const bfx1 = f.add(new candle.Button('Two A'), null, 420, null, 26);
  const bfx2 = f.add(new candle.Button('Two B'), null, 420, null, 26);

  new candle.AlignConstraint(bfx1, candle.Coord.X, bf2, candle.Coord.X);
  new candle.AlignConstraint(bfx2, candle.Coord.XW, bf2, candle.Coord.XW);
  new candle.AlignConstraint(bfx1, candle.Coord.XW, bfx2, candle.Coord.X);
  new candle.FillConstraint([bfx1, bfx2], candle.Coord.W);

  const t = f.add(new candle.Textbox('hello'), null, 80, null, 26);
  new candle.AlignConstraint(t, candle.Coord.W, bf1, candle.Coord.W);
  new candle.AlignConstraint(t, candle.Coord.X, bfx2, candle.Coord.X);

  const bfy1 = f.add(new candle.Button('One Y'), 10, 530, null, 26);
  const bfy2 = f.add(new candle.Button('Two Y'), null, 530, null, 26);
  const bfy3 = f.add(new candle.Button('Three Y'), null, 530, null, 26, 10, null);
  new candle.FillConstraint([bfy1, bfy2], candle.Coord.W);
  new candle.AlignConstraint(bfy2, candle.Coord.W, bfy3, candle.Coord.W);
  new candle.AlignConstraint(bfy2, candle.Coord.X, bfy1, candle.Coord.XW, 10);
  new candle.AlignConstraint(bfy3, candle.Coord.X, bfy2, candle.Coord.XW, 10);

  const sb = f.add(new candle.Scrollbox(), null, 20, 300, null, 20, 20);
  const lx = sb.add(new candle.Label('Text ' + 0), 20, 20);
  for (let i = 1; i < 100; ++i) {
    const l = sb.add(new candle.Label('Text ' + i), null, 20 + i * 40);
    new candle.AlignConstraint(l, candle.Coord.X, lx, candle.Coord.X, 0);
  }

  const br = f.add(new candle.Button('click to resize'), 10, 580, null, 26);
  const brw = new candle.StaticConstraint(br, candle.Coord.W, 100);
  const lr = f.add(new candle.Label('aligned'), null, 580);
  new candle.AlignConstraint(lr, candle.Coord.X, br, candle.Coord.XW, 10);
  br.click.add(() => {
    brw.add(20);
  });

  const sl = f.add(new candle.Slider(25, 0, 100), 300, 580, 200, 26);
  sl.change.add(() => {
    lr.setText(sl.value);
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
    const bb1 = f.add(new candle.Button('BB 1'), 10, 30, null, 26);
    const bb2 = f.add(new candle.Button('BB 2'), null, 30, null, 26);
    const bb3 = f.add(new candle.Button('BB 3'), null, 30, null, 26, 10, null);
    new candle.FillConstraint([bb1, bb2], candle.Coord.W);
    new candle.AlignConstraint(bb2, candle.Coord.W, bb3, candle.Coord.W);
    new candle.AlignConstraint(bb2, candle.Coord.X, bb1, candle.Coord.XW, 10);
    new candle.AlignConstraint(bb3, candle.Coord.X, bb2, candle.Coord.XW, 10);

    bb2.click.add(() => {
      bb2.remove();
    });
  });


  bfy1.click.add(async () => {
    const d = new candle.Dialog();
    const mdb = d.add(new candle.Button('Close'), null, null, 100, 26, 20, 20);

    mdb.click.add(() => {
      d.close('hello ' + new Date().getTime());
    });

    let result = await d.modal(f);
    bfy1.setText(result);
  });

});
