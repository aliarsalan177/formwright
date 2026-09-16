import { define } from "../core/element.js";
import { FwOption } from "../select/option.js";
import { FwCombobox } from "./combobox.js";

define("fw-option", FwOption);
define("fw-combobox", FwCombobox);

export { FwOption } from "../select/option.js";
export { FwCombobox, type ComboboxFilter } from "./combobox.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-combobox": FwCombobox;
    "fw-option": FwOption;
  }
}
