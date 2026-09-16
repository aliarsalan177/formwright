import { define } from "../core/element.js";
import { FwTag } from "./tag.js";

define("fw-tag", FwTag);

export { FwTag, type TagSize, type TagTone } from "./tag.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-tag": FwTag;
  }
}
