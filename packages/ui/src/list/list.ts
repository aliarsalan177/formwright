import { computed, signal } from "@formwright/reactive";
import { createCollection, type Collection, type Scope } from "@formwright/ui-core";
import type { PropMap } from "../core/element.js";
import { FwFormElement } from "../core/form-element.js";
import { ITEM_CONTAINERS, type FwListItem } from "./list-item.js";

export type ListSelection = "none" | "single" | "multiple";
export type ListVariant = "plain" | "outline" | "inset";

export interface ListSelectDetail {
  value: string;
  item: FwListItem;
}

const styles = /* css */ `
:host { display: block; }
.base { display: flex; flex-direction: column; gap: 0.125rem; }

:host([variant="outline"]) .base, :host([variant="inset"]) .base {
  background: var(--_surface);
  border: 1px solid var(--_border); border-radius: min(var(--_radius), 0.75rem);
}
:host([variant="inset"]) .base { padding: 0.25rem; }
:host([variant="outline"]) .base { gap: 0; overflow: hidden; }
:host([variant="outline"]) ::slotted(fw-list-item) {
  --_item-pad-inline: 0.75rem; --_item-pad-block: 0.5rem; border-radius: 0;
}

:host([dividers]) .base { gap: 0; }
:host([dividers]) ::slotted(fw-list-item) { border-radius: 0; }
:host([dividers]) ::slotted(fw-list-item:not(:last-child)),
:host([variant="outline"]) ::slotted(fw-list-item:not(:last-child)) {
  border-block-end: 1px solid var(--_border);
}

/* Focus sits on the rows: a ring, not only a tint, since a page list is
   reached with Tab rather than opened. */
::slotted(fw-list-item:focus-visible) {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--_accent) 45%, transparent);
}
.base.disabled { opacity: 0.6; }
.base.disabled ::slotted(fw-list-item) { cursor: not-allowed; pointer-events: none; }
`;

const EMPTY: readonly string[] = Object.freeze([]);

/** `["a","b"]`, `"a,b"`, a JSON array string, or nothing → a frozen, de-duplicated list. */
function toList(input: unknown): readonly string[] {
  let items: unknown[];
  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === "string") {
    const text = input.trim();
    if (text === "") return EMPTY;
    let parsed: unknown = null;
    if (text.startsWith("[")) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    items = Array.isArray(parsed) ? parsed : text.split(",");
  } else {
    return EMPTY;
  }
  const out: string[] = [];
  for (const item of items) {
    if (item === null || item === undefined) continue;
    const value = String(item).trim();
    if (value !== "" && !out.includes(value)) out.push(value);
  }
  return Object.freeze(out);
}

/** A single value may hold commas; only `multiple` splits. */
function toValues(raw: unknown, selection: string | null): readonly string[] {
  if (selection === "multiple") return toList(raw);
  const first = Array.isArray(raw) ? raw.find((v) => v !== null && v !== undefined) : raw;
  if (first === null || first === undefined || String(first) === "") return EMPTY;
  return Object.freeze([String(first)]);
}

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** Read from attributes until the item upgrades. */
const valueOf = (item: FwListItem): string =>
  typeof item.value === "string" ? item.value : (item.getAttribute("value") ?? "");
const textOf = (item: FwListItem): string =>
  typeof item.text === "string"
    ? item.text
    : (item.getAttribute("label") ?? item.textContent ?? "").trim();

