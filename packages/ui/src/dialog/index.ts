import { define } from "../core/element.js";
import { FwDialog } from "./dialog.js";

define("fw-dialog", FwDialog);

export { FwDialog, type CloseSource, type DialogSize, type RequestCloseDetail } from "./dialog.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-dialog": FwDialog;
  }
}
