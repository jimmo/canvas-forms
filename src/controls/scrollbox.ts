import { Control, ControlEvent, ControlAtPointOpts } from '../core/control';

export class ScrollBox extends Control {
  // Scroll coordinates.
  // TODO: Investigate making it possible to make AlignConstraints based on these.
  // i.e. add a Coord.SX / Coord.SY.
  // This might be tricky because we don't want to have to relayout() on scroll.
  private scrollX: number = 0;
  private scrollY: number = 0;

  // The maximum XW coordinate of any control.
  private xmax: number = 0;
  // The maximum YH coordinate of any control.
  private ymax: number = 0;

  constructor() {
    super();

    // Even thoguh we don't trap mousedown/up/move directly, we need to be able to be
    // the focused control.
    this.enableHitDetection();

    // Enable drag scrolling (mobile-style, but works on desktop too).
    this.mousedown.add((ev) => {
      ev.captureDrag();
      ev.cancelBubble();
    });
    this.mousemove.add((ev) => {
      if (ev.capture) {
        if (!this.scrollBy(ev.dx, ev.dy)) {
          let p = this.parent;
          while (p) {
            if (this.parent instanceof ScrollBox) {
              if (this.parent.scrollBy(ev.dx, ev.dy)) {
                return;
              }
            }
            p = p.parent;
          }
          ev.cancelDragCapture();
        }
      }
    });
  }

  shouldPaint(control: Control) {
    // Optimisation to disable painting of controls that are completely outside the clip
    // region. For 4000 labels in a scroll view (with approx 20 visible) this gives 10x
    // faster repaints.
    return control.xw - this.scrollX >= 0 && control.x - this.scrollX <= this.w && control.yh - this.scrollY >= 0 && control.y - this.scrollY <= this.h;
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    // Do regular paint, but offset by the scroll coordinates.
    ctx.translate(-this.scrollX, -this.scrollY);
    super.paint(ctx);
    ctx.translate(this.scrollX, this.scrollY);

    // Draw scrollbars.
    ctx.fillStyle = this.form.style.color.scrollbar;

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
    // Because we shift paint by the scroll coordinates, we need to undo that
    // so the border draws in the correct place.
    ctx.translate(this.scrollX, this.scrollY);
    super.paintDecorations(ctx);
    ctx.translate(-this.scrollX, -this.scrollY);
  }


  // Attempt to scroll by the specified deltas.
  // Returns true if at least some scroll movement happened (i.e. we should prevent the scroll
  // event bubbling to ancestor containers).
  scrollBy(dx: number, dy: number): boolean {
    const sx = this.scrollX;
    const sy = this.scrollY;
    this.scrollX -= dx;
    this.scrollY -= dy;
    this.clipScroll();
    this.repaint();
    return (dx === 0 && dy === 0) || (Math.abs(dx) > 0 && sx !== this.scrollX) || (Math.abs(dy) > 0 && sy !== this.scrollY);
  }

  // Don't allow scrolling past the origin or the maximum control bounds
  clipScroll() {
    this.scrollX = Math.round(Math.min(Math.max(0, this.xmax - this.w), Math.max(0, this.scrollX)));
    this.scrollY = Math.round(Math.min(Math.max(0, this.ymax - this.h), Math.max(0, this.scrollY)));
  }

  // Callback from Control, called on each control when layout is complete.
  layoutComplete() {
    // TODO: investigate skipping layout for controls that are outside the visible
    // area. This means we'd need to re-layout on scrolll potentially? Maybe there
    // could be a buffer of N px in all directions that can trigger relayout.
    // Need to figure out how much layout costs. Skipping painting is probably a much
    // better optimisation as layout happens less often.
    super.layoutComplete();

    this.xmax = 0;
    this.ymax = 0;
    for (const c of this.controls) {
      this.xmax = Math.max(this.xmax, c.xw);
      this.ymax = Math.max(this.ymax, c.yh);
    }

    this.clipScroll();
  }

  // Override base implementation to provide details about current scroll position.
  controlAtPoint(x: number, y: number, opts?: ControlAtPointOpts) {
    return super.controlAtPoint(x + this.scrollX, y + this.scrollY, opts);
  }


  // Override base version to take into account scroll coordinates.
  get formX(): number {
    return super.formX - this.scrollX;
  }
  get formY(): number {
    return super.formY - this.scrollY;
  }

  // The amount of total scrollable width / height.
  get scrollWidth(): number {
    return Math.max(this.w, this.xmax);
  }
  get scrollHeight(): number {
    return Math.max(this.h, this.ymax);
  }
}
