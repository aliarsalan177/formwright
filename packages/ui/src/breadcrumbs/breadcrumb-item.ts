import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

const styles = /* css */ `
:host { display: inline-flex; align-items: center; min-width: 0; font-size: var(--_text-size); }
.label {
  display: inline-flex; align-items: center; gap: 0.375rem; min-width: 0;
  padding: 0.125rem 0.25rem; border-radius: var(--_radius-sm);
  color: var(--_muted); text-decoration: none; white-space: nowrap;
  transition: color var(--_duration), box-shadow var(--_duration);
}
a.label:hover { color: var(--_text); text-decoration: underline; }
a.label:focus-visible, .ellipsis:focus-visible { outline: none; box-shadow: var(--_ring); }
:host([current]) .label { color: var(--_text); font-weight: 500; }

.ellipsis {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 1.75rem; height: 1.5rem; padding: 0 0.25rem;
  font: inherit; line-height: 1; color: var(--_muted);
  background: transparent; border: 0; border-radius: var(--_radius-sm); cursor: pointer;
}
.ellipsis:hover { background: var(--_surface-2); color: var(--_text); }
:host([collapsed]) .label { display: none; }

.separator { display: inline-flex; align-items: center; margin-inline: 0.25rem; color: var(--_muted); }
.separator svg { display: block; }
:host(:dir(rtl)) .separator svg { transform: scaleX(-1); }
:host(:last-of-type) .separator { display: none; }
::slotted([slot="prefix"]), ::slotted([slot="suffix"]) { display: inline-flex; flex: none; }
`;

const CHEVRON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

/**
 * `<fw-breadcrumb-item>` — one step in an `<fw-breadcrumbs>` trail.
 *
 * ```html
 * <fw-breadcrumb-item href="/members">Members</fw-breadcrumb-item>
 * <fw-breadcrumb-item current>Ali Arsalan</fw-breadcrumb-item>
 * ```
 *
 * A real link when it has an `href`; plain text marked
 * `aria-current="page"` when it is `current`. The separator after it is
 * decorative (`aria-hidden`), a chevron that mirrors in right-to-left text
 * unless the breadcrumbs supply their own, and is not drawn after the
 * last item.
 *
 * `collapsed` is set by `<fw-breadcrumbs>` when it hides the middle of a
 * long trail: the item then shows an ellipsis button that reveals it.
 *
 * Events: `fw-breadcrumb-expand` (bubbles, not composed) when its
 * ellipsis is pressed; `<fw-breadcrumbs>` handles it.
 * Slots: default (label), `prefix`, `suffix`, `separator`.
 * Parts: `label` (the link, or the text when current), `ellipsis`, `separator`.
 */
export class FwBreadcrumbItem extends FwElement {
  static override props: PropMap = {
    href: { type: "string" },
    current: { type: "boolean", reflect: true },
    /** Set by `<fw-breadcrumbs>`. */
    collapsed: { type: "boolean", reflect: true },
  };
  static override styles = styles;

  declare href: string | null;
  declare current: boolean;
  declare collapsed: boolean;

  #label!: HTMLAnchorElement | HTMLSpanElement;
  #ellipsis!: HTMLButtonElement;

  protected render(root: ShadowRoot): void {
    const label = document.createElement("span");
    label.className = "label";
    label.setAttribute("part", "label");
    const prefix = document.createElement("slot");
    prefix.name = "prefix";
    const suffix = document.createElement("slot");
    suffix.name = "suffix";
    label.append(prefix, document.createElement("slot"), suffix);
    this.#label = label;

    const ellipsis = document.createElement("button");
    ellipsis.type = "button";
    ellipsis.className = "ellipsis";
    ellipsis.setAttribute("part", "ellipsis");
    ellipsis.setAttribute("aria-label", "Show all breadcrumbs");
    ellipsis.textContent = "…";
    ellipsis.hidden = true;
    this.#ellipsis = ellipsis;

    const separator = document.createElement("span");
    separator.className = "separator";
    separator.setAttribute("part", "separator");
    separator.setAttribute("aria-hidden", "true");
    const separatorSlot = document.createElement("slot");
    separatorSlot.name = "separator";
    separatorSlot.innerHTML = CHEVRON;
    separator.append(separatorSlot);

    root.append(label, ellipsis, separator);
  }

  protected override connected(scope: Scope): void {
    this.setAttribute("role", "listitem");

    // A link when there is an href and it is not the current page, text
    // otherwise — swapped in place, carrying the slots across.
    scope.bind(() => {
      const href = this.prop<string | null>("href").get();
      const current = this.prop<boolean>("current").get();
      const wantLink = Boolean(href) && !current;
      if (wantLink !== this.#label instanceof HTMLAnchorElement) {
        const next = document.createElement(wantLink ? "a" : "span");
        next.className = "label";
        next.setAttribute("part", "label");
        next.append(...this.#label.childNodes);
        this.#label.replaceWith(next);
        this.#label = next;
      }
      const label = this.#label;
      if (label instanceof HTMLAnchorElement && href) label.href = href;
      if (current) label.setAttribute("aria-current", "page");
      else label.removeAttribute("aria-current");
    });

    scope.bind(() => {
      this.#ellipsis.hidden = !this.prop<boolean>("collapsed").get();
    });

    const onExpand = () => {
      this.dispatchEvent(new Event("fw-breadcrumb-expand", { bubbles: true }));
    };
    this.#ellipsis.addEventListener("click", onExpand);
    scope.add(() => this.#ellipsis.removeEventListener("click", onExpand));
  }

  /** Move focus to the link, or the ellipsis button while collapsed. */
  override focus(options?: FocusOptions): void {
    if (this.prop<boolean>("collapsed").peek()) this.#ellipsis?.focus(options);
    else this.#label?.focus(options);
  }
}
