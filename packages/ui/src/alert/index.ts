import { define } from "../core/element.js";
import { FwAlert } from "./alert.js";

define("fw-alert", FwAlert);

export { FwAlert, type AlertTone } from "./alert.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-alert": FwAlert;
  }
}
