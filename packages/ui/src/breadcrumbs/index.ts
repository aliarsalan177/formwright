import { define } from "../core/element.js";
import { FwBreadcrumbItem } from "./breadcrumb-item.js";
import { FwBreadcrumbs } from "./breadcrumbs.js";

define("fw-breadcrumb-item", FwBreadcrumbItem);
define("fw-breadcrumbs", FwBreadcrumbs);

export { FwBreadcrumbItem } from "./breadcrumb-item.js";
export { FwBreadcrumbs } from "./breadcrumbs.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-breadcrumbs": FwBreadcrumbs;
    "fw-breadcrumb-item": FwBreadcrumbItem;
  }
}
