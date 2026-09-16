import { define } from "../core/element.js";
import { FwAccordion } from "./accordion.js";
import { FwAccordionItem } from "./accordion-item.js";

define("fw-accordion-item", FwAccordionItem);
define("fw-accordion", FwAccordion);

export { FwAccordion } from "./accordion.js";
export { FwAccordionItem } from "./accordion-item.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-accordion": FwAccordion;
    "fw-accordion-item": FwAccordionItem;
  }
}
