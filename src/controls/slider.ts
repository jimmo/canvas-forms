import { FormMouseDownEvent } from '../core/form';
import { Control } from '../core/control';
import { EventSource } from '../core/events';

export enum SliderDirection {
    Horizontal,
    Vertical,
};

export class Slider extends Control {
    change: EventSource;
    protected _value: number = 0;
    protected _min: number = 0;
    protected _max: number = 1;
    protected _snap: number = 0;
    protected _direction: SliderDirection = SliderDirection.Horizontal;
    protected _handleWidth: number = 16;

    constructor(value?: number, min?: number, max?: number, snap?: number, direction?: SliderDirection) {
        super();

        this._value = value || 0;
        this._min = min || 0;
        this._max = max === undefined ? 1 : max;
        this._snap = snap;
        this._direction = direction || SliderDirection.Horizontal;
        this._handleWidth = 16;

        this.change = new EventSource();

        this.mousedown.add((data) => {
            data.capture();
            data.cancelBubble();
        });
        this.mousemove.add((data) => {
            if (!data.capture) {
                return;
            }
            let x = this._direction == SliderDirection.Horizontal ? data.x : data.y;
            let w = this._direction == SliderDirection.Horizontal ? this.w : this.h;
            this.value = Math.min(1, Math.max(0, ((x - this._handleWidth/2) / (w - this._handleWidth)))) * (this._max - this._min) + this._min;
        });
    }

    get value() {
        return this._value;
    }

    set value(v: number) {
        this._value = Math.min(this._max, Math.max(this._min, v));
        if (this._snap) {
            this._value = Math.round(this._value / this._snap) * this._snap;
        }
        this.change.fire();
        this.repaint();
    }

    protected paint(ctx: CanvasRenderingContext2D) {
        super.paint(ctx);

        ctx.fillStyle = this.form.style.color.button;
        ctx.strokeStyle = this.form.style.color.insetLeft;
        ctx.lineWidth = 1;
        ctx.lineJoin = 'round';

        ctx.strokeRect(0, 0, this.w, this.h);

        if (this._direction == SliderDirection.Horizontal) {
            let x = (this.w - this._handleWidth) * (this._value - this._min) / (this._max - this._min);
            ctx.fillRect(x, 2, this._handleWidth, this.h - 4);
        } else {
            let y = (this.h - this._handleWidth) * (this._value - this._min) / (this._max - this._min);
            ctx.fillRect(2, y, this.w - 4, this._handleWidth);
        }
    }

    scrollBy(dx: number, dy: number): boolean {
        const v = this._value;
        if (this._snap) {
            this.value = this._value + Math.sign(dy) * this._snap;
        } else {
            this.value = this._value + dy * (this._max - this._min) / 2000;
        }
        return this._value !== v;
    }
}
