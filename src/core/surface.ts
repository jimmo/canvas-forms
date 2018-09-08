import { Event } from './events';
import { ResizeObserver } from 'resize-observer';

interface ChromeCanvasRenderingContext2D extends CanvasRenderingContext2D {
  resetTransform(): void;
}

// Fired by a surface when the browser cases the Canvas element to resize.
export class ResizeEventData {
  constructor(readonly w: number, readonly h: number) {
  }
}

// Fired when the container scrolls.
export class ScrollEventData {
  constructor(readonly dx: number, readonly dy: number) {
  }
}

// Fired by a surface when a mouse event happens on the canvas.
export class MouseEventData {
  constructor(readonly x: number, readonly y: number, readonly buttons: number) {
  }

  primaryButton() {
    return this.buttons & 1;
  }
}

export class KeyEventData {
  constructor(readonly key: number) {
  }
}

// Manages the HTML Canvas element, in particular keeping it sized correctly.
export class Surface {
  elem: HTMLCanvasElement;
  container: HTMLDivElement;

  ctx: CanvasRenderingContext2D;

  resize: Event;
  scroll: Event;
  mousedown: Event;
  mouseup: Event;
  mousemove: Event;
  mousewheel: Event;
  keydown: Event;

  constructor(selector: string) {
    // The <canvas> DOM element.
    this.elem = document.querySelector(selector);

    this.fitParent();

    // The 2D rendering context (used by all the `paint` methods).
    this.ctx = this.elem.getContext('2d');

    // Events (mostly used by Form).
    this.resize = new Event();
    this.scroll = new Event();
    this.mousedown = new Event();
    this.mouseup = new Event();
    this.mousemove = new Event();
    this.mousewheel = new Event();
    this.keydown = new Event();

    // To allow the canvas to take focus.
    this.container.tabIndex = 1;

    const createTouchEventData = (ev: TouchEvent) => {
      const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      const offsetX = ev.changedTouches[0].clientX - rect.left;
      const offsetY = ev.changedTouches[0].clientY - rect.top;
      return new MouseEventData(this.pixels(offsetX), this.pixels(offsetY), ev.touches.length);
    }

    const createMouseEventData = (ev: MouseEvent) => {
      const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
      const offsetX = ev.clientX - rect.left;
      const offsetY = ev.clientY - rect.top;
      return new MouseEventData(this.pixels(offsetX), this.pixels(offsetY), ev.buttons);
    }

    // Forward DOM events to our own events.
    if (navigator.maxTouchPoints || document.documentElement['ontouchstart']) {
      this.container.addEventListener('touchstart', (ev) => {
        this.mousedown.fire(createTouchEventData(ev));
        if (ev.target === this.container) {
          ev.preventDefault();
        }
      });
      this.container.addEventListener('touchend', (ev) => {
        this.mouseup.fire(createTouchEventData(ev));
      });
      this.container.addEventListener('touchmove', (ev) => {
        this.mousemove.fire(createTouchEventData(ev));
      });
      this.container.addEventListener('mousedown', (ev) => {
        this.mousedown.fire(createMouseEventData(ev));
      });
      this.container.addEventListener('mouseup', (ev) => {
        this.mouseup.fire(createMouseEventData(ev));
      });
      this.container.addEventListener('mousemove', (ev) => {
        this.mousemove.fire(createMouseEventData(ev));
      });
    } else {
      this.container.addEventListener('mousedown', (ev) => {
        this.mousedown.fire(createMouseEventData(ev));
      });
      this.container.addEventListener('mouseup', (ev) => {
        this.mouseup.fire(createMouseEventData(ev));
      });
      this.container.addEventListener('mousemove', (ev) => {
        this.mousemove.fire(createMouseEventData(ev));
      });
    }

    this.container.addEventListener('keydown', (ev) => {
      this.keydown.fire(new KeyEventData(ev.keyCode));
    });

    this.container.addEventListener('wheel', (ev) => {
      let dx = ev.deltaX;
      let dy = ev.deltaY;
      if (ev.deltaMode === 0) {
        // Pixels
      } else if (ev.deltaMode === 1) {
        // Lines
        dx *= 20;
        dy *= 20;
      } else if (ev.deltaMode === 2) {
        // Pages
        // ?
      }
      this.mousewheel.fire(new MouseEventData(this.pixels(ev.offsetX), this.pixels(ev.offsetY), ev.buttons));
      this.scroll.fire(new ScrollEventData(-dx, -dy));
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

    parent.style.touchAction = 'none';

    if (parent === document.body) {
      // So that the resize observer can track height.
      parent.style.height = '100%';
      parent.parentElement.style.height = '100%';
    }

    this.container = document.createElement('div');
    this.elem.remove();
    this.container.appendChild(this.elem);
    parent.appendChild(this.container);

    this.container.style.position = 'absolute';
    this.container.style.boxSizing = 'border-box';
    this.container.style.left = '0px';
    this.container.style.top = '0px';
    this.container.style.overflow = 'hidden';

    // Position in top-left of parent.
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

      // Get the content size of the canvas (just incase it has a border).
      w = this.elem.clientWidth;
      h = this.elem.clientHeight;

      // Set the actual canvas dimensions to take into account scaling.
      const s = window.devicePixelRatio;
      this.elem.width = Math.round(w * s);
      this.elem.height = Math.round(h * s);
      (<ChromeCanvasRenderingContext2D>(this.ctx)).resetTransform();

      let zoom = Math.floor(s);
      this.ctx.scale(zoom, zoom);

      // Add a 0.5px offset so that all operations align to the pixel grid.
      // TODO: figure out why this is needed. Does canvas consider coordinates to be on the
      // pixel boundaries by default?
      this.ctx.translate(0.5, 0.5);

      this.resize.fire(new ResizeEventData(Math.round(w * s / zoom), Math.round(h * s / zoom)));
    }).observe(parent);
  }

  // Gets the x coordinate of this control relative to the surface.
  htmlX(): number {
    return 0;
  }

  // Gets the y coordinate of this control relative to the surface.
  htmlY(): number {
    return 0;
  }

  pixels(v: number): number {
    return Math.round(v * window.devicePixelRatio / Math.floor(window.devicePixelRatio));
  }

  htmlunits(v: number): number {
    return v / window.devicePixelRatio * Math.floor(window.devicePixelRatio);
  }
}
