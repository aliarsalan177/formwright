import { define } from "../core/element.js";
import { FwToast } from "./toast.js";
import { FwToastRegion } from "./toast-region.js";

define("fw-toast", FwToast);
define("fw-toast-region", FwToastRegion);

export {
  FwToast,
  type ToastDismissDetail,
  type ToastDismissReason,
  type ToastTone,
} from "./toast.js";
export { FwToastRegion, type ToastPlacement } from "./toast-region.js";
export { showToast, type ShowToastOptions, type ToastHandle } from "./show-toast.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-toast": FwToast;
    "fw-toast-region": FwToastRegion;
  }
}
