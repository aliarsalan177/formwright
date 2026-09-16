import { signal } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";
import { slotHasContent } from "../core/field.js";

export type EmptyStateSize = "sm" | "md";

const styles = /* css */ `
:host { display: block; }

.base {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.75rem; padding-block: 3rem; padding-inline: 1.5rem;
  text-align: center;
}
:host([size="sm"]) .base { gap: 0.5rem; padding-block: 1.5rem; padding-inline: 1rem; }

.icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 3rem; height: 3rem; border-radius: 50%;
  background: var(--_surface-2); color: var(--_muted);
  font-size: 1.5rem;
}
:host([size="sm"]) .icon { width: 2.25rem; height: 2.25rem; font-size: 1.125rem; }

.heading { margin: 0; font-size: 1rem; font-weight: 600; line-height: 1.4; color: var(--_text); }
:host([size="sm"]) .heading { font-size: 0.875rem; }

.description {
  max-inline-size: 28rem; font-size: var(--_text-size); line-height: 1.5; color: var(--_muted);
}
:host([size="sm"]) .description { font-size: 0.8125rem; }
.heading:not([hidden]) + .description { margin-block-start: -0.25rem; }

.actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.5rem; margin-block-start: 0.25rem; }

::slotted([slot="heading"]) { margin: 0; font: inherit; color: inherit; }
`;

/**
 * `<fw-empty-state>` — what to show where a list or page has nothing yet.
 *
 * ```html
 * <fw-empty-state heading="No members yet">
 *   <svg slot="icon" …></svg>
 *   Members you register will appear here.
 *   <fw-button slot="actions">Register member</fw-button>
 * </fw-empty-state>
 *
 * <fw-empty-state size="sm">
 *   <h3 slot="heading">No results</h3>
 *   Try a different search.
 * </fw-empty-state>
 * ```
 *
 * The `heading` attribute is plain text with no heading level; slot a real
 * `<h2>`–`<h6>` into `heading` when it belongs in the page outline. Each
 * area collapses when it has no content.
 *
 * Slots: `icon`, `heading`, default (description), `actions`.
 * Parts: `base`, `icon`, `heading`, `description`, `actions`.
 */
export class FwEmptyState extends FwElement {
  static override props: PropMap = {
    heading: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
  };
  static override styles = styles;

  declare heading: string | null;
  declare size: EmptyStateSize;

  #icon!: HTMLDivElement;
  #heading!: HTMLDivElement;
  #headingText!: HTMLSpanElement;
  #description!: HTMLDivElement;
  #descriptionSlot!: HTMLSlotElement;
  #actions!: HTMLDivElement;
  readonly #slots = signal(0);

  protected render(root: ShadowRoot): void {
    const area = (name: string, slotName: string | null) => {
      const el = document.createElement("div");
      el.className = name;
      el.setAttribute("part", name);
      const slot = document.createElement("slot");
      if (slotName) slot.name = slotName;
      el.append(slot);
      return [el, slot] as const;
    };

    const base = document.createElement("div");
    base.className = "base";
    base.setAttribute("part", "base");

    const [icon] = area("icon", "icon");
    icon.setAttribute("aria-hidden", "true");
    const [heading, headingSlot] = area("heading", "heading");
    this.#headingText = document.createElement("span");
    headingSlot.append(this.#headingText);
    const [description, descriptionSlot] = area("description", null);
    const [actions] = area("actions", "actions");

    this.#icon = icon;
    this.#heading = heading;
    this.#description = description;
    this.#descriptionSlot = descriptionSlot;
    this.#actions = actions;

    base.append(icon, heading, description, actions);
    root.append(base);
  }

  protected override connected(scope: Scope): void {
    scope.bind(() => {
      this.#slots.get();
      const heading = this.prop<string | null>("heading").get();
      this.#headingText.textContent = heading ?? "";
      this.#heading.hidden = !heading && !slotHasContent(this.root, "heading");
      this.#icon.hidden = !slotHasContent(this.root, "icon");
      this.#actions.hidden = !slotHasContent(this.root, "actions");
      this.#description.hidden = !this.#descriptionSlot
        .assignedNodes()
        .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? "").trim() !== "");
    });

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);
    this.root.addEventListener("slotchange", onSlotChange);
    scope.add(() => this.root.removeEventListener("slotchange", onSlotChange));
  }
}
