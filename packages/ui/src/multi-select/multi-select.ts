import { signal } from "@formwright/reactive";
import {
  anchorTo,
  createCollection,
  type Anchored,
  type Collection,
  type Placement,
  type Scope,
} from "@formwright/ui-core";
import { nextId, type PropMap } from "../core/element.js";
import { buildField, fieldStyles, slotHasContent, type FieldParts } from "../core/field.js";
import { FwFormElement } from "../core/form-element.js";
import { srOnly } from "../core/styles.js";
import type { FwOption } from "../select/option.js";

const styles =
  fieldStyles +
  srOnly +
  /* css */ `
.control { flex-wrap: wrap; cursor: pointer; padding-block: 0.25rem; row-gap: 0.25rem; }
:host([disabled]) .control { cursor: not-allowed; }
/* Not display: contents, which drops the list role in some browsers. */
.tags { display: flex; flex-wrap: wrap; gap: 0.25rem; min-width: 0; max-width: 100%; }
.tag {
  display: inline-flex; align-items: center; gap: 0.125rem; max-width: 100%;
  padding: 0.125rem 0.125rem 0.125rem 0.5rem; border-radius: var(--_radius-sm);
  background: var(--_surface-2); font-size: calc(var(--_text-size) - 0.0625rem); line-height: 1.25rem;
}
.tag-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag-remove {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 1.25rem; height: 1.25rem; padding: 0; border: 0; border-radius: var(--_radius-sm);
  background: transparent; color: var(--_muted); cursor: pointer;
}
.tag-remove:hover { color: var(--_text); background: color-mix(in srgb, var(--_muted) 20%, transparent); }
.trigger {
  flex: 1; min-width: 3rem; outline: none; user-select: none;
  font-size: var(--_text-size); line-height: calc(var(--_height) - 0.5rem - 2px);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.trigger.placeholder { color: var(--_muted); }
.chevron { flex: none; color: var(--_muted); display: inline-flex; transition: transform var(--_duration); }
:host([open]) .chevron { transform: rotate(180deg); }

.popup {
  margin: 0; inset: auto; padding: 0.25rem;
  min-width: 10rem;
  max-height: min(20rem, var(--fw-available-height, 20rem));
  display: flex; flex-direction: column;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border); border-radius: var(--_radius);
  box-shadow: var(--_shadow);
}
/* Author display beats the UA rule that hides a closed popover. Separate
   rules, so a browser without :popover-open keeps the [hidden] one. */
.popup[popover]:not(:popover-open) { display: none; }
.search {
  flex: none; width: 100%; margin-bottom: 0.25rem; padding: 0.375rem 0.5rem;
  font: inherit; font-size: var(--_text-size); color: inherit;
  background: var(--_surface); border: 1px solid var(--_border); border-radius: var(--_radius-sm);
  outline: none;
}
.search:focus { border-color: var(--_accent); }
.listbox { overflow: auto; overscroll-behavior: contain; min-height: 0; outline: none; }
.empty { padding: 0.5rem 0.625rem; font-size: var(--_text-size); color: var(--_muted); }
`;

const CHEVRON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const CLEAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const REMOVE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;
const canReflectActive = () =>
  typeof Element !== "undefined" && "ariaActiveDescendantElement" in Element.prototype;

const EMPTY: readonly string[] = Object.freeze([]);

/** An option's value and text, read from attributes until it is upgraded. */
const valueOf = (o: FwOption): string =>
  typeof o.value === "string" ? o.value : (o.getAttribute("value") ?? "");
const textOf = (o: FwOption): string =>
  typeof o.text === "string" ? o.text : (o.getAttribute("label") ?? o.textContent ?? "").trim();

