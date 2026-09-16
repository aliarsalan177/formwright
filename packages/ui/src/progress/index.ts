import { define } from "../core/element.js";
import { FwProgress } from "./progress.js";

define("fw-progress", FwProgress);

export {
  FwProgress,
  type ProgressSize,
  type ProgressTone,
  type ProgressVariant,
} from "./progress.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-progress": FwProgress;
  }
}
