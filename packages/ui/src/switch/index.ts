import { define } from "../core/element.js";
import { FwSwitch } from "./switch.js";

define("fw-switch", FwSwitch);

export { FwSwitch } from "./switch.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-switch": FwSwitch;
  }
}
