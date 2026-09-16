import { define } from "../core/element.js";
import { FwTooltip } from "./tooltip.js";

define("fw-tooltip", FwTooltip);

export { FwTooltip } from "./tooltip.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-tooltip": FwTooltip;
  }
}
