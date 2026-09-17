import { computed } from "@formwright/reactive";
import type { Scope } from "@formwright/ui-core";
import { FwElement, type PropMap } from "../core/element.js";

export type PaginationItem = number | "ellipsis";

const styles = /* css */ `
:host { display: block; }
.list {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem;
  margin: 0; padding: 0; list-style: none;
}
.item { display: inline-flex; }
.button {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem;
  min-width: var(--_height); height: var(--_height); padding: 0 0.5rem;
  font: inherit; font-size: var(--_text-size); font-weight: 500; font-variant-numeric: tabular-nums; line-height: 1;
  color: var(--_text); background: transparent;
  border: 1px solid transparent; border-radius: var(--_radius); cursor: pointer; user-select: none;
  transition: background-color var(--_duration), border-color var(--_duration), color var(--_duration), box-shadow var(--_duration);
}
.button:hover { background: var(--_surface-2); }
.button:active:not(:disabled):not([aria-disabled="true"]) { background: color-mix(in srgb, var(--_text) 9%, var(--_surface)); }
.button:focus-visible { outline: none; box-shadow: var(--_ring); }
.button[aria-current="page"] { background: var(--_accent); color: var(--_accent-contrast); font-weight: 600; }
.button[aria-current="page"]:hover, .button[aria-current="page"]:active { background: var(--_accent-hover); }
.button[aria-disabled="true"], .button:disabled { opacity: 0.5; cursor: not-allowed; background: transparent; }
.button[aria-current="page"]:disabled { background: var(--_accent); }
.ellipsis {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: var(--_height); height: var(--_height); color: var(--_muted); user-select: none;
}
.status {
  display: inline-flex; align-items: center; height: var(--_height); padding: 0 0.5rem;
  font-size: var(--_text-size); font-variant-numeric: tabular-nums; color: var(--_text); white-space: nowrap;
}
.icon { display: block; flex: none; }
:host(:dir(rtl)) .icon { transform: scaleX(-1); }
`;

const PREV = `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;
const NEXT = `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;

/**
 * Which page numbers to show, with `"ellipsis"` for each gap.
 *
 * Always the first and last `boundaries` pages and `siblings` either side
 * of the current one. The number of items stays the same wherever the
 * current page is — near an end the window slides inwards instead of
 * shrinking — so the buttons do not jump about under the pointer. A gap
 * of exactly one page shows that page instead of an ellipsis.
 */
export function paginationRange(
  page: number,
  pages: number,
  siblings = 1,
  boundaries = 1,
): PaginationItem[] {
  const range = (from: number, to: number) => {
    const out: number[] = [];
    for (let n = from; n <= to; n++) out.push(n);
    return out;
  };
  const b = Math.max(0, boundaries);
  const s = Math.max(0, siblings);
  const startPages = range(1, Math.min(b, pages));
  const endPages = range(Math.max(pages - b + 1, b + 1), pages);
  const siblingsStart = Math.max(Math.min(page - s, pages - b - s * 2 - 1), b + 2);
  const siblingsEnd = Math.min(
    Math.max(page + s, b + s * 2 + 2),
    endPages.length > 0 ? endPages[0]! - 2 : pages - 1,
  );
  return [
    ...startPages,
    ...(siblingsStart > b + 2 ? (["ellipsis"] as const) : b + 1 < pages - b ? [b + 1] : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < pages - b - 1 ? (["ellipsis"] as const) : pages - b > b ? [pages - b] : []),
    ...endPages,
  ];
}

const whole = (value: unknown, fallback: number, min: number) => {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.max(min, n);
};

