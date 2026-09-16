import { define } from "../core/element.js";
import { FwBadge } from "./badge.js";

define("fw-badge", FwBadge);

export { FwBadge, type BadgeSize, type BadgeTone, type BadgeVariant } from "./badge.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-badge": FwBadge;
  }
}
