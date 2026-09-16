import { FwCalendar } from "../calendar/calendar.js";
import { define } from "../core/element.js";
import { FwDatePicker } from "./date-picker.js";

// The popup's calendar; define() is idempotent, so importing the calendar
// entry as well is harmless.
define("fw-calendar", FwCalendar);
define("fw-date-picker", FwDatePicker);

export { FwDatePicker } from "./date-picker.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-date-picker": FwDatePicker;
  }
}
