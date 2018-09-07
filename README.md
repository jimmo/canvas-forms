#### A library for building web apps with Canvas.

### What?
HTML and CSS an excellent tool for styling text. However they're a poor fit for most of the requirements of building an app. Modern features like flexbox continue to improve the situation, but it's still a very blunt tool. On top of this, working with three separate languages (HTML, CSS, and Javascript) makes for readability and maintenance problems.

Frameworks like React and Riot, and/or modern features like shadow DOM at least help you group the HTML, CSS, and Javascript for related parts of your app together, but wouldn't it be simpler just to not use HTML and CSS at all?

This library provides a rich Javascript API for building apps based on re-usable but easily customisable controls and widgets. To make responsive layout easier, it borrows some ideas from CAD, so you can express the layout of your app concisely. It includes a set of standard controls like list, textbox, slider, checkbox, tree, modals, etc. And it's fast!

If you've ever found yourself thinking...
* "why, flexbox, why?"
* "I'll just add another nested div..."
* "maybe it really would be easier to use position:absolute and calculate coordinates in javascript"
* "if only I could just implement paint and draw directly"
* "most of my app is just managing DOM elements"

...then this might be the library for you.

### Why?

#### So this is just another forms framework?
Yes. Some of the CAD features (like constraint-based layout) don't exist in many other forms APIs.

#### Why canvas? Couldn't you just provide the same API for the DOM?
The DOM is really slow [citation needed] and uses a lot of memory [citation needed]. Also a great deal of flexibility comes from being able to use graphics primitives directly. Also these libraries already exist.

#### What about the CSS Paint API / CSS Custom Paint / Houdini's Paint Worklet?
This would still require a lot of DOM management. Also Chrome-only [at this stage](https://caniuse.com/#feat=css-paint-api). [More information here](https://developers.google.com/web/updates/2018/01/paintapi).

#### People used to do this in Flash, and the results were janky and weird.
Modern Javascript VMs are much faster than ActionScript. Additionally, the browser gives a much richer set of APIs to build apps that behave more like "native" ones.

#### TypeScript?
A forms API involves a lot of interactions between different classes, and benefits hugely from type checking. Not to mention excellent IDE support. You can still use and extend candle-js from Javascript.

### Todo list:
* Controls:
  * Select
  * Tab
  * Date / Time
  * Progress
  * Spinner
  * Color
  * Validation for textbox
* Mouse enter/leave
* Drag & Drop
* Focus
* Scroll hierarchy
* Animation
* Layout
  * Flow
