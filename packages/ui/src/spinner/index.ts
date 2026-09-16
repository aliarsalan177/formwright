import { define } from "../core/element.js";
import { FwSpinner } from "./spinner.js";

define("fw-spinner", FwSpinner);

export { FwSpinner, type SpinnerSize } from "./spinner.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-spinner": FwSpinner;
  }
}
