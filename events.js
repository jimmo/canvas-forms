// Fired by a surface when the browser cases the Canvas element to resize.
class ResizeEventData {
  constructor(w, h) {
    this.w = w;
    this.h = h;
  }
}

// Fired when the container scrolls.
class ScrollEventData {
  constructor(dx, dy) {
    this.dx = dx;
    this.dy = dy;
  }
}

// Fired by a surface when a mouse event happens on the canvas.
class MouseEventData {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Base class for events raised from controls.
class ControlEventData {
  constructor(control) {
    this.control = control;
  }
}

// Fired when a textbox's text changes by user input.
class TextboxChangeEventData extends ControlEventData {
  constructor(control, text) {
    super(control)
    this.text = text;
  }
}

// Fired when a checkbox state changes by user input.
class CheckboxToggleEventData extends ControlEventData {
  constructor(control, checked) {
    super(control);
    this.checked = checked;
  }
}

// Structure to represent a successful hit test.
class ControlAtPointData {
  constructor(control, x, y) {
    this.control = control;
    // These coordinates are relative to the control.
    this.x = x;
    this.y = y;
  }
}

// Represents a single event that can be fired or listened to.
class Event {
  constructor(addCallback) {
    // List of callbacks to invoke when the event fires.
    this.listeners = [];

    // Optionally specify a callback to be invoked when a new listener is added.
    this.addCallback = addCallback;
  }

  fire(data) {
    // Invoke all the listeners with the specified data payload.
    for (const h of this.listeners) {
      h(data);
    }
  }

  add(h) {
    // Register listener and optionally notify the owner of this event that a listener was added.
    this.listeners.push(h);
    if (this.addCallback) {
      this.addCallback();
    }
  }
}
