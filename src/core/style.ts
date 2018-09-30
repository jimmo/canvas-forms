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

export class StyleFont {
  get size() {
    return 18;
  }

  get name() {
    return 'sans';
  }
}

export class Style {
  constructor(public color?: StyleColor, public border?: StyleBorder, public font?: StyleFont) {
    this.color = this.color || new StyleColor();
    this.border = this.border || new StyleBorder();
    this.font = this.font || new StyleFont();
  }
}
