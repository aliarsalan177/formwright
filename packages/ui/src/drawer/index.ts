import { define } from "../core/element.js";
import { FwDrawer } from "./drawer.js";

define("fw-drawer", FwDrawer);

export {
  FwDrawer,
  type CloseSource,
  type DrawerPlacement,
  type RequestCloseDetail,
} from "./drawer.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-drawer": FwDrawer;
  }
}
