import { define } from "../core/element.js";
import { FwInput } from "./input.js";

define("fw-input", FwInput);

export { FwInput, type InputType } from "./input.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-input": FwInput;
  }
}