/**
 * `<fw-list>` — a list of rows: static, navigational, actionable or
 * selectable, and a form control when it selects.
 *
 * ```html
 * <fw-list variant="outline" label="Trainers">
 *   <fw-list-item description="Head trainer">
 *     <fw-avatar slot="prefix" name="Sana Malik" size="sm"></fw-avatar>
 *     Sana Malik
 *     <fw-badge slot="suffix">12</fw-badge>
 *   </fw-list-item>
 *   <fw-list-item href="/trainers/usman">Usman Tariq</fw-list-item>
 *   <fw-list-item interactive value="invite">Invite a trainer</fw-list-item>
 * </fw-list>
 *
 * <fw-list selection="single" name="plan" value="standard" required>…</fw-list>
 * <fw-list selection="multiple" name="days" value="mon,wed">…</fw-list>
 * ```
 *
 * With `selection="none"` (the default) it is a `list` of `listitem`s;
 * only `href` and `interactive` rows take focus and can be pressed. With
 * `single` or `multiple` it is a `listbox` (multi-selectable for
 * `multiple`) of `option`s, every enabled row selectable, with a trailing
 * check. Other children — `<fw-divider>`, headings, `<li>` — are left
 * alone and skipped by the keyboard.
 *
 * Keyboard: one Tab stop (the selected row, else the first enabled one,
 * remembered as you move); ArrowUp/ArrowDown, Home and End move focus,
 * typing jumps to the next row starting with the letters; Enter or Space
 * selects (single) or toggles (multiple), and follows a row's link.
 *
 * `value` is a string, except with `selection="multiple"` where the
 * property is a frozen `string[]` and the attribute a comma-separated list.
 * The form submits the value under `name` — one entry per value for
 * `multiple` — is `valueMissing` while `required` and empty, resets to
 * the initial value, and is disabled by a disabled `<fieldset>`. Rows marked
 * `selected` in the markup give the initial value when there is no `value`.
 *
 * Events: `input` and `change` when the user changes the selection;
 * `fw-select` (`{ value, item }`) whenever a row is pressed, in any mode.
 * Slots: default (rows). Parts: `base`.
 */
