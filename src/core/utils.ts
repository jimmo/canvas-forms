export class Timer {
  private timeout: number;

  constructor(private readonly callback: () => void, private readonly delay: number) {
    this.start();
  }

  reset() {
    if (this.timeout) {
      this.start();
    }
  }

  private start() {
    this.cancel();
    this.timeout = window.setTimeout(() => {
      this.timeout = null;
      this.callback();
    }, this.delay);
  }

  cancel() {
    if (this.timeout) {
      window.clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
