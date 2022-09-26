export class StyleColor {
    private get commonBorder() {
        return '#404040';
    }

    get insetLeft() {
        return this.commonBorder;
    }

    get insetTop() {
        return this.commonBorder;
    }

    get insetRight() {
        return this.commonBorder;
    }

    get insetBottom() {
        return this.commonBorder
    }

    get outsetLeft() {
        return this.commonBorder;
    }

    get outsetTop() {
        return this.commonBorder;
    }

    get outsetRight() {
        return this.commonBorder;
    }

    get outsetBottom() {
        return this.commonBorder
    }

    get separator() {
        return this.commonBorder;
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
        return this.commonBorder;
    }

    static rgb(r: number, g: number, b: number) {
        return "rgb(" + r + ", " + g + ", " + b+ ")"
    }

    static rgbmap(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, v: number, vmin: number, vmax: number) {
        // TODO: Use HSL rather than RGB interpolation.
        return StyleColor.rgb(r1 + Math.round((v - vmin) * (r2-r1) / (vmax - vmin)), g1 + Math.round((v - vmin) * (g2-g1) / (vmax - vmin)), b1 + Math.round((v - vmin) * (b2-b1) / (vmax - vmin)))
    }
}

export class StyleBorder {
    get radius() {
        return 6;
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
