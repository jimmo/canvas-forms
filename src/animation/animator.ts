import { Control, Form } from "../core";

export abstract class Animator {
  loop: boolean = false;
  private time: number = 0;
  private _resolve: (data?: any) => void;

  constructor(protected readonly form: Form) {
  }

  start() {
    this.time = 0;
    this.update(this.time);
    this.form.addAnimator(this);
    this.form.relayout();
    return new Promise<void>((resolve) => {
      this._resolve = resolve;
    });
  }

  stop() {
    this.form.removeAnimator(this);
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  apply() {
    this.time += 0.05;
    this.update(this.time);
    if (this.time < 1) {
      this.form.relayout();
    } else {
      if (this.loop) {
        this.time = 0;
      } else {
        this.stop();
      }
    }
  }

  abstract update(t: number): void;
};
