import { define } from "../core/element.js";
import { FwPagination } from "./pagination.js";

define("fw-pagination", FwPagination);

export { FwPagination, paginationRange, type PaginationItem } from "./pagination.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-pagination": FwPagination;
  }
}
