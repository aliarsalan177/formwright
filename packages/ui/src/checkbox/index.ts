import { define } from "../core/element.js";
import { FwCheckbox } from "./checkbox.js";

define("fw-checkbox", FwCheckbox);

export { FwCheckbox } from "./checkbox.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-checkbox": FwCheckbox;
  }
}
