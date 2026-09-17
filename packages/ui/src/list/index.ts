import { define } from "../core/element.js";
import { FwList } from "./list.js";
import { FwListItem } from "./list-item.js";

define("fw-list-item", FwListItem);
define("fw-list", FwList);

export { FwList, type ListSelectDetail, type ListSelection, type ListVariant } from "./list.js";
export { FwListItem, type ListItemContext, type ListItemSelectDetail } from "./list-item.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-list": FwList;
    "fw-list-item": FwListItem;
  }
}
