import { define } from "../core/element.js";
import { FwOption } from "./option.js";
import { FwSelect } from "./select.js";

define("fw-option", FwOption);
define("fw-select", FwSelect);

export { FwOption } from "./option.js";
export { FwSelect } from "./select.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-select": FwSelect;
    "fw-option": FwOption;
  }
}
