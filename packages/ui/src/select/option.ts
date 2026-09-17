import type { Scope } from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { FwItemBase, itemStyles } from "../core/item.js";

/**
 * `<fw-option>` — one choice inside `<fw-select>`, `<fw-combobox>` or
 * `<fw-multi-select>`.
 *
 * ```html
 * <fw-option value="MALE">Male</fw-option>
 * <fw-option value="FEMALE" disabled>Female</fw-option>
 * <fw-option value="pk" label="Pakistan"><img slot="prefix" …> Pakistan</fw-option>
 * <fw-option value="sana" description="Head trainer">Sana Malik</fw-option>
 * ```
 *
 * Its content can be anything; `label` sets the plain text shown in the
 * closed select and used for type-to-find when the content is richer.
 * Without it, the text of the default slot is used — prefix, suffix and
 * description excluded.
 *
 * It is the shared item row (see `FwItemBase`), so it renders exactly like
 * `<fw-menu-item>` and `<fw-list-item>`; a `<fw-list-item>` can stand in
 * for it anywhere. The container marks it `data-selectable`, which gives
 * it the trailing check.
 *
 * Slots: default, `prefix`, `description`, `suffix`.
 * Parts: `check`, `label`, `description`, `suffix`, `chevron`.
 */
export class FwOption extends FwItemBase {
  static override props: PropMap = { ...FwItemBase.props };
  static override styles = itemStyles;

  protected override connected(scope: Scope): void {
    super.connected(scope);
    // Options live in the page, not the select's shadow root, so their own
    // role and state are what assistive technology reads.
    if (!this.hasAttribute("role")) this.setAttribute("role", "option");
    if (!this.id) this.id = nextId("fw-option");
    if (!this.hasAttribute("tabindex")) this.tabIndex = -1;

    scope.bind(() => {
      this.setAttribute("aria-selected", String(this.prop<boolean>("selected").get()));
    });
  }
}
