import { define } from "../core/element.js";
import { FwStep } from "./step.js";
import { FwStepper } from "./stepper.js";

define("fw-step", FwStep);
define("fw-stepper", FwStepper);

export { FwStep, type StepState, type StepStatus } from "./step.js";
export { FwStepper } from "./stepper.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-stepper": FwStepper;
    "fw-step": FwStep;
  }
}
