import { define } from "../core/element.js";
import { FwEmptyState } from "./empty-state.js";

define("fw-empty-state", FwEmptyState);

export { FwEmptyState, type EmptyStateSize } from "./empty-state.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-empty-state": FwEmptyState;
  }
}
