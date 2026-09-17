/**
 * `@formwright/ui/core` — for building your own `fw-`-style elements on
 * the same base the library's components use.
 */
export { FwElement, define, nextId, type PropDef, type PropMap, type PropType } from "./element.js";
export { FwFormElement } from "./form-element.js";
export { baseStyles, srOnly } from "./styles.js";
export { LAYER_SLOT, enterModalLayer, onModalLayerChange, topModalLayer } from "./layers.js";
export { FwItemBase, itemStyles, type ItemSize } from "./item.js";
