import { setDefaultRenderer } from "@formwright/core";
import { domRenderer } from "./render.js";

// Registering the DOM renderer as the default is the intended side effect of
// importing this package — it makes `new Form(schema).mount(el)` "just work".
setDefaultRenderer(domRenderer);

export { mount, domRenderer } from "./render.js";
export { renderSkeleton } from "./skeleton.js";
export { bindSubmitButton, bindDisabledWhileSubmitting } from "./actions.js";
export { readStepFromUrl, writeStepToUrl, wireStepUrlSync } from "./step-url.js";
export type { DomRendererOptions, SuccessScreenContext } from "@formwright/core";
export {
  registerWidget,
  getWidget,
  renderControl,
  type Widget,
  type WidgetFactory,
  type WidgetSpec,
  type WidgetBinding,
  type WidgetContext,
} from "./widgets.js";
export { Scope, h } from "./internal.js";
