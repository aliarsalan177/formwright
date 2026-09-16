import { define } from "../core/element.js";
import { FwOtpInput } from "./otp-input.js";

define("fw-otp-input", FwOtpInput);

export { FwOtpInput, type OtpType } from "./otp-input.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-otp-input": FwOtpInput;
  }
}
