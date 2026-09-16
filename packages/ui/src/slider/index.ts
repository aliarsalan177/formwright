import { define } from "../core/element.js";
import { FwSlider } from "./slider.js";

define("fw-slider", FwSlider);

export { FwSlider } from "./slider.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-slider": FwSlider;
  }
}
