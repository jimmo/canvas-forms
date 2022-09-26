import { EventSource } from './events';
import { ResizeObserver } from 'resize-observer';

// Canvas context methods that TypeScript doesn't seem to know about.
interface ChromeCanvasRenderingContext2D extends CanvasRenderingContext2D {
    resetTransform(): void;
}

// Fired by a surface when the browser cases the Canvas element to resize.
export class SurfaceResizeEvent {
    constructor(readonly w: number, readonly h: number) {
    }
}

// Fired when the container scrolls.
export class SurfaceScrollEvent {
    constructor(readonly dx: number, readonly dy: number) {
    }
}

// Fired by a surface when a mouse event happens on the canvas.
export class SurfaceMouseEvent {
    constructor(readonly x: number, readonly y: number, readonly button: number, readonly buttons: number) {
    }

    primaryButton() {
        return this.buttons & 1;
    }

    secondaryyButton() {
        return this.buttons & 2;
    }

    wasPrimary() {
        return this.button === 0;
    }

    wasSecondary() {
        return this.button === 1;
    }
}

// Fired when a key event happens on the canvas.
export class SurfaceKeyEvent {
    constructor(readonly key: number) {
    }
}

// Manages the HTML Canvas element, in particular keeping it sized correctly.
export class Surface {
    elem: HTMLCanvasElement;
    container: HTMLDivElement;

    ctx: CanvasRenderingContext2D;

    resize: EventSource<SurfaceResizeEvent>;
    scroll: EventSource<SurfaceScrollEvent>;
    mousedown: EventSource<SurfaceMouseEvent>;
    mouseup: EventSource<SurfaceMouseEvent>;
    mousemove: EventSource<SurfaceMouseEvent>;
    mousewheel: EventSource<SurfaceMouseEvent>;
    mousedbl: EventSource<SurfaceMouseEvent>;
    keydown: EventSource<SurfaceKeyEvent>;
    contextmenu: EventSource<SurfaceMouseEvent>;

    constructor(selector: string) {
        // The <canvas> DOM element.
        this.elem = document.querySelector(selector);

        // Position and automatically resize the canvas element.
        this.fitParent();

        // The 2D rendering context (used by all the `paint` methods).
        this.ctx = this.elem.getContext('2d');

        // Events (mostly used by Form).
        this.resize = new EventSource();
        this.scroll = new EventSource();
        this.mousedown = new EventSource();
        this.mouseup = new EventSource();
        this.mousemove = new EventSource();
        this.mousewheel = new EventSource();
        this.mousedbl = new EventSource();
        this.keydown = new EventSource();
        this.contextmenu = new EventSource();

        // To allow the canvas to take focus (e.g. away from any input text elements).
        this.container.tabIndex = 1;

        // Maps browser touch events into our mouse events.
        const createTouchEvent = (ev: TouchEvent) => {
            if (ev.touches.length > 1) {
                return null;
            }
            const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
            const offsetX = ev.changedTouches[0].clientX - rect.left;
            const offsetY = ev.changedTouches[0].clientY - rect.top;
            return new SurfaceMouseEvent(this.pixels(offsetX), this.pixels(offsetY), 0, ev.touches.length);
        }

        // Maps browser mouse events into our mouse events.
        const createMouseEvent = (ev: MouseEvent) => {
            const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
            const offsetX = ev.clientX - rect.left;
            const offsetY = ev.clientY - rect.top;
            return new SurfaceMouseEvent(this.pixels(offsetX), this.pixels(offsetY), ev.button, ev.buttons);
        }

        // Forward DOM events to our own events.
        if (navigator.maxTouchPoints || document.documentElement['ontouchstart']) {
            this.container.addEventListener('touchstart', (ev) => {
                const tev = createTouchEvent(ev);
                if (tev) {
                    this.mousedown.fire(tev);
                }

                // Chrome (Android and desktop-with-touchscreen) immediately fires
                // a regular mouse up event immediately after the touchstart.
                // Disable this, unless it was on a different element (i.e. input text).
                if (ev.target === this.container) {
                    ev.preventDefault();
                }
            });
            this.container.addEventListener('touchend', (ev) => {
                const tev = createTouchEvent(ev);
                if (tev) {
                    this.mouseup.fire(tev);
                }
            });
            this.container.addEventListener('touchmove', (ev) => {
                const tev = createTouchEvent(ev);
                if (tev) {
                    this.mousemove.fire(tev);
                }
            });
        }
        this.container.addEventListener('mousedown', (ev) => {
            this.mousedown.fire(createMouseEvent(ev));
        });
        this.container.addEventListener('mouseup', (ev) => {
            this.mouseup.fire(createMouseEvent(ev));
        });
        this.container.addEventListener('mousemove', (ev) => {
            this.mousemove.fire(createMouseEvent(ev));
        });
        this.container.addEventListener('dblclick', (ev) => {
            this.mousedbl.fire(createMouseEvent(ev));
        });
        this.container.addEventListener('contextmenu', (ev) => {
            this.contextmenu.fire(createMouseEvent(ev));
            ev.preventDefault();
        });

        this.container.addEventListener('keydown', (ev) => {
            this.keydown.fire(new SurfaceKeyEvent(ev.keyCode));
        });

        this.container.addEventListener('wheel', (ev) => {
            let dx = ev.deltaX;
            let dy = ev.deltaY;
            if (ev.deltaMode === 0) {
                // Pixels (Chrome default).
            } else if (ev.deltaMode === 1) {
                // Lines (FireFox default)
                // Map to pixels.
                dx *= 20;
                dy *= 20;
            } else if (ev.deltaMode === 2) {
                // Pages
                // ?
            }
            // The form uses this to track which element is actually going to receive the scroll.
            // TODO: This is a bit of a relic from how scroll used to work, we should instead
            // add the mouse coordinates to the SurfaceScrolLEvent.
            this.mousewheel.fire(new SurfaceMouseEvent(this.pixels(ev.offsetX), this.pixels(ev.offsetY), 0, ev.buttons));
            this.scroll.fire(new SurfaceScrollEvent(-dx, -dy));
        });
    }