export class FwList extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    selection: { type: "string", reflect: true, default: "none" },
    // Property-only: a string, or a string[] when selection is multiple.
    value: { type: "json", attribute: false, default: "" },
    label: { type: "string" },
    dividers: { type: "boolean", reflect: true },
    variant: { type: "string", reflect: true, default: "plain" },
    size: { type: "string", reflect: true },
  };
  static override styles = styles;

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, "value"];
  }

  declare selection: ListSelection;
  declare label: string | null;
  declare dividers: boolean;
  declare variant: ListVariant;
  declare size: "sm" | "md" | "lg" | null;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #base!: HTMLElement;
  #defaultValue: unknown = "";
  #collection: Collection | null = null;
  #labelled = false;
  #sized = new WeakSet<FwListItem>();
  readonly #itemsVersion = signal(0);
  readonly #values = computed(() => toValues(this.prop<unknown>("value").get(), this.#selection()));

  /** The selected value: a string, or a frozen `string[]` with `selection="multiple"`. */
  get value(): string | readonly string[] {
    const values = this.#values.get();
    return this.#selection() === "multiple" ? values : (values[0] ?? "");
  }

  set value(next: string | readonly string[] | null) {
    this.prop<unknown>("value").set(next ?? "");
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === "value") this.value = value;
    else super.attributeChangedCallback(name, old, value);
  }

  /** This list's rows, in document order — not those of a list or popup nested in it. */
  get items(): FwListItem[] {
    return [...this.querySelectorAll<FwListItem>("fw-list-item")].filter(
      (item) => item.parentElement?.closest(ITEM_CONTAINERS) === this,
    );
  }

  /** The selected rows, in document order. */
  get selectedItems(): FwListItem[] {
    if (this.#selection() === "none") return [];
    const values = this.#values.peek();
    return this.items.filter((item) => values.includes(valueOf(item)));
  }

  #selection(): ListSelection {
    const selection = this.prop<string | null>("selection").get();
    return selection === "single" || selection === "multiple" ? selection : "none";
  }

  /** Rows that take focus: every enabled one when selecting, else only links and actions. */
  #focusable(item: FwListItem): boolean {
    if (this.#selection() !== "none") return true;
    return item.hasAttribute("interactive") || item.hasAttribute("href");
  }

  #focusables(): FwListItem[] {
    return this.items.filter((item) => this.#focusable(item));
  }

  protected render(root: ShadowRoot): void {
    this.#base = document.createElement("div");
    this.#base.className = "base";
    this.#base.setAttribute("part", "base");
    this.#base.append(document.createElement("slot"));
    root.append(this.#base);

    if (this.hasAttribute("value")) {
      this.#defaultValue = this.getAttribute("value");
    } else {
      // Rows marked selected in the markup stand in for a missing value.
      const preset = this.items
        .filter((item) => item.hasAttribute("selected"))
        .map((item) => item.getAttribute("value") ?? "");
      if (preset.length > 0) {
        this.#defaultValue = preset;
        this.prop<unknown>("value").set(preset);
      }
    }
  }

  protected override connected(scope: Scope): void {
    this.#collection = createCollection({
      items: () => this.#focusables(),
      textOf: (item) => textOf(item as FwListItem),
      isDisabled: (item) => item.hasAttribute("disabled"),
      onActiveChange: (item) => {
        if (!item) return;
        this.#rove(item as FwListItem);
        if (document.activeElement !== item) item.focus();
      },
    });
    scope.add(() => {
      this.#collection?.dispose();
      this.#collection = null;
    });

    const bump = () => this.#itemsVersion.set(this.#itemsVersion.peek() + 1);
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(bump);
      observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["value", "disabled", "href", "interactive"],
      });
      scope.add(() => observer.disconnect());
    }

    // Selection mode → the list's role and each row's.
    scope.bind(() => {
      this.#itemsVersion.get();
      const selection = this.#selection();
      this.setAttribute("role", selection === "none" ? "list" : "listbox");
      if (selection === "multiple") this.setAttribute("aria-multiselectable", "true");
      else this.removeAttribute("aria-multiselectable");
      for (const item of this.items) {
        item.toggleAttribute("data-selectable", selection !== "none");
        // Upgraded rows re-read their role; the rest read it when they connect.
        if (typeof item._syncContext === "function") item._syncContext();
      }
    });

    // Value → which rows are selected, the Tab stop, and the form.
    scope.bind(() => {
      this.#itemsVersion.get();
      const selection = this.#selection();
      const values = this.#values.get();
      const disabled = this.isDisabled.get();
      const items = this.items;
      for (const item of items) {
        const on = selection !== "none" && values.includes(valueOf(item));
        // Attributes, so it holds for rows not upgraded yet.
        if (item.hasAttribute("selected") !== on) item.toggleAttribute("selected", on);
      }
      const focusables = items.filter((item) => this.#focusable(item));
      const enabled = focusables.filter((item) => !item.hasAttribute("disabled"));
      const found = this.#collection?.active() as FwListItem | null | undefined;
      const active = found && enabled.includes(found) ? found : null;
      const firstSelected = enabled.find((item) => item.hasAttribute("selected")) ?? null;
      // The remembered row keeps the stop, unless the selection moved elsewhere.
      const stop =
        (active?.hasAttribute("selected") ? active : null) ??
        firstSelected ??
        active ??
        enabled[0] ??
        null;
      for (const item of items) {
        if (!focusables.includes(item)) {
          if (item.hasAttribute("tabindex")) item.removeAttribute("tabindex");
        } else {
          item.tabIndex = !disabled && item === stop ? 0 : -1;
        }
      }
      this.#syncFormState(values);
    });

    scope.bind(() => {
      this.#itemsVersion.get();
      const size = this.prop<string | null>("size").get();
      for (const item of this.items) {
        // An item's own size wins; the list only sizes rows it sized before.
        if (item.hasAttribute("size") && !this.#sized.has(item)) continue;
        if (size) {
          item.setAttribute("size", size);
          this.#sized.add(item);
        } else if (this.#sized.has(item)) {
          item.removeAttribute("size");
          this.#sized.delete(item);
        }
      }
    });

    scope.bind(() => {
      this.prop<string | null>("name").get();
      this.prop<boolean>("required").get();
      this.#syncFormState(this.#values.get());
    });

    scope.bind(() => {
      const disabled = this.isDisabled.get();
      this.#base.classList.toggle("disabled", disabled);
      if (disabled) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
      const required = this.prop<boolean>("required").get() && this.#selection() !== "none";
      if (required) this.setAttribute("aria-required", "true");
      else this.removeAttribute("aria-required");
    });

    scope.bind(() => {
      const label = this.prop<string | null>("label").get();
      if (label) {
        this.setAttribute("aria-label", label);
        this.#labelled = true;
      } else if (this.#labelled) {
        this.removeAttribute("aria-label");
        this.#labelled = false;
      }
    });

    const itemFrom = (event: Event): FwListItem | null => {
      const item = (event.target as Element | null)?.closest?.("fw-list-item") as FwListItem | null;
      if (!item || item.parentElement?.closest(ITEM_CONTAINERS) !== this) return null;
      return this.#focusable(item) ? item : null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const item = itemFrom(event);
      if (!item || this.isDisabled.get()) return;
      const collection = this.#collection!;
      if (event.key === "Enter" || event.key === " ") {
        // A link row with no selection is followed with Enter only, as a link is.
        if (event.key === " " && this.#selection() === "none" && item.hasAttribute("href")) return;
        event.preventDefault();
        this.#activate(item);
        return;
      }
      collection.setActive(item);
      if (collection.handleKey(event)) event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      const item = itemFrom(event);
      if (!item) return;
      if (this.isDisabled.get() || item.hasAttribute("disabled")) {
        event.preventDefault();
        return;
      }
      this.#collection?.setActive(item);
      this.#activate(item);
    };

    const onFocusIn = (event: FocusEvent) => {
      const item = itemFrom(event);
      if (item && !item.hasAttribute("disabled")) this.#collection?.setActive(item);
    };

    this.addEventListener("keydown", onKeyDown);
    this.addEventListener("click", onClick);
    this.addEventListener("focusin", onFocusIn);
    scope.add(() => {
      this.removeEventListener("keydown", onKeyDown);
      this.removeEventListener("click", onClick);
      this.removeEventListener("focusin", onFocusIn);
    });
  }

  /** Make `item` the list's one Tab stop. */
  #rove(item: FwListItem): void {
    const disabled = this.isDisabled.peek();
    for (const each of this.#focusables()) each.tabIndex = !disabled && each === item ? 0 : -1;
  }

  #activate(item: FwListItem): void {
    if (item.hasAttribute("disabled") || this.isDisabled.peek()) return;
    const value = valueOf(item);
    const selection = this.#selection();
    const current = this.#values.peek();
    if (selection === "single") {
      this.#commit(value === "" ? current : Object.freeze([value]));
    } else if (selection === "multiple" && value !== "") {
      this.#commit(
        current.includes(value)
          ? Object.freeze(current.filter((v) => v !== value))
          : Object.freeze([...current, value]),
      );
    }
    this.emit<ListSelectDetail>("fw-select", { value, item });
  }

  #commit(next: readonly string[]): void {
    if (same(next, this.#values.peek())) return;
    this.prop<unknown>("value").set(this.#selection() === "multiple" ? next : (next[0] ?? ""));
    this.emit("input");
    this.emit("change");
  }

  #syncFormState(values: readonly string[]): void {
    const selection = this.#selection();
    const name = this.prop<string | null>("name").peek();
    if (selection === "none" || values.length === 0) {
      this.setFormValue(null);
    } else if (selection === "single") {
      this.setFormValue(values[0]!);
    } else if (name && typeof FormData !== "undefined") {
      const data = new FormData();
      for (const value of values) data.append(name, value);
      this.setFormValue(data);
    } else {
      this.setFormValue(null);
    }
    const anchor = this.items.find((item) => item.tabIndex === 0) ?? this.items[0];
    if (this.prop<boolean>("required").peek() && selection !== "none" && values.length === 0) {
      this.setValidity({ valueMissing: true }, "Please select an item.", anchor);
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.prop<unknown>("value").set(this.#defaultValue);
  }

  protected override restoreValue(state: string): void {
    this.value = state;
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof FormData !== "undefined" && state instanceof FormData) {
      const name = this.prop<string | null>("name").peek();
      this.value = name ? state.getAll(name).map(String) : EMPTY;
      return;
    }
    super.formStateRestoreCallback(state);
  }

  /** Focus the list's Tab stop. */
  override focus(options?: FocusOptions): void {
    const focusables = this.#focusables();
    const target =
      focusables.find((item) => item.tabIndex === 0) ??
      focusables.find((item) => !item.hasAttribute("disabled"));
    target?.focus(options);
  }
}
