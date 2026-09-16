import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host { display: block; }
:host([data-filtered]) { display: none !important; }
.heading {
  padding: 0.5rem 0.75rem 0.25rem; font-size: 0.75rem; font-weight: 500;
  color: var(--_muted); user-select: none;
}
/* Flex, so the palette can rank matches with \`order\` without moving nodes. */
.items { display: flex; flex-direction: column; }
`;

/**
 * `<fw-command-group>` — a headed section of commands in `<fw-command-palette>`.
 *
 * ```html
 * <fw-command-group heading="Navigation">
 *   <fw-command value="home">Go to dashboard</fw-command>
 *   <fw-command value="members">Go to members</fw-command>
 * </fw-command-group>
 * ```
 *
 * Hidden while a search leaves none of its commands visible. Commands must
 * be its direct children.
 *
 * Slots: default (commands). Parts: `heading`, `items`.
 */
export class FwCommandGroup extends FwElement {
  static override props: PropMap = {
    heading: { type: "string" },
  };
  static override styles = styles;

  declare heading: string | null;

  #heading!: HTMLElement;

  /** The commands in this group, in document order. */
  get commands(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(":scope > fw-command")];
  }

  protected render(root: ShadowRoot): void {
    this.#heading = document.createElement("div");
    this.#heading.className = "heading";
    this.#heading.setAttribute("part", "heading");
    // The group is named with aria-label below; reading the heading as
    // well would say it twice.
    this.#heading.setAttribute("aria-hidden", "true");

    const items = document.createElement("div");
    items.className = "items";
    items.setAttribute("part", "items");
    items.append(document.createElement("slot"));

    root.append(this.#heading, items);
  }

  protected override connected(scope: Scope): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    scope.bind(() => {
      const heading = this.prop<string | null>("heading").get();
      this.#heading.textContent = heading ?? "";
      this.#heading.hidden = !heading;
      if (heading) this.setAttribute("aria-label", heading);
      else this.removeAttribute("aria-label");
    });
  }
}
