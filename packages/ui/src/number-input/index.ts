import { define } from "../core/element.js";
import { FwNumberInput } from "./number-input.js";

define("fw-number-input", FwNumberInput);

export { FwNumberInput, parseLocaleNumber } from "./number-input.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-number-input": FwNumberInput;
  }
}
