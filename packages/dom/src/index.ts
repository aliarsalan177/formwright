import { setDefaultRenderer } from "@formwright/core";
import { domRenderer } from "./render.js";
import { registerPhoneField } from "./phone.js";

registerPhoneField();

// Registering the DOM renderer as the default is the intended side effect of
// importing this package — it makes `new Form(schema).mount(el)` "just work".
setDefaultRenderer(domRenderer);

export { mount, domRenderer } from "./render.js";
export { renderSkeleton } from "./skeleton.js";
export { bindSubmitButton, bindDisabledWhileSubmitting } from "./actions.js";
export {
  registerActionWidget,
  type ActionWidget,
  type ActionWidgetContext,
} from "./action-element.js";
export { registerAccordionWidget, type AccordionWidgetSpec } from "./accordion.js";
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
export { applyMountStyles, resolveSummaryEnabled } from "./styles.js";
export {
  isPhoneValue,
  normalizePhoneValue,
  formatPhoneDisplay,
  validatePhoneValue,
  registerPhoneField,
  flagEmoji,
  createFlagIcon,
  injectFlagStyles,
  setFlagIcon,
} from "./phone.js";
