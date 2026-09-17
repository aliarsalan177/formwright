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
import type { FwOption } from "../select/option.js";

export type ComboboxFilter = "contains" | "starts-with" | "none";

const styles =
  fieldStyles +
  /* css */ `
.input {
  flex: 1; min-width: 0; height: calc(var(--_height) - 2px);
  padding: 0; border: 0; outline: none; background: transparent;
  font: inherit; font-size: var(--_text-size); color: inherit;
}
.input::placeholder { color: var(--_muted); opacity: 1; }
.input:disabled { cursor: not-allowed; }
.icon-button { transition: background-color var(--_duration), color var(--_duration); }
.icon-button svg { display: block; }
.toggle { color: var(--_muted); }
:host([open]) .toggle { color: var(--_text); }
.toggle svg { transition: transform var(--_duration); }
:host([open]) .toggle svg { transform: rotate(180deg); }

.spinner {
  flex: none; width: 1rem; height: 1rem; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--_muted) 30%, transparent);
  border-top-color: var(--_accent);
  animation: fw-combobox-spin 700ms linear infinite;
}
@keyframes fw-combobox-spin { to { transform: rotate(360deg); } }

.listbox {
  margin: 0; inset: auto; padding: 0.25rem;
  min-width: 10rem;
  max-height: min(18rem, var(--fw-available-height, 18rem));
  overflow: auto; overscroll-behavior: contain;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border); border-radius: var(--_radius);
  box-shadow: var(--_shadow);
}
.empty, .loading {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.625rem; font-size: var(--_text-size); line-height: 1.25; color: var(--_muted);
}
`;

const CHEVRON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const CLEAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

/** An option's value and text, read from attributes until it is upgraded:
 *  parsed markup connects the combobox before its options are defined. */
const valueOf = (o: FwOption): string =>
  typeof o.value === "string" ? o.value : (o.getAttribute("value") ?? "");
const textOf = (o: FwOption): string =>
  typeof o.text === "string" ? o.text : (o.getAttribute("label") ?? o.textContent ?? "").trim();

const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/** Element reflection lets an input in a shadow root point at a light-DOM
 *  option. Checked on each use, so a polyfill loaded later still counts. */
const canReflectActive = () =>
  typeof Element !== "undefined" && "ariaActiveDescendantElement" in Element.prototype;

/**
 * `<fw-combobox>` — a text input that suggests options as you type.
 *
 * ```html
 * <fw-combobox label="City" name="city" placeholder="Search cities" clearable>
 *   <fw-option value="khi">Karachi</fw-option>
 *   <fw-option value="lhe">Lahore</fw-option>
 *   <fw-option value="isb">Islamabad</fw-option>
 *   <span slot="empty">No city by that name</span>
 * </fw-combobox>
 *
 * <!-- The app filters, e.g. from a server -->
 * <fw-combobox label="Member" filter="none" min-chars="2" debounce="250"></fw-combobox>
 * <script>
 *   combo.addEventListener("fw-search", async (e) => {
 *     combo.loading = true;
 *     combo.replaceChildren(...(await find(e.detail.query)).map(toOption));
 *     combo.loading = false;
 *   });
 * </script>
 *
 * <!-- Free text is allowed as the value -->
 * <fw-combobox label="Tag" allow-custom></fw-combobox>
 * ```
 *
 * Follows the WAI-ARIA editable combobox with list autocomplete. Focus
 * stays in the text input while the user moves through suggestions; the
 * active option is exposed with `ariaActiveDescendantElement` — element
 * reflection, which may point from the shadow root at a light-DOM option —
 * and marked with `data-active` for a visible highlight.
 *
 * Keyboard: ArrowDown / ArrowUp open and move, Enter chooses the active
 * option (or keeps the typed text with `allow-custom`), Escape closes and a
 * second Escape clears, Tab chooses the active option only when it was
 * reached with the arrows. Leaving the field without choosing puts back the
 * chosen option's text, unless `allow-custom`.
 *
 * Events: `fw-search` (`{ query }`, after `debounce` ms) as the user types;
 * `input` and `change` when a value is chosen; `fw-show`, `fw-hide`.
 * Slots: default (options), `label`, `help`, `prefix`, `empty`.
 * Parts: `field`, `label`, `control`, `input`, `spinner`, `clear`, `toggle`,
 * `listbox`, `empty`, `loading`, `help`, `error`.
 */
