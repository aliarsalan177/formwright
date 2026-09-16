import { define } from "../core/element.js";
import { FwTagsInput } from "./tags-input.js";

define("fw-tags-input", FwTagsInput);

export { FwTagsInput, type TagEventDetail } from "./tags-input.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-tags-input": FwTagsInput;
  }
}
