import { define } from "../core/element.js";
import { FwSkeleton } from "./skeleton.js";

define("fw-skeleton", FwSkeleton);

export { FwSkeleton, type SkeletonShape } from "./skeleton.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-skeleton": FwSkeleton;
  }
}
