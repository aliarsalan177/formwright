import { define } from "../core/element.js";
import { FwDivider } from "./divider.js";

define("fw-divider", FwDivider);

export { FwDivider, type DividerOrientation } from "./divider.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-divider": FwDivider;
  }
}