/** `["a","b"]`, `"a,b"`, a JSON array string, or nothing → a frozen, de-duplicated list. */
function toList(input: unknown): readonly string[] {
  let items: unknown[];
  if (Array.isArray(input)) {
    items = input;
  } else if (typeof input === "string") {
    const text = input.trim();
    if (text === "") return EMPTY;
    if (text.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(text);
        items = Array.isArray(parsed) ? parsed : [text];
      } catch {
        items = text.split(",");
      }
    } else {
      items = text.split(",");
    }
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

/**
 * `<fw-multi-select>` — pick any number of options from a list.
 *
 * ```html
 * <fw-multi-select label="Days" name="days" value="mon,wed" placeholder="Choose days" clearable>
 *   <fw-option value="mon">Monday</fw-option>
 *   <fw-option value="tue">Tuesday</fw-option>
 *   <fw-option value="wed">Wednesday</fw-option>
 * </fw-multi-select>
 *
 * <fw-multi-select label="Trainers" searchable max="3" required>…</fw-multi-select>
 * ```
 *
 * `value` is a `string[]` property; the attribute takes a comma-separated
 * list (or a JSON array). The form submits one `name` entry per value, like
 * a native `<select multiple>`. The value array is frozen: assign a new
 * array rather than mutating it.
 *
 * The chosen values show as removable chips; Backspace on the field removes
 * the last. The list stays open while choosing. With `max`, options beyond
 * the limit are disabled until one is removed. With `searchable`, a filter
 * box at the top keeps focus while the arrows move through the options —
 * the active option is exposed with `ariaActiveDescendantElement` and a
 * `data-active` highlight. Without it, focus moves onto the options, as in
 * `<fw-select>`.
 *
 * Events: `input` and `change` whenever the selection changes, `fw-show`, `fw-hide`.
 * Slots: default (options), `label`, `help`, `prefix`, `empty`.
 * Parts: `field`, `label`, `control`, `tags`, `tag`, `tag-remove`, `trigger`,
 * `clear`, `chevron`, `popup`, `search`, `listbox`, `help`, `error`.
 */
export class FwMultiSelect extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    // Property-only: the attribute is a comma-separated list, parsed below.
    value: { type: "json", attribute: false, default: EMPTY },
    placeholder: { type: "string" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
    clearable: { type: "boolean" },
    searchable: { type: "boolean" },
    max: { type: "number" },
    placement: { type: "string", default: "bottom-start" },
    open: { type: "boolean", reflect: true },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, "value"];
  }

  declare placeholder: string | null;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare size: "sm" | "md" | "lg";
  declare clearable: boolean;
  declare searchable: boolean;
  declare max: number | null;
  declare placement: Placement;
  declare open: boolean;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #tags!: HTMLElement;
  #trigger!: HTMLElement;
  #clear!: HTMLButtonElement;
  #popup!: HTMLElement;
  #search!: HTMLInputElement;
  #listbox!: HTMLElement;
  #empty!: HTMLSlotElement;
  #emptyText!: HTMLDivElement;
  #helpText!: HTMLSpanElement;
  #defaultValue: readonly string[] = EMPTY;
  #collection: Collection | null = null;
  #anchored: Anchored | null = null;
  #hiddenByFilter = new WeakSet<FwOption>();
  #disabledByMax = new WeakSet<FwOption>();
  readonly #optionsVersion = signal(0);
  readonly #slots = signal(0);
  readonly #query = signal("");

  /** The chosen values, in the order they were chosen. Frozen. */
  get value(): readonly string[] {
    return this.prop<readonly string[]>("value").get();
  }

  set value(next: readonly string[] | string | null) {
    const list = toList(next);
    const current = this.prop<readonly string[]>("value").peek();
    if (list.length === current.length && list.every((v, i) => v === current[i])) return;
    this.prop<readonly string[]>("value").set(list);
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === "value") this.value = value;
    else super.attributeChangedCallback(name, old, value);
  }

  /** The options, in document order. */
  get options(): FwOption[] {
    return [...this.querySelectorAll<FwOption>(":scope > fw-option, :scope > * > fw-option")];
  }

  /** The chosen options, in the order their values were chosen. */
  get selectedOptions(): FwOption[] {
    const options = this.options;
    return this.prop<readonly string[]>("value")
      .peek()
      .map((v) => options.find((o) => valueOf(o) === v))
      .filter((o): o is FwOption => o !== undefined);
  }

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-multi-select");
    this.#parts = buildField(id);
    const parts = this.#parts;
    parts.label.id = `${id}-label`;
    parts.label.removeAttribute("for");

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    this.#tags = document.createElement("div");
    this.#tags.className = "tags";
    this.#tags.setAttribute("part", "tags");
    this.#tags.setAttribute("role", "list");
    this.#tags.setAttribute("aria-label", "Selected");

    const trigger = document.createElement("span");
    trigger.id = id;
    trigger.className = "trigger";
    trigger.setAttribute("part", "trigger");
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-labelledby", parts.label.id);
    trigger.setAttribute("aria-controls", `${id}-listbox`);
    this.#trigger = trigger;

    this.#clear = document.createElement("button");
    this.#clear.type = "button";
    this.#clear.className = "icon-button";
    this.#clear.tabIndex = -1;
    this.#clear.setAttribute("part", "clear");
    this.#clear.setAttribute("aria-label", "Clear all");
    this.#clear.innerHTML = CLEAR;

    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.setAttribute("part", "chevron");
    chevron.innerHTML = CHEVRON;

    parts.control.append(prefix, this.#tags, trigger, this.#clear, chevron);

    this.#popup = document.createElement("div");
    this.#popup.className = "popup";
    this.#popup.setAttribute("part", "popup");
    if (hasPopover) this.#popup.setAttribute("popover", "manual");
    else this.#popup.hidden = true;

    this.#search = document.createElement("input");
    this.#search.type = "search";
    this.#search.className = "search";
    this.#search.setAttribute("part", "search");
    this.#search.setAttribute("aria-label", "Filter options");
    this.#search.setAttribute("aria-controls", `${id}-listbox`);
    this.#search.setAttribute("aria-autocomplete", "list");
    this.#search.setAttribute("autocomplete", "off");
    this.#search.placeholder = "Search…";

    this.#listbox = document.createElement("div");
    this.#listbox.id = `${id}-listbox`;
    this.#listbox.className = "listbox";
    this.#listbox.setAttribute("part", "listbox");
    this.#listbox.setAttribute("role", "listbox");
    this.#listbox.setAttribute("aria-multiselectable", "true");
    this.#listbox.setAttribute("aria-labelledby", parts.label.id);

    this.#empty = document.createElement("slot");
    this.#empty.name = "empty";
    this.#emptyText = document.createElement("div");
    this.#emptyText.className = "empty";
    this.#emptyText.textContent = "No options";
    this.#empty.append(this.#emptyText);
    this.#empty.hidden = true;
    this.#listbox.append(document.createElement("slot"), this.#empty);
    this.#popup.append(this.#search, this.#listbox);

    this.#helpText = document.createElement("span");
    parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(parts.field, this.#popup);
    this.#defaultValue = toList(this.getAttribute("value"));
  }

  protected override connected(scope: Scope): void {
    const parts = this.#parts;
    const trigger = this.#trigger;
    const search = this.#search;

    this.#collection = createCollection({
      items: () => this.options.filter((o) => !o.hidden),
      textOf: (item) => textOf(item as FwOption),
      isDisabled: (item) => item.hasAttribute("disabled"),
      onActiveChange: (item) => this.#markActive(item as FwOption | null),
    });
    scope.add(() => {
      this.#collection?.dispose();
      this.#collection = null;
    });

    const bump = () => this.#optionsVersion.set(this.#optionsVersion.peek() + 1);
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(bump);
      observer.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["value", "label", "disabled"],
      });
      scope.add(() => observer.disconnect());
    }

    // Value → which options are selected, the chips, the max limit and the form.
    scope.bind(() => {
      this.#optionsVersion.get();
      const values = this.prop<readonly string[]>("value").get();
      const max = this.prop<number | null>("max").get();
      const disabled = this.isDisabled.get();
      const options = this.options;
      const atMax = max !== null && max > 0 && values.length >= max;

      for (const option of options) {
        const on = values.includes(valueOf(option));
        // Attributes rather than properties: they work before the option upgrades.
        if (option.hasAttribute("selected") !== on) option.toggleAttribute("selected", on);
        if (atMax && !on && !option.hasAttribute("disabled")) {
          option.setAttribute("disabled", "");
          this.#disabledByMax.add(option);
        } else if ((!atMax || on) && this.#disabledByMax.has(option)) {
          option.removeAttribute("disabled");
          this.#disabledByMax.delete(option);
        }
      }

      const texts = values.map((v) => {
        const option = options.find((o) => valueOf(o) === v);
        return option ? textOf(option) : v;
      });
      this.#renderTags(values, texts, disabled);
      this.#tags.hidden = values.length === 0;

      const placeholder = this.prop<string | null>("placeholder").get() ?? "";
      trigger.classList.toggle("placeholder", values.length === 0);
      if (values.length === 0) {
        trigger.textContent = placeholder;
      } else {
        // The chips are visible; the combobox itself reads out the choices.
        trigger.textContent = "";
        const summary = document.createElement("span");
        summary.className = "sr-only";
        summary.textContent = texts.join(", ");
        trigger.append(summary);
      }

      this.#empty.hidden = options.length > 0;
      this.#syncFormState(values);
    });

    scope.bind(() => {
      this.prop<string | null>("name").get();
      this.#syncFormState(this.prop<readonly string[]>("value").peek());
    });

    scope.bind(() => {
      const values = this.prop<readonly string[]>("value").get();
      this.#clear.hidden =
        !this.prop<boolean>("clearable").get() || values.length === 0 || this.isDisabled.get();
    });

    scope.bind(() => {
      const disabled = this.isDisabled.get();
      trigger.tabIndex = disabled ? -1 : 0;
      trigger.setAttribute("aria-disabled", String(disabled));
      if (disabled && this.prop<boolean>("open").peek()) this.open = false;
    });

    scope.bind(() => {
      this.#search.hidden = !this.prop<boolean>("searchable").get();
    });

    // The filter.
    scope.bind(() => {
      this.#optionsVersion.get();
      const query = this.#query.get().trim().toLowerCase();
      let visible = 0;
      const options = this.options;
      for (const option of options) {
        const match = query === "" || textOf(option).toLowerCase().includes(query);
        if (match) {
          if (this.#hiddenByFilter.has(option)) {
            option.hidden = false;
            this.#hiddenByFilter.delete(option);
          }
          if (!option.hidden) visible += 1;
        } else if (!option.hidden) {
          option.hidden = true;
          this.#hiddenByFilter.add(option);
        }
      }
      this.#emptyText.textContent = options.length === 0 ? "No options" : "No results";
      this.#empty.hidden = visible > 0;
      const collection = this.#collection;
      const active = collection?.active() as FwOption | null | undefined;
      if (collection && this.prop<boolean>("open").peek() && (!active || active.hidden)) {
        collection.setActive(null);
        collection.first();
      }
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      parts.label.hidden = !label && !slotHasContent(this.root, "label");
      const required = this.prop<boolean>("required").get();
      parts.required.hidden = !required;
      trigger.setAttribute("aria-required", String(required));

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      parts.help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      parts.error.textContent = error ?? "";
      parts.error.hidden = !error;
      trigger.setAttribute("aria-invalid", String(Boolean(error)));
      this.toggleAttribute("invalid", Boolean(error));
      const describedBy = [hasHelp ? parts.help.id : null, error ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) trigger.setAttribute("aria-describedby", describedBy);
      else trigger.removeAttribute("aria-describedby");
      this.#syncFormState(this.prop<readonly string[]>("value").peek());
    });

    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      trigger.setAttribute("aria-expanded", String(open));
      if (open) this.#show();
      else this.#hide();
    });
    scope.add(() => this.#hide(false));

    const onTriggerKey = (event: KeyboardEvent) => {
      if (this.isDisabled.get() || event.target !== trigger) return;
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
        case "Enter":
        case " ":
          event.preventDefault();
          this.open = true;
          if (event.key === "ArrowUp") this.#collection?.last();
          return;
        case "Backspace": {
          const values = this.prop<readonly string[]>("value").peek();
          const last = values[values.length - 1];
          if (last !== undefined) {
            event.preventDefault();
            this.#commit(values.slice(0, -1));
          }
          return;
        }
      }
    };

    // Keys inside the popup: on a focused option, or in the search box.
    const onPopupKey = (event: KeyboardEvent) => {
      if (!this.prop<boolean>("open").peek()) return;
      const path = event.composedPath();
      const inSearch = path.includes(search);
      const option = (event.target as Element | null)?.closest?.("fw-option");
      if (!inSearch && !(option && this.contains(option))) return;
      const collection = this.#collection!;
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          event.stopPropagation();
          this.#close(true);
          return;
        case "Tab":
          this.#close(true);
          return;
        case "Enter":
        case " ": {
          if (inSearch && event.key === " ") return;
          event.preventDefault();
          const active = collection.active() as FwOption | null;
          if (active) this.#toggle(active);
          return;
        }
      }
      if (inSearch) {
        // Home, End and letters belong to the text box.
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      }
      if (collection.handleKey(event)) event.preventDefault();
    };

    const onSearchInput = (event: Event) => {
      event.stopPropagation();
      this.#query.set(search.value);
    };

    const optionFrom = (event: Event): FwOption | null => {
      const option = (event.target as Element | null)?.closest?.("fw-option") as FwOption | null;
      return option && this.contains(option) ? option : null;
    };

    const onMouseDown = (event: MouseEvent) => {
      const path = event.composedPath();
      // Chip and clear buttons never take focus; with a search box, neither
      // do options, so typing can carry on.
      if (
        path.some((n) => n instanceof Element && n.matches("[part~=tag-remove], [part~=clear]"))
      ) {
        event.preventDefault();
      } else if (this.prop<boolean>("searchable").peek() && optionFrom(event)) {
        event.preventDefault();
      }
    };

    const onClick = (event: MouseEvent) => {
      if (this.isDisabled.get()) return;
      const path = event.composedPath();
      const option = optionFrom(event);
      if (option) {
        if (option.hasAttribute("disabled")) return;
        this.#collection?.setActive(option);
        this.#toggle(option);
        return;
      }
      const remove = path.find(
        (n): n is HTMLElement => n instanceof HTMLElement && n.matches("[part~=tag-remove]"),
      );
      if (remove) {
        const value = remove.dataset.value ?? "";
        this.#commit(
          this.prop<readonly string[]>("value")
            .peek()
            .filter((v) => v !== value),
        );
        trigger.focus();
        return;
      }
      if (path.includes(this.#clear)) {
        this.#commit(EMPTY);
        trigger.focus();
        return;
      }
      if (path.includes(parts.control)) {
        this.open = !this.prop<boolean>("open").peek();
        if (!this.prop<boolean>("open").peek()) trigger.focus();
        else if (!this.prop<boolean>("searchable").peek() && !this.#collection?.active()) {
          trigger.focus();
        }
      }
    };

    const onOptionHover = (event: PointerEvent) => {
      const option = optionFrom(event);
      if (option && !option.hasAttribute("disabled") && this.prop<boolean>("searchable").peek()) {
        this.#collection?.setActive(option);
      }
    };

    const onLabelClick = () => trigger.focus();
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);
    const onOutside = (event: PointerEvent) => {
      if (!this.prop<boolean>("open").peek()) return;
      if (!event.composedPath().includes(this)) this.#close(false);
    };

    trigger.addEventListener("keydown", onTriggerKey);
    this.addEventListener("keydown", onPopupKey);
    this.addEventListener("mousedown", onMouseDown);
    this.addEventListener("click", onClick);
    this.addEventListener("pointermove", onOptionHover);
    search.addEventListener("input", onSearchInput);
    parts.label.addEventListener("click", onLabelClick);
    this.root.addEventListener("slotchange", onSlotChange);
    document.addEventListener("pointerdown", onOutside, true);
    scope.add(() => {
      trigger.removeEventListener("keydown", onTriggerKey);
      this.removeEventListener("keydown", onPopupKey);
      this.removeEventListener("mousedown", onMouseDown);
      this.removeEventListener("click", onClick);
      this.removeEventListener("pointermove", onOptionHover);
      search.removeEventListener("input", onSearchInput);
      parts.label.removeEventListener("click", onLabelClick);
      this.root.removeEventListener("slotchange", onSlotChange);
      document.removeEventListener("pointerdown", onOutside, true);
    });
  }

  #renderTags(values: readonly string[], texts: readonly string[], disabled: boolean): void {
    const tags = values.map((value, i) => {
      const text = texts[i] ?? value;
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.setAttribute("part", "tag");
      tag.setAttribute("role", "listitem");
      const label = document.createElement("span");
      label.className = "tag-text";
      label.textContent = text;
      tag.append(label);
      if (!disabled) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "tag-remove";
        remove.tabIndex = -1;
        remove.dataset.value = value;
        remove.setAttribute("part", "tag-remove");
        remove.setAttribute("aria-label", `Remove ${text}`);
        remove.innerHTML = REMOVE;
        tag.append(remove);
      }
      return tag;
    });
    this.#tags.replaceChildren(...tags);
  }

  #markActive(item: FwOption | null): void {
    for (const option of this.options) option.toggleAttribute("data-active", option === item);
    const searchable = this.prop<boolean>("searchable").peek();
    if (canReflectActive()) this.#search.ariaActiveDescendantElement = searchable ? item : null;
    if (!item || !this.prop<boolean>("open").peek()) return;
    if (!searchable) item.focus({ preventScroll: true });
    item.scrollIntoView?.({ block: "nearest" });
  }

  #show(): void {
    const popup = this.#popup;
    if (hasPopover) {
      if (!popup.matches(":popover-open")) popup.showPopover();
    } else {
      popup.hidden = false;
    }
    this.#anchored?.dispose();
    this.#anchored = anchorTo(this.#parts.control, popup, {
      placement: this.prop<Placement>("placement").peek() ?? "bottom-start",
      sameWidth: true,
      offset: 4,
    });
    const searchable = this.prop<boolean>("searchable").peek();
    if (searchable) {
      this.#search.value = "";
      this.#query.set("");
      this.#search.focus();
    }
    const collection = this.#collection;
    if (collection) {
      const target = this.selectedOptions.find((o) => !o.hidden && !o.hasAttribute("disabled"));
      collection.setActive(null);
      if (target) collection.setActive(target);
      else collection.first();
    }
    this.emit("fw-show");
  }

  #hide(emit = true): void {
    this.#anchored?.dispose();
    this.#anchored = null;
    const popup = this.#popup;
    const wasOpen = hasPopover ? popup.matches(":popover-open") : !popup.hidden;
    if (hasPopover) {
      if (wasOpen) popup.hidePopover();
    } else {
      popup.hidden = true;
    }
    this.#collection?.setActive(null);
    for (const option of this.options) option.removeAttribute("data-active");
    if (canReflectActive()) this.#search.ariaActiveDescendantElement = null;
    if (this.#query.peek() !== "") this.#query.set("");
    if (wasOpen && emit) this.emit("fw-hide");
  }

  #close(returnFocus: boolean): void {
    if (!this.prop<boolean>("open").peek()) return;
    this.open = false;
    if (returnFocus) this.#trigger.focus();
  }

  #toggle(option: FwOption): void {
    if (option.hasAttribute("disabled")) return;
    const value = valueOf(option);
    const values = this.prop<readonly string[]>("value").peek();
    if (values.includes(value)) {
      this.#commit(values.filter((v) => v !== value));
      return;
    }
    const max = this.prop<number | null>("max").peek();
    if (max !== null && max > 0 && values.length >= max) return;
    this.#commit([...values, value]);
  }

  #commit(next: readonly string[]): void {
    const current = this.prop<readonly string[]>("value").peek();
    if (next.length === current.length && next.every((v, i) => v === current[i])) return;
    this.value = next;
    this.emit("input");
    this.emit("change");
  }

  #syncFormState(values: readonly string[]): void {
    const name = this.prop<string | null>("name").peek();
    if (values.length === 0 || !name || typeof FormData === "undefined") {
      this.setFormValue(null);
    } else {
      const data = new FormData();
      for (const value of values) data.append(name, value);
      this.setFormValue(data);
    }
    const error = this.prop<string | null>("error").peek();
    if (error) {
      this.setValidity({ customError: true }, error, this.#trigger);
    } else if (this.prop<boolean>("required").peek() && values.length === 0) {
      this.setValidity({ valueMissing: true }, "Please select at least one option.", this.#trigger);
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.value = this.#defaultValue;
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

  /** Open the list. */
  show(): void {
    if (!this.isDisabled.peek()) this.open = true;
  }

  /** Close the list and return focus to the field. */
  hide(): void {
    this.#close(true);
  }

  override focus(options?: FocusOptions): void {
    this.#trigger?.focus(options);
  }
}
