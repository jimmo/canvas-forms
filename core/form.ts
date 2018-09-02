import { Surface, MouseEventData, ScrollEventData } from 'surface';
import { Control, ControlAtPointData } from 'control';

// Control that sits at the top of the hierarchy and manages the underlying
// surface to draw on.
export class Form extends Control {
  pendingLayout = false;
  pendingPaint = false;

  fontSize = 16;
  fontName = 'sans';
  color = 'black';

  private _editing = false;

  // TODO: this needs to default to the element under the cursor on page load.
  focus: ControlAtPointData;

  constructor(readonly surface: Surface) {
    super();

    // When the canvas resizes, relayout and repaint the entire form.
    this.surface.resize.add(data => {
      this.x = 0;
      this.y = 0;
      this.w = data.w;
      this.h = data.h;
      this.x2 = 0;
      this.y2 = 0;

      // Asynchronously relayout (and repaint) the form.
      this.relayout();
    });

    this.surface.scroll.add(data => {
      if (this.focus) {
        let c = this.focus.control;
        while (c) {
          if (c.scrollable) {
            c.scrollBy(data.dx, data.dy);
            break;
          }
          c = c.parent;
        }
      }
    });

    // Map mouse events on the surface into the control that the mouse is over.
    this.surface.mousemove.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      if (this.focus) {
        this.focus.control.focused = false;
      }
      this.focus = hit;
      this.focus.control.focused = true;
      hit.control.mousemove.fire(new MouseEventData(hit.x, hit.y));
      this.repaint();
    });
    this.surface.mousedown.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      hit.control.mousedown.fire(new MouseEventData(hit.x, hit.y));
    });
    this.surface.mouseup.add(data => {
      const hit = this.controlAtPoint(data.x, data.y);
      hit.control.mouseup.fire(new MouseEventData(hit.x, hit.y));
    });
  }

  paint(ctx: CanvasRenderingContext2D) {
    // Forms have a default (opaque) background color.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, this.w, this.h);

    super.paint(ctx);
  }

  // Default implementation of repaint does a full paint of the entire form.
  repaint() {
    this.pendingPaint = true;
    window.requestAnimationFrame((frameTime) => {
      //console.log('paint ' + frameTime);
      this.pendingPaint = false;

      this.paint(this.context());
    });
  }

  // Default implementation of relayout does a full paint of the entire form.
  relayout() {
    if (this.pendingLayout) {
      return;
    }

    if (this.w && this.h) {
      this.pendingLayout = true;
      window.requestAnimationFrame((frameTime) => {
        //console.log('layout ' + frameTime);
        this.pendingLayout = false;
        this.layout();
        if (!this.pendingPaint) {
          //console.log('paint ' + frameTime);
          this.paint(this.context());
        }
      });
    }
  }

  // We're the top of the hierarchy. The default implementation of this expects
  // the parent to be able to provide it, so that's what we do.
  context() {
    return this.surface.ctx;
  }

  editing() {
    return this._editing;
  }

  // Gets the x coordinate of this control relative to the surface.
  surfaceX(): number {
    return 0;
  }

  // Gets the y coordinate of this control relative to the surface.
  surfaceY(): number {
    return 0;
  }
}
