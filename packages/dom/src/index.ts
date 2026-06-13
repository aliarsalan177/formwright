import { setDefaultRenderer } from "@formwright/core";
import { domRenderer } from "./render.js";

// Registering the DOM renderer as the default is the intended side effect of
// importing this package — it makes `new Form(schema).mount(el)` "just work".
setDefaultRenderer(domRenderer);

export { mount, domRenderer } from "./render.js";
export { registerWidget, getWidget, type WidgetFactory, type WidgetContext } from "./widgets.js";
export { Scope, h } from "./internal.js";
