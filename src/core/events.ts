type Listener = (data?: any) => void;
type AddCallback = () => void;

// Represents a single event that can be fired or listened to.
export class Event {
  listeners: Listener[];
  addCallback: AddCallback;

  constructor(addCallback?: AddCallback) {
    // List of callbacks to invoke when the event fires.
    this.listeners = [];

    // Optionally specify a callback to be invoked when a new listener is added.
    this.addCallback = addCallback;
  }

  fire(data?: any) {
    // Invoke all the listeners with the specified data payload.
    for (const h of this.listeners) {
      try {
        h(data);
      } catch (ex) {
        console.log('Exception in event handler', ex);
      }
    }
  }

  add(h: Listener) {
    // Register listener and optionally notify the owner of this event that a listener was added.
    this.listeners.push(h);
    if (this.addCallback) {
      this.addCallback();
    }
  }
}
