import { define } from "../core/element.js";
import { FwCard } from "./card.js";

define("fw-card", FwCard);

export { FwCard, type CardPadding, type CardVariant } from "./card.js";

declare global {
  interface HTMLElementTagNameMap {
    "fw-card": FwCard;
  }
}
