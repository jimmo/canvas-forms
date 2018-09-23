type Listener<T> = (data?: T) => void;
type AddCallback = () => void;

class EventListener<T> {
  timeout: number;
  constructor(private readonly callback: Listener<T>, private readonly limit: number) {
  }
  fire(data?: T) {
    if (!this.limit) {
      this.callback(data);
      return;
    }

    if (this.timeout) {
      window.clearTimeout(this.timeout);
    }
    this.timeout = window.setTimeout(() => {
      this.timeout = null;
      this.callback(data);
    }, this.limit);
  }
}

// Represents a single event that can be fired or listened to.
// Event sources should specify the data type that their event passes to the listener.
export class EventSource<T = any> {
  // List of callbacks to invoke when the event fires.
  listeners: EventListener<T>[] = [];
  addCallback: AddCallback;

  constructor(addCallback?: AddCallback) {
    // Optionally specify a callback to be invoked when a new listener is added.
    // This allows an optimisation where Whatever owns this event source might
    // only want to enable certain functionality if anyone is actually listening
    // to this event.
    this.addCallback = addCallback;
  }

  // Invoke all the listeners with the specified data payload.
  fire(data?: T) {
    for (const h of this.listeners) {
      try {
        h.fire(data);
      } catch (ex) {
        // TODO: Perhaps rethrow? Work make noticing errors easier.
        console.log('Exception in event handler', ex);
      }
    }
  }

  // Adds the listener to the set of callbacks for when this event is fired.
  add(h: Listener<T>, limit?: number) {
    this.listeners.push(new EventListener(h, limit));

    if (this.addCallback) {
      // Notify the owner that someone now cares about this event.
      this.addCallback();
    }
  }
}
