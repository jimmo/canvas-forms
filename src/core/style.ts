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
        return "rgb(" + r + ", " + g + ", " + b + ")"
    }

    static rgbmap(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, v: number, vmin: number, vmax: number) {
        return StyleColor.rgb(r1 + Math.round((v - vmin) * (r2-r1) / (vmax - vmin)), g1 + Math.round((v - vmin) * (g2-g1) / (vmax - vmin)), b1 + Math.round((v - vmin) * (b2-b1) / (vmax - vmin)))
    }

    static hsl(h: number, s: number, l: number) {
        return "hsl(" + Math.round(h * 260) + "deg " + Math.round(s * 100) + "% " + Math.round(l*100) + "%)"
    }

    static hslmap(h1: number, s1: number, l1: number, h2: number, s2: number, l2: number, v: number, vmin: number, vmax: number) {
        return StyleColor.hsl(h1 + (v - vmin) * (h2-h1) / (vmax - vmin), s1 + (v - vmin) * (s2-s1) / (vmax - vmin), l1 + (v - vmin) * (l2-l1) / (vmax - vmin))
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