/**
 * `<fw-pagination>` — move through pages of results.
 *
 * ```html
 * <fw-pagination page="3" total-pages="20"></fw-pagination>
 * <fw-pagination page="1" total="482" page-size="25" siblings="2"></fw-pagination>
 * <fw-pagination page="4" total-pages="9" compact size="sm"></fw-pagination>
 * ```
 *
 * A `<nav>` landmark (named by `label`, default "Pagination") holding
 * Previous, the page numbers — the first and last `boundaries`, `siblings`
 * either side of the current page, and an ellipsis for each gap — and
 * Next. The current page is marked `aria-current="page"`. Previous and
 * Next are `aria-disabled` at the ends rather than `disabled`, so focus is
 * not thrown away when the last click reaches the end. `compact` shows
 * "Page X of Y" between Previous and Next instead of numbers.
 *
 * The page count comes from `total-pages`, or from `total` and
 * `page-size` (default 10) when that is not set.
 *
 * Events: `fw-page-change` with `detail: { page }`, then `change`, when
 * the user picks a page — both after `page` has updated.
 * Parts: `base` (the nav), `list`, `button`, `page`, `current`, `prev`,
 * `next`, `ellipsis`, `status`.
 */
export class FwPagination extends FwElement {
  static override props: PropMap = {
    page: { type: "number", reflect: true, default: 1 },
    totalPages: { type: "number" },
    total: { type: "number" },
    pageSize: { type: "number", default: 10 },
    siblings: { type: "number", default: 1 },
    boundaries: { type: "number", default: 1 },
    size: { type: "string", reflect: true, default: "md" },
    disabled: { type: "boolean", reflect: true },
    compact: { type: "boolean", reflect: true },
    label: { type: "string", default: "Pagination" },
  };
  static override styles = styles;

  declare page: number;
  declare totalPages: number | null;
  declare total: number | null;
  declare pageSize: number;
  declare siblings: number;
  declare boundaries: number;
  declare size: "sm" | "md" | "lg";
  declare disabled: boolean;
  declare compact: boolean;
  declare label: string;

  #nav!: HTMLElement;
  #list!: HTMLOListElement;
  #prev!: HTMLButtonElement;
  #next!: HTMLButtonElement;
  #status!: HTMLElement;
  #prevItem!: HTMLLIElement;
  #nextItem!: HTMLLIElement;
  #statusItem!: HTMLLIElement;

