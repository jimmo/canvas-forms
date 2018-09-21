type Listener<T> = (data?: T) => void;
type AddCallback = () => void;

// Represents a single event that can be fired or listened to.
// Event sources should specify the data type that their event passes to the listener.
export class EventSource<T = any> {
  listeners: Listener<T>[];
  addCallback: AddCallback;

  constructor(addCallback?: AddCallback) {
    // List of callbacks to invoke when the event fires.
    this.listeners = [];

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
        h(data);
      } catch (ex) {
        // TODO: Perhaps rethrow? Work make noticing errors easier.
        console.log('Exception in event handler', ex);
      }
    }
  }

  // Adds the listener to the set of callbacks for when this event is fired.
  add(h: Listener<T>) {
    this.listeners.push(h);

    if (this.addCallback) {
      // Notify the owner that someone now cares about this event.
      this.addCallback();
    }
  }
}
