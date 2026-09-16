import { define } from "../core/element.js";
import { FwTextarea } from "./textarea.js";

define("fw-textarea", FwTextarea);

export { FwTextarea } from "./textarea.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-textarea": FwTextarea;
  }
}
