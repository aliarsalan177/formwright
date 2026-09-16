import { define } from "../core/element.js";
import { FwPopover } from "./popover.js";

define("fw-popover", FwPopover);

export { FwPopover, type PopoverTrigger } from "./popover.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-popover": FwPopover;
  }
}
