import { define } from "../core/element.js";
import { FwButton } from "./button.js";

define("fw-button", FwButton);

export { FwButton, type ButtonSize, type ButtonVariant } from "./button.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-button": FwButton;
  }
}