  readonly #pages = computed(() => {
    const explicit = this.prop<number | null>("totalPages").get();
    if (typeof explicit === "number" && Number.isFinite(explicit))
      return Math.max(1, Math.floor(explicit));
    const total = this.prop<number | null>("total").get();
    const size = whole(this.prop<number | null>("pageSize").get(), 10, 1);
    if (typeof total !== "number" || !Number.isFinite(total)) return 1;
    return Math.max(1, Math.ceil(total / size));
  });

  /** How many pages there are. */
  get pageCount(): number {
    return this.#pages.peek();
  }

  protected render(root: ShadowRoot): void {
    this.#nav = document.createElement("nav");
    this.#nav.setAttribute("part", "base");
    this.#list = document.createElement("ol");
    this.#list.className = "list";
    this.#list.setAttribute("part", "list");

    const control = (part: string, label: string, icon: string) => {
      const li = document.createElement("li");
      li.className = "item";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button";
      button.setAttribute("part", `button ${part}`);
      button.setAttribute("aria-label", label);
      button.innerHTML = icon;
      li.append(button);
      return [li, button] as const;
    };
    [this.#prevItem, this.#prev] = control("prev", "Previous page", PREV);
    [this.#nextItem, this.#next] = control("next", "Next page", NEXT);

    this.#statusItem = document.createElement("li");
    this.#statusItem.className = "item";
    this.#status = document.createElement("span");
    this.#status.className = "status";
    this.#status.setAttribute("part", "status");
    this.#status.setAttribute("aria-live", "polite");
    this.#statusItem.append(this.#status);

    this.#list.append(this.#prevItem, this.#statusItem, this.#nextItem);
    this.#nav.append(this.#list);
    root.append(this.#nav);
  }

  protected override connected(scope: Scope): void {
    scope.bind(() => {
      this.#nav.setAttribute("aria-label", this.prop<string | null>("label").get() || "Pagination");
    });

    // The numbered buttons between Previous and Next. Their number changes
    // with the page, so they are reconciled in place — reusing buttons
    // rather than rebuilding them, so a focused page button keeps focus.
    scope.bind(() => {
      const pages = this.#pages.get();
      const page = Math.min(pages, whole(this.prop<number>("page").get(), 1, 1));
      const siblings = whole(this.prop<number>("siblings").get(), 1, 0);
      const boundaries = whole(this.prop<number>("boundaries").get(), 1, 0);
      const compact = this.prop<boolean>("compact").get();
      const disabled = this.prop<boolean>("disabled").get();

      const active = this.root.activeElement as HTMLElement | null;
      const focusedPage = active?.dataset.page;

      const atStart = page <= 1;
      const atEnd = page >= pages;
      for (const [button, off] of [
        [this.#prev, atStart],
        [this.#next, atEnd],
      ] as const) {
        button.disabled = disabled;
        button.setAttribute("aria-disabled", String(disabled || off));
      }

      this.#statusItem.hidden = !compact;
      this.#status.textContent = compact ? `Page ${page} of ${pages}` : "";

      const wanted = compact ? [] : paginationRange(page, pages, siblings, boundaries);
      const existing = [...this.#list.querySelectorAll<HTMLLIElement>(":scope > li[data-kind]")];
      wanted.forEach((entry, i) => {
        const kind = entry === "ellipsis" ? "ellipsis" : "page";
        let li = existing[i];
        if (!li || li.dataset.kind !== kind) {
          const fresh = this.#item(kind);
          if (li) li.replaceWith(fresh);
          else this.#nextItem.before(fresh);
          li = fresh;
        }
        if (entry === "ellipsis") return;
        const button = li.firstElementChild as HTMLButtonElement;
        const current = entry === page;
        button.dataset.page = String(entry);
        button.textContent = String(entry);
        button.disabled = disabled;
        button.setAttribute("part", current ? "button page current" : "button page");
        button.setAttribute("aria-label", current ? `Page ${entry}` : `Go to page ${entry}`);
        if (current) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
      for (const extra of existing.slice(wanted.length)) extra.remove();

      if (focusedPage !== undefined && !compact) {
        const again = this.#list.querySelector<HTMLElement>(`[data-page="${focusedPage}"]`);
        if (again && again !== this.root.activeElement) again.focus();
      }
    });

    const onClick = (event: MouseEvent) => {
      const button = (event.composedPath()[0] as Element | undefined)?.closest?.("button");
      if (!button || !this.#list.contains(button)) return;
      if (
        this.prop<boolean>("disabled").peek() ||
        button.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }
      const page = whole(this.prop<number>("page").peek(), 1, 1);
      if (button === this.#prev) this.#go(page - 1);
      else if (button === this.#next) this.#go(page + 1);
      else if (button.dataset.page) this.#go(Number(button.dataset.page));
    };
    this.#list.addEventListener("click", onClick);
    scope.add(() => this.#list.removeEventListener("click", onClick));
  }

  #item(kind: "page" | "ellipsis"): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.kind = kind;
    if (kind === "ellipsis") {
      const span = document.createElement("span");
      span.className = "ellipsis";
      span.setAttribute("part", "ellipsis");
      span.setAttribute("aria-hidden", "true");
      span.textContent = "…";
      li.append(span);
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button";
      li.append(button);
    }
    return li;
  }

  /** Go to a page from a user action, telling listeners if it changed. */
  #go(target: number): void {
    const pages = this.#pages.peek();
    const page = Math.min(pages, Math.max(1, Math.floor(target)));
    if (page === this.prop<number>("page").peek()) return;
    this.page = page;
    this.emit("fw-page-change", { page });
    this.emit("change");
  }
}
