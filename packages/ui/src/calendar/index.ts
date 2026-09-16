import { define } from "../core/element.js";
import { FwCalendar } from "./calendar.js";

define("fw-calendar", FwCalendar);

export { FwCalendar, type CalendarMode, type CalendarSelectDetail } from "./calendar.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-calendar": FwCalendar;
  }
}
