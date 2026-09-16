import { define } from "../core/element.js";
import { FwDropdown } from "./dropdown.js";
import { FwMenuDivider } from "./menu-divider.js";
import { FwMenuItem } from "./menu-item.js";
import { FwMenuLabel } from "./menu-label.js";

define("fw-menu-item", FwMenuItem);
define("fw-menu-divider", FwMenuDivider);
define("fw-menu-label", FwMenuLabel);
define("fw-dropdown", FwDropdown);

export { FwDropdown, type DropdownSelectDetail } from "./dropdown.js";
export { FwMenuDivider } from "./menu-divider.js";
export { FwMenuItem, type MenuItemType } from "./menu-item.js";
export { FwMenuLabel } from "./menu-label.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-dropdown": FwDropdown;
    "fw-menu-item": FwMenuItem;
    "fw-menu-divider": FwMenuDivider;
    "fw-menu-label": FwMenuLabel;
  }
}
