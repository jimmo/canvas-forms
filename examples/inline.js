require(['candle'], function(candle) {

  const s = new candle.Surface('canvas');

  const f = new candle.Form(s);

  for (let i = 0; i < 30; ++i) {
    const b = f.add(new candle.Button('Click me'), 10 + i * 60, 10 + i * 40, 100, 26);
    b.click.add(() => {
      b.setText('Thanks!');
    });
  }

  f.add(new candle.Label('Top right'), null, 10, null, null, 10, null);

  const bd = f.add(new candle.Button('Prompt'), 10, null, 100, 26, null, 10);
  bd.click.add(async () => {
    const d = new candle.Dialog();
    const c = d.add(new candle.Button('Close'), null, null, 100, 26, 10, 10);
    c.click.add(() => {
      d.close('OK!');
    });
    bd.setText(await d.modal(f));
  });
});
