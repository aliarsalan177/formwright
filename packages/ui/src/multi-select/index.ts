import { define } from "../core/element.js";
import { FwOption } from "../select/option.js";
import { FwMultiSelect } from "./multi-select.js";

define("fw-option", FwOption);
define("fw-multi-select", FwMultiSelect);

export { FwOption } from "../select/option.js";
export { FwMultiSelect } from "./multi-select.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-multi-select": FwMultiSelect;
    "fw-option": FwOption;
  }
}
