export class StyleColor {
  get insetLeft() {
    return '#808080';
  }

  get insetTop() {
    return '#808080';
  }

  get insetRight() {
    return '#808080';
  }

  get insetBottom() {
    return '#808080'
  }

  get outsetLeft() {
    return '#808080';
  }

  get outsetTop() {
    return '#808080';
  }

  get outsetRight() {
    return '#808080';
  }

  get outsetBottom() {
    return '#808080'
  }

  get separator() {
    return '#808080';
  }

  get selected() {
    return '#ffaa44';
  }

  get hovered() {
    return '#ff9800';
  }

  get menu() {
    return '#e0e0e0';
  }

  get button() {
    return '#ffeecc';
  }

  get text() {
    return '#202020';
  }

  get shadow() {
    return '#c0c0c0';
  }

  get scrollbar() {
    return '#404040';
  }

  get background() {
    return '#ffffff';
  }

  get symbol() {
    return '#808080';
  }
}

export class StyleBorder {
  get radius() {
    return 4;
  }
}

export class Style {
  constructor(private _color?: StyleColor, private _border?: StyleBorder) {
    this._color = this._color || new StyleColor();
    this._border = this._border || new StyleBorder();
  }

  get color(): StyleColor {
    return this._color;
  }

  get border(): StyleBorder {
    return this._border;
  }
}
