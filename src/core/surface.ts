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

// Manages the HTML Canvas element, in particular keeping it sized correctly.
export class Surface {
  elem: HTMLCanvasElement;
  scrollContainer: HTMLDivElement;
  scrollElems: HTMLDivElement[];

  ctx: CanvasRenderingContext2D;

  resize: Event;
  scroll: Event;
  mousedown: Event;
  mouseup: Event;
  mousemove: Event;
  mousewheel: Event;

  constructor(selector: string) {
    // The <canvas> DOM element.
    this.elem = document.querySelector(selector);
    this.scrollContainer = null;
    this.scrollElems = [];

    this.fitParent();

    // The 2D rendering context (used by all the `paint` methods).
    this.ctx = this.elem.getContext('2d');

    // Events (mostly used by Surface).
    this.resize = new Event();
    this.scroll = new Event();
    this.mousedown = new Event();
    this.mouseup = new Event();
    this.mousemove = new Event();
    this.mousewheel = new Event();

    // Forward DOM events to our own events.
    // if (navigator.maxTouchPoints || document.documentElement['ontouchstart']) {
    //   let tx = 0; let ty = 0;
    //   this.elem.addEventListener('touchstart', (ev) => {
    //     const s = window.devicePixelRatio;
    //     tx = ev.touches[0].clientX * s;
    //     ty = ev.touches[0].clientY * s;
    //     this.mousedown.fire(new MouseEventData(tx, ty));
    //   });
    //   this.elem.addEventListener('touchend', (ev) => {
    //     const s = window.devicePixelRatio;
    //     this.mouseup.fire(new MouseEventData(tx, ty));
    //   });
    //   this.elem.addEventListener('touchmove', (ev) => {
    //     const s = window.devicePixelRatio;
    //     tx = ev.touches[0].clientX * s;
    //     ty = ev.touches[0].clientY * s;
    //     this.mousemove.fire(new MouseEventData(tx, ty));
    //   });
    // }
    this.elem.addEventListener('mousedown', (ev) => {
      this.mousedown.fire(new MouseEventData(this.pixels(ev.offsetX), this.pixels(ev.offsetY), ev.buttons));
      ev.preventDefault();
    });
    this.elem.addEventListener('mouseup', (ev) => {
      this.mouseup.fire(new MouseEventData(this.pixels(ev.offsetX), this.pixels(ev.offsetY), ev.buttons));
      ev.preventDefault();
    });
    this.elem.addEventListener('mousemove', (ev) => {
      this.mousemove.fire(new MouseEventData(this.pixels(ev.offsetX), this.pixels(ev.offsetY), ev.buttons));
      ev.preventDefault();
    });
    this.elem.addEventListener('wheel', (ev) => {
      this.mousewheel.fire(new MouseEventData(this.pixels(ev.offsetX), this.pixels(ev.offsetY), ev.buttons));
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

    if (parent === document.body) {
      // So that the resize observer can track height.
      parent.style.height = '100%';
      parent.parentElement.style.height = '100%';
    }

    // Investigate whether this can be entirely replaced by using onwheel only.
    // It seems like you still get scroll inertia, and this would make scroll
    // focus simpler.
    this.scrollContainer = document.createElement('div');
    this.elem.remove();
    this.scrollContainer.appendChild(this.elem);
    parent.appendChild(this.scrollContainer);

    this.scrollContainer.style.position = 'absolute';
    this.scrollContainer.style.boxSizing = 'border-box';
    this.scrollContainer.style.left = '0px';
    this.scrollContainer.style.top = '0px';
    this.scrollContainer.style.overflow = 'scroll';

    this.scrollElems.push(document.createElement('div'));
    this.scrollElems.push(document.createElement('div'));
    for (const e of this.scrollElems) {
      e.style.position = 'absolute';
      e.style.width = '10px';
      e.style.height = '10px';
      this.scrollContainer.appendChild(e);
    }
    const v = window.innerWidth;
    this.scrollElems[0].style.left = '0px';
    this.scrollElems[0].style.top = '0px';
    this.scrollElems[1].style.left = v * 5 + 'px';
    this.scrollElems[1].style.top = v * 5 + 'px';

    this.scrollContainer.scrollLeft = v * 2;
    this.scrollContainer.scrollTop = v * 2;

    // Position in top-left of parent.
    this.elem.style.position = 'sticky';
    this.elem.style.boxSizing = 'border-box';
    this.elem.style.left = 0 + 'px';
    this.elem.style.top = 0 + 'px';

    let sx = 0;
    let sy = 0;
    this.scrollContainer.addEventListener('scroll', () => {
      let dx = this.pixels(v * 2 - this.scrollContainer.scrollLeft);
      let dy = this.pixels(v * 2 - this.scrollContainer.scrollTop);
      this.scroll.fire(new ScrollEventData(dx - sx, dy - sy));
      sx = dx;
      sy = dy;

      if (Math.abs(dx) > v) {
        sx = 0;
        this.scrollContainer.scrollLeft = v * 2;
      }
      if (Math.abs(dy) > v) {
        sy = 0;
        this.scrollContainer.scrollTop = v * 2;
      }
    });

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

      // debug scrollbars
      // w -= 20;
      // h -= 20;

      this.scrollContainer.style.width = (w + 100) + 'px';
      this.scrollContainer.style.height = (h + 100) + 'px';

      // Make our element sized correctly (CSS).
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
    return this.pixels(this.scrollContainer.scrollLeft);
  }

  // Gets the y coordinate of this control relative to the surface.
  htmlY(): number {
    return this.pixels(this.scrollContainer.scrollTop);
  }

  pixels(v: number): number {
    return Math.round(v * window.devicePixelRatio / Math.floor(window.devicePixelRatio));
  }

  htmlunits(v: number): number {
    return v / window.devicePixelRatio / Math.floor(window.devicePixelRatio);
  }
}
