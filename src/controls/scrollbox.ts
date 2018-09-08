import { Control, ControlEventData } from '../core/control';

export class ScrollBox extends Control {
  // Scroll coordinates.
  private scrollX: number = 0;
  private scrollY: number = 0;
  private xmax: number = 0;
  private ymax: number = 0;

  constructor() {
    super();
    this.clip = true;

    this.enableHitDetection();
  }

  shouldPaint(control: Control) {
    // Optimisation to disable painting of controls that are completely outside the clip
    // region. For 4000 labels in a scroll view (with approx 20 visible) this gives 10x
    // faster repaints.
    return control.xw - this.scrollX >= 0 && control.x - this.scrollX <= this.w && control.yh - this.scrollY >= 0 && control.y - this.scrollY <= this.h;
  }

  paint(ctx: CanvasRenderingContext2D) {
    // Do regular paint, but offset by the scroll coordinates.
    ctx.translate(-this.scrollX, -this.scrollY);
    super.paint(ctx);
    ctx.translate(this.scrollX, this.scrollY);

    // Draw scrollbars.
    ctx.fillStyle = '#404040';

    // Horizontal scrollbar.
    if (this.xmax > this.w) {
      let w = this.w;
      if (this.ymax > this.h) {
        // Leave room for vertical scrollbar.
        w -= 12;
      }
      const sw = w * (this.w / this.xmax);
      const sx = (w - sw) * this.scrollX / (this.xmax - this.w);
      ctx.fillRect(sx, this.h - 10, sw, 7);
    }

    // Vertical scrollbar.
    if (this.ymax > this.h) {
      let h = this.h;
      if (this.xmax > this.w) {
        // Leave room for horizontal scrollbar.
        h -= 12;
      }
      const sh = h * (this.h / this.ymax);
      const sy = (h - sh) * this.scrollY / (this.ymax - this.h);
      ctx.fillRect(this.w - 10, sy, 7, sh);
    }
  }

  paintDecorations(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.scrollX, this.scrollY);
    super.paintDecorations(ctx);
    ctx.translate(-this.scrollX, -this.scrollY);
  }


  scrollBy(dx: number, dy: number): boolean {
    // TODO: this should bubble up to parent scroll containers when bounds are hit.
    this.scrollX -= dx;
    this.scrollY -= dy;
    this.clipScroll();
    this.repaint();
    return true;
  }

  clipScroll() {
    this.scrollX = Math.min(Math.max(0, this.xmax - this.w), Math.max(0, this.scrollX));
    this.scrollY = Math.min(Math.max(0, this.ymax - this.h), Math.max(0, this.scrollY));
  }

  layout() {
    // TODO: investigate skipping layout for controls that are outside the visible
    // area. This means we'd need to re-layout on scrolll potentially? Maybe there
    // could be a buffer of N px in all directions that can trigger relayout.
    // Need to figure out how much layout costs. Skipping painting is probably a much
    // better optimisation as layout happens less often.
    super.layout();

    this.xmax = 0;
    this.ymax = 0;
    for (const c of this.controls) {
      this.xmax = Math.max(this.xmax, c.xw);
      this.ymax = Math.max(this.ymax, c.yh);
    }

    this.clipScroll();
  }

  controlAtPoint(x: number, y: number, formX?: number, formY?: number) {
    return super.controlAtPoint(x + this.scrollX, y + this.scrollY, formX, formY);
  }


  // Gets the x coordinate of this control relative to the surface.
  formX(): number {
    return super.formX() - this.scrollX;
  }

  // Gets the y coordinate of this control relative to the surface.
  formY(): number {
    return super.formY() - this.scrollY;
  }

  scrollWidth(): number {
    return Math.max(this.w, this.xmax);
  }

  scrollHeight(): number {
    return Math.max(this.h, this.ymax);
  }
}
