import { define } from "../core/element.js";
import { FwRadio } from "./radio.js";
import { FwRadioGroup } from "./radio-group.js";

define("fw-radio", FwRadio);
define("fw-radio-group", FwRadioGroup);

export { FwRadio } from "./radio.js";
export { FwRadioGroup } from "./radio-group.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-radio-group": FwRadioGroup;
    "fw-radio": FwRadio;
  }
}