export class FwCombobox extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    value: { type: "string", default: "" },
    placeholder: { type: "string" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
    clearable: { type: "boolean" },
    filter: { type: "string", default: "contains" },
    allowCustom: { type: "boolean", attribute: "allow-custom" },
    loading: { type: "boolean", reflect: true },
    open: { type: "boolean", reflect: true },
    minChars: { type: "number", attribute: "min-chars", default: 0 },
    debounce: { type: "number", default: 0 },
    placement: { type: "string", default: "bottom-start" },
  };
  static override styles = styles;
  static override shadowOptions: ShadowRootInit = { mode: "open", delegatesFocus: true };

  declare value: string;
  declare placeholder: string | null;
  declare label: string | null;
  declare help: string | null;
  declare error: string | null;
  declare size: "sm" | "md" | "lg";
  declare clearable: boolean;
  declare filter: ComboboxFilter;
  declare allowCustom: boolean;
  declare loading: boolean;
  declare open: boolean;
  declare minChars: number;
  declare debounce: number;
  declare placement: Placement;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #input!: HTMLInputElement;
  #spinner!: HTMLSpanElement;
  #clear!: HTMLButtonElement;
  #toggle!: HTMLButtonElement;
  #listbox!: HTMLElement;
  #empty!: HTMLSlotElement;
  #loadingRow!: HTMLDivElement;
  #helpText!: HTMLSpanElement;
  #defaultValue = "";
  #collection: Collection | null = null;
  #anchored: Anchored | null = null;
  /** Options this element hid while filtering, so it only unhides its own. */
  #hiddenByFilter = new WeakSet<FwOption>();
  /** The user has typed since the last commit; the text is theirs, not the value's. */
  #editing = false;
  /** The active option was reached with the arrow keys, which Tab honours. */
  #navigated = false;
  /** The text of the last chosen option, kept for when async options go away. */
  #chosenText = "";
  #lastValue: string | null = null;
  readonly #optionsVersion = signal(0);
  readonly #slots = signal(0);

  /** The options, in document order. */
  get options(): FwOption[] {
    return [...this.querySelectorAll<FwOption>(":scope > fw-option, :scope > * > fw-option")];
  }

  /** The chosen option, if any. */
  get selectedOption(): FwOption | null {
    const value = this.prop<string | null>("value").peek() ?? "";
    if (value === "") return null;
    return this.options.find((o) => valueOf(o) === value) ?? null;
  }

  /** What is in the text box right now. */
  get inputValue(): string {
    return this.#input?.value ?? "";
  }

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-combobox");
    this.#parts = buildField(id);
    const parts = this.#parts;
    parts.label.id = `${id}-label`;

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.className = "input";
    input.setAttribute("part", "input");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", `${id}-listbox`);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.spellcheck = false;
    this.#input = input;

    this.#spinner = document.createElement("span");
    this.#spinner.className = "spinner";
    this.#spinner.setAttribute("part", "spinner");
    this.#spinner.setAttribute("aria-hidden", "true");

    this.#clear = document.createElement("button");
    this.#clear.type = "button";
    this.#clear.className = "icon-button";
    this.#clear.tabIndex = -1;
    this.#clear.setAttribute("part", "clear");
    this.#clear.setAttribute("aria-label", "Clear");
    this.#clear.innerHTML = CLEAR;

    // Not in the tab order: the input already opens the list from the
    // keyboard, and a second stop would only be noise.
    this.#toggle = document.createElement("button");
    this.#toggle.type = "button";
    this.#toggle.className = "icon-button toggle";
    this.#toggle.tabIndex = -1;
    this.#toggle.setAttribute("part", "toggle");
    this.#toggle.setAttribute("aria-label", "Show options");
    this.#toggle.innerHTML = CHEVRON;

    parts.control.append(prefix, input, this.#spinner, this.#clear, this.#toggle);

    this.#listbox = document.createElement("div");
    this.#listbox.id = `${id}-listbox`;
    this.#listbox.className = "listbox";
    this.#listbox.setAttribute("part", "listbox");
    this.#listbox.setAttribute("role", "listbox");
    this.#listbox.setAttribute("aria-labelledby", parts.label.id);
    if (hasPopover) this.#listbox.setAttribute("popover", "manual");
    else this.#listbox.hidden = true;

    this.#empty = document.createElement("slot");
    this.#empty.name = "empty";
    this.#empty.setAttribute("part", "empty");
    const emptyText = document.createElement("div");
    emptyText.className = "empty";
    emptyText.textContent = "No results";
    this.#empty.append(emptyText);
    this.#empty.hidden = true;

    this.#loadingRow = document.createElement("div");
    this.#loadingRow.className = "loading";
    this.#loadingRow.setAttribute("part", "loading");
    this.#loadingRow.textContent = "Loading…";
    this.#loadingRow.hidden = true;

    this.#listbox.append(document.createElement("slot"), this.#empty, this.#loadingRow);

    this.#helpText = document.createElement("span");
    parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(parts.field, this.#listbox);
    this.#defaultValue = this.getAttribute("value") ?? "";
  }

  protected override connected(scope: Scope): void {
    const parts = this.#parts;
    const input = this.#input;
    this.#lastValue = null;

    this.#collection = createCollection({
      items: () => this.#visibleOptions(),
      typeahead: false,
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

    // Value → selected option, the text shown, and what the form submits.
    scope.bind(() => {
      this.#optionsVersion.get();
      const value = this.prop<string | null>("value").get() ?? "";
      const allowCustom = this.prop<boolean>("allowCustom").get();
      let chosen: FwOption | null = null;
      for (const option of this.options) {
        const on = value !== "" && valueOf(option) === value;
        option.selected = on;
        if (on) chosen = option;
      }
      // A new value always wins over half-typed text; an options change
      // does not, or async results would overwrite what is being typed.
      const valueChanged = this.#lastValue !== value;
      // An option that went away (async results replaced) keeps its text
      // on screen; a value with no option at all shows only as free text.
      if (chosen) this.#chosenText = textOf(chosen);
      else if (valueChanged) this.#chosenText = allowCustom ? value : "";
      this.#lastValue = value;
      if (valueChanged) this.#editing = false;
      if (!this.#editing && input.value !== this.#chosenText) input.value = this.#chosenText;
      this.#syncFormState(value);
    });

    // Options changing while open (async results) re-filter the list.
    scope.bind(() => {
      this.#optionsVersion.get();
      this.prop<string>("filter").get();
      this.prop<boolean>("loading").get();
      if (this.prop<boolean>("open").peek()) this.#refresh();
    });

    scope.bind(() => {
      const loading = this.prop<boolean>("loading").get();
      this.#spinner.hidden = !loading;
      if (loading) this.#listbox.setAttribute("aria-busy", "true");
      else this.#listbox.removeAttribute("aria-busy");
    });

    scope.bind(() => {
      const value = this.prop<string | null>("value").get() ?? "";
      this.#clear.hidden =
        !this.prop<boolean>("clearable").get() || value === "" || this.isDisabled.get();
    });

    scope.bind(() => {
      const disabled = this.isDisabled.get();
      input.disabled = disabled;
      this.#toggle.disabled = disabled;
      if (disabled && this.prop<boolean>("open").peek()) this.open = false;
    });

    scope.bind(() => {
      input.placeholder = this.prop<string | null>("placeholder").get() ?? "";
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      parts.label.hidden = !label && !slotHasContent(this.root, "label");
      const required = this.prop<boolean>("required").get();
      parts.required.hidden = !required;
      input.setAttribute("aria-required", String(required));

      const help = this.prop<string | null>("help").get();
      this.#helpText.textContent = help ?? "";
      const hasHelp = Boolean(help) || slotHasContent(this.root, "help");
      parts.help.hidden = !hasHelp;

      const error = this.prop<string | null>("error").get();
      parts.error.textContent = error ?? "";
      parts.error.hidden = !error;
      input.setAttribute("aria-invalid", String(Boolean(error)));
      this.toggleAttribute("invalid", Boolean(error));
      const describedBy = [hasHelp ? parts.help.id : null, error ? parts.error.id : null]
        .filter(Boolean)
        .join(" ");
      if (describedBy) input.setAttribute("aria-describedby", describedBy);
      else input.removeAttribute("aria-describedby");
      this.#syncFormState(this.prop<string | null>("value").peek() ?? "");
    });

    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      input.setAttribute("aria-expanded", String(open));
      this.#toggle.setAttribute("aria-label", open ? "Hide options" : "Show options");
      if (open) this.#show();
      else this.#hide();
    });
    scope.add(() => this.#hide(false));

    // --- the search, debounced ------------------------------------------
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelSearch = () => {
      if (searchTimer !== null) clearTimeout(searchTimer);
      searchTimer = null;
    };
    scope.add(cancelSearch);
    const search = (query: string) => {
      cancelSearch();
      if (query.length < (this.prop<number | null>("minChars").peek() ?? 0)) return;
      const wait = this.prop<number | null>("debounce").peek() ?? 0;
      const fire = () => {
        searchTimer = null;
        this.emit("fw-search", { query });
      };
      if (wait > 0) searchTimer = setTimeout(fire, wait);
      else fire();
    };

    const onInput = (event: Event) => {
      // The inner input's own `input` event crosses the shadow boundary and
      // means "the text changed", not "the value changed"; the host emits
      // its own `input` on commit.
      event.stopPropagation();
      this.#editing = true;
      this.#navigated = false;
      const query = input.value;
      search(query);
      if (this.#meetsMinChars(query)) {
        if (this.prop<boolean>("open").peek()) this.#refresh();
        else this.open = true;
      } else {
        this.open = false;
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (this.isDisabled.get()) return;
      const collection = this.#collection!;
      const open = this.prop<boolean>("open").peek();
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp": {
          event.preventDefault();
          if (!open) {
            if (!this.#meetsMinChars(input.value)) return;
            this.open = true;
            if (event.altKey) return;
            this.#navigated = true;
            const selected = this.selectedOption;
            if (selected && !this.#editing && this.#visibleOptions().includes(selected)) {
              collection.setActive(selected);
            } else if (event.key === "ArrowUp") {
              collection.setActive(null);
              collection.last();
            } else {
              collection.setActive(null);
              collection.first();
            }
            return;
          }
          if (event.altKey) {
            if (event.key === "ArrowUp") this.open = false;
            return;
          }
          this.#navigated = true;
          collection.handleKey(event);
          return;
        }
        case "Enter": {
          const active = open ? (collection.active() as FwOption | null) : null;
          if (active) {
            event.preventDefault();
            this.#choose(active);
          } else if (this.prop<boolean>("allowCustom").peek() && this.#editing) {
            event.preventDefault();
            this.#commitText();
          } else if (open) {
            event.preventDefault();
          }
          return;
        }
        case "Escape": {
          if (open) {
            event.preventDefault();
            // So an Escape that closes the list does not also close the
            // dialog the combobox sits in.
            event.stopPropagation();
            this.open = false;
            return;
          }
          if (input.value !== "" || (this.prop<string | null>("value").peek() ?? "") !== "") {
            event.preventDefault();
            event.stopPropagation();
            input.value = "";
            this.#editing = false;
            this.#commit("");
            this.#chosenText = "";
            search("");
          }
          return;
        }
        case "Tab": {
          const active = open ? (collection.active() as FwOption | null) : null;
          if (active && this.#navigated) this.#choose(active);
          else if (this.prop<boolean>("allowCustom").peek() && this.#editing) this.#commitText();
          this.open = false;
          return;
        }
      }
    };

    const onBlur = () => {
      // Focus left the text box for somewhere else on the page: pressing an
      // option or a button never moves it (their mousedown is cancelled).
      this.open = false;
      if (!this.#editing) return;
      if (this.prop<boolean>("allowCustom").peek()) this.#commitText();
      else this.#restoreText();
    };

    const optionFrom = (event: Event): FwOption | null => {
      const option = (event.target as Element | null)?.closest?.("fw-option") as FwOption | null;
      return option && this.contains(option) ? option : null;
    };

    // Keep focus in the input when pressing anything inside the element.
    const onMouseDown = (event: MouseEvent) => {
      const path = event.composedPath();
      if (path.includes(input)) return;
      if (path.includes(this.#listbox) || path.includes(parts.control)) event.preventDefault();
    };

    const onOptionClick = (event: MouseEvent) => {
      const option = optionFrom(event);
      if (!option || option.disabled || !this.prop<boolean>("open").peek()) return;
      this.#choose(option);
    };

    const onOptionHover = (event: PointerEvent) => {
      const option = optionFrom(event);
      if (option && !option.disabled && this.prop<boolean>("open").peek()) {
        this.#collection?.setActive(option);
      }
    };

    const onToggle = () => {
      if (this.isDisabled.get()) return;
      if (this.prop<boolean>("open").peek()) {
        this.open = false;
      } else {
        this.open = true;
      }
      input.focus();
    };

    const onClear = (event: MouseEvent) => {
      event.stopPropagation();
      input.value = "";
      this.#editing = false;
      this.#commit("");
      this.#chosenText = "";
      input.focus();
    };

    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    const onOutside = (event: PointerEvent) => {
      if (!this.prop<boolean>("open").peek()) return;
      if (!event.composedPath().includes(this)) this.open = false;
    };

    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKey);
    input.addEventListener("blur", onBlur);
    this.addEventListener("mousedown", onMouseDown);
    this.addEventListener("click", onOptionClick);
    this.addEventListener("pointermove", onOptionHover);
    this.#toggle.addEventListener("click", onToggle);
    this.#clear.addEventListener("click", onClear);
    this.root.addEventListener("slotchange", onSlotChange);
    document.addEventListener("pointerdown", onOutside, true);
    scope.add(() => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("blur", onBlur);
      this.removeEventListener("mousedown", onMouseDown);
      this.removeEventListener("click", onOptionClick);
      this.removeEventListener("pointermove", onOptionHover);
      this.#toggle.removeEventListener("click", onToggle);
      this.#clear.removeEventListener("click", onClear);
      this.root.removeEventListener("slotchange", onSlotChange);
      document.removeEventListener("pointerdown", onOutside, true);
    });
  }

  #meetsMinChars(query: string): boolean {
    return query.length >= (this.prop<number | null>("minChars").peek() ?? 0);
  }

  #visibleOptions(): FwOption[] {
    return this.options.filter((o) => !o.hidden);
  }

  /** Apply the filter to the options and keep the active one sensible. */
  #refresh(): void {
    const mode = this.prop<string | null>("filter").peek() ?? "contains";
    // Opening on a chosen value shows everything; only typing narrows.
    const query = this.#editing ? this.#input.value.trim().toLowerCase() : "";
    let visible = 0;
    for (const option of this.options) {
      let match = true;
      if (mode !== "none" && query !== "") {
        const text = textOf(option).toLowerCase();
        match = mode === "starts-with" ? text.startsWith(query) : text.includes(query);
      }
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
    const loading = this.prop<boolean>("loading").peek();
    this.#empty.hidden = visible > 0 || loading;
    this.#loadingRow.hidden = !loading || visible > 0;

    const collection = this.#collection;
    if (!collection) return;
    const active = collection.active() as FwOption | null;
    const stillThere = active && !active.hidden && !active.disabled && this.contains(active);
    if (!stillThere) {
      collection.setActive(null);
      this.#navigated = false;
    }
    // Typing highlights the first match, so Enter takes it — unless free
    // text is allowed, where Enter must keep what was typed.
    if (
      !collection.active() &&
      this.#editing &&
      query !== "" &&
      !this.prop<boolean>("allowCustom").peek()
    ) {
      collection.first();
    }
  }

  #markActive(item: FwOption | null): void {
    for (const option of this.options) option.toggleAttribute("data-active", option === item);
    if (canReflectActive()) this.#input.ariaActiveDescendantElement = item;
    if (item) item.scrollIntoView?.({ block: "nearest" });
  }

  #show(): void {
    const listbox = this.#listbox;
    if (hasPopover) {
      if (!listbox.matches(":popover-open")) listbox.showPopover();
    } else {
      listbox.hidden = false;
    }
    this.#anchored?.dispose();
    this.#anchored = anchorTo(this.#parts.control, listbox, {
      placement: this.prop<Placement>("placement").peek() ?? "bottom-start",
      sameWidth: true,
      offset: 4,
    });
    this.#collection?.setActive(null);
    this.#refresh();
    this.emit("fw-show");
  }

  #hide(emit = true): void {
    this.#anchored?.dispose();
    this.#anchored = null;
    const listbox = this.#listbox;
    const wasOpen = hasPopover ? listbox.matches(":popover-open") : !listbox.hidden;
    if (hasPopover) {
      if (wasOpen) listbox.hidePopover();
    } else {
      listbox.hidden = true;
    }
    this.#collection?.setActive(null);
    this.#markActive(null);
    this.#navigated = false;
    if (wasOpen && emit) this.emit("fw-hide");
  }

  #choose(option: FwOption): void {
    if (option.disabled) return;
    this.#chosenText = textOf(option);
    this.#editing = false;
    this.#input.value = textOf(option);
    this.#commit(valueOf(option));
    this.open = false;
  }

  /** Commit what was typed: an option whose text matches it, or the text itself. */
  #commitText(): void {
    const text = this.#input.value.trim();
    const match = this.options.find(
      (o) => !o.disabled && textOf(o).toLowerCase() === text.toLowerCase(),
    );
    if (match && text !== "") {
      this.#choose(match);
      return;
    }
    this.#chosenText = text;
    this.#editing = false;
    this.#input.value = text;
    this.#commit(text);
    this.open = false;
  }

  #restoreText(): void {
    this.#editing = false;
    this.#input.value = this.#chosenText;
    this.#navigated = false;
  }

  #commit(value: string): void {
    if ((this.prop<string | null>("value").peek() ?? "") === value) return;
    this.value = value;
    this.emit("input");
    this.emit("change");
  }

  #syncFormState(value: string): void {
    this.setFormValue(value === "" ? null : value);
    const error = this.prop<string | null>("error").peek();
    if (error) {
      this.setValidity({ customError: true }, error, this.#input);
    } else if (this.prop<boolean>("required").peek() && value === "") {
      this.setValidity({ valueMissing: true }, "Please choose an option.", this.#input);
    } else {
      this.setValidity({});
    }
  }

  protected resetValue(): void {
    this.#editing = false;
    this.value = this.#defaultValue;
    if (this.#input) this.#input.value = this.#chosenText;
  }

  protected override restoreValue(state: string): void {
    this.value = state;
  }

  /** Open the suggestions. */
  show(): void {
    if (!this.isDisabled.peek()) this.open = true;
  }

  /** Close the suggestions. */
  hide(): void {
    this.open = false;
  }

  override focus(options?: FocusOptions): void {
    this.#input?.focus(options);
  }

  override blur(): void {
    this.#input?.blur();
  }
}