    // Make the canvas automatically size itself to the parent element.
    fitParent() {
        const parent = this.elem.parentElement;

        // Canvas elements don't work with percentage sizing.
        // So we make it absolutely positioned and use a resize observer to
        // set width and height explicitly.

        // We're absolutely positioned in the parent, so the parent needs to be relative or absolute.
        if (parent !== document.body && parent.style.position !== 'absolute') {
            parent.style.position = 'relative';
        }
        parent.style.overflow = 'hidden';

        // Disable pinch zoom and drag to refresh etc default behaviors.
        // We handle all touch gestures manually.
        parent.style.touchAction = 'none';

        if (parent === document.body) {
            // So that the resize observer can track height (pages otherwise have the size
            // of their content).
            parent.style.height = '100%'; // <body>
            parent.parentElement.style.height = '100%'; // <html>
        }

        // Re-add the canvas into a <div>. The idea is that the canvas is the last child of
        // the container div, sitting on top of any helper elements.
        // In order to make mouse events pass through to other elements, we disable
        // pointerEvents on the canvas, but catch all the relevant events on the div.
        // The canvas also makes sure that any HTML elements below it are visible by
        // using ctx.clearRect in the relevant areas.
        // (Where possible, form controls should avoid needing any HTML elements, but
        // textboxes and iframes are two good examples).
        this.container = document.createElement('div');
        this.elem.remove();
        this.container.appendChild(this.elem);
        parent.appendChild(this.container);

        // Position the container.
        this.container.style.position = 'absolute';
        this.container.style.boxSizing = 'border-box';
        this.container.style.left = '0px';
        this.container.style.top = '0px';
        this.container.style.overflow = 'hidden';

        // Position the canvas.
        this.elem.style.position = 'absolute';//'sticky';
        this.elem.style.boxSizing = 'border-box';
        this.elem.style.left = 0 + 'px';
        this.elem.style.top = 0 + 'px';
        this.elem.style.pointerEvents = 'none';

        // Listen for the parent's size changing.
        new ResizeObserver((entries: any[]) => {
            let w = 0, h = 0;

            // Get the content size of the parent.
            if (parent === document.body) {
                w = window.innerWidth;
                h = window.innerHeight;
            } else {
                w = parent.clientWidth;
                h = parent.clientHeight;
            }

            // Make our element sized correctly (CSS).
            this.container.style.width = w + 'px';
            this.container.style.height = h + 'px';
            this.elem.style.width = w + 'px';
            this.elem.style.height = h + 'px';

            // The canvas is positioned and sized in the browser based on its CSS dimensions.
            // The actual drawing operations use the width/height HTML attributes.
            // The browser might have pixel scaling enabled (e.g. high-dpi display, mobile).
            // So the goal here is to make it so that one unit in canvas coordinates is exactly
            // a whole number of real device pixels.
            // So in the simple case, by sizing the canvas element using the browser's idea of what
            // a pixel is, but then adjusting the canvas's apparant width/height, we can "undo"
            // browser pixel scaling.

            // Get the content size of the canvas (just incase it has a border).
            w = this.elem.clientWidth;
            h = this.elem.clientHeight;

            // Set the actual canvas dimensions to take into account scaling.
            const s = window.devicePixelRatio;
            this.elem.width = Math.round(w * s);
            this.elem.height = Math.round(h * s);
            (<ChromeCanvasRenderingContext2D>(this.ctx)).resetTransform();

            // However, on super high DPI displays, pixels are really tiny, so all our
            // UI elements will look tiny. So scale everything up to the nearest integer multiple
            // (integer multiple, so things still render clearly on the pixel grid).
            let zoom = Math.floor(s);
            this.ctx.scale(zoom, zoom);

            // Add a 0.5px offset so that all operations align to the pixel grid.
            // TODO: figure out why this is needed. Does canvas consider coordinates to be on the
            // pixel boundaries by default?
            this.ctx.translate(0.5, 0.5);

            // Let the form know that it needs to re-layout.
            this.resize.fire(new SurfaceResizeEvent(Math.round(w * s / zoom), Math.round(h * s / zoom)));
        }).observe(parent);
    }

    // Maps what the browser thinks a pixel is (e.g. event coordinates) into what
    // we think a pixel is (i.e. one unit in form coordinates).
    pixels(v: number): number {
        return Math.round(v * window.devicePixelRatio / Math.floor(window.devicePixelRatio));
    }

    // Inverse of `pixels`. Maps our units into browser units (e.g. so that we can
    // position an HTML element to align with our form).
    htmlunits(v: number): number {
        return v / window.devicePixelRatio * Math.floor(window.devicePixelRatio);
    }
}
