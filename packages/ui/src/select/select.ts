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
import { FwOption } from "./option.js";

const styles =
  fieldStyles +
  /* css */ `
.trigger { cursor: pointer; outline: none; user-select: none; }
.trigger[aria-disabled="true"] { cursor: not-allowed; }
.display {
  flex: 1; min-width: 0; font-size: var(--_text-size); line-height: 1.4;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.display.placeholder { color: var(--_muted); }
.chevron {
  display: inline-flex; flex: none; color: var(--_muted);
  margin-inline-end: -0.125rem;
  transition: transform var(--_duration), color var(--_duration);
}
.chevron svg { display: block; }
.trigger:hover .chevron, :host([open]) .chevron { color: var(--_text); }
:host([open]) .chevron { transform: rotate(180deg); }

/* The reference floating panel: menus, popovers, the combobox and date
   picker share this surface, border, radius, shadow and 4px inset. */
.listbox {
  margin: 0; inset: auto; padding: 0.25rem;
  min-width: 10rem;
  max-height: min(18rem, var(--fw-available-height, 18rem));
  overflow: auto; overscroll-behavior: contain; scroll-padding-block: 0.25rem;
  background: var(--_surface); color: var(--_text);
  /* Capped, so a pill theme (radius: full) does not clip the list. */
  border: 1px solid var(--_border); border-radius: min(var(--_radius), 0.75rem);
  box-shadow: var(--_shadow);
  font-family: var(--_font); font-size: var(--_text-size);
  outline: none;
}
.empty { padding: 0.375rem 0.5rem; font-size: var(--_text-size); line-height: 1.25rem; color: var(--_muted); }
`;

const CHEVRON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const CLEAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

/** The Popover API puts the list in the top layer: above every z-index,
 *  and outside any transformed ancestor that would trap `position: fixed`. */
/** Options are `<fw-option>`s or `<fw-list-item>`s, as children or grandchildren (in a group). */
const OPTION_SELECTOR =
  ":scope > fw-option, :scope > * > fw-option, :scope > fw-list-item, :scope > * > fw-list-item";

const hasPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/**
 * `<fw-select>` — pick one option from a list.
 *
 * ```html
 * <fw-select label="Gender" name="gender" placeholder="Choose…" required>
 *   <fw-option value="MALE">Male</fw-option>
 *   <fw-option value="FEMALE">Female</fw-option>
 * </fw-select>
 * ```
 *
 * Behaves like a native select from the keyboard: arrows, Home and End,
 * type a letter to jump — even while closed — Enter or Space to choose,
 * Escape to close. Clicking outside closes it. The list opens in the top
 * layer, so a select inside a drawer, a table cell or a card with
 * `overflow: hidden` is never clipped, and it flips above when there is
 * no room below.
 *
 * Accessibility note. While open, focus moves onto the options rather than
 * staying on the trigger with `aria-activedescendant`: the options are in
 * the page and the trigger is in the shadow root, and id references do not
 * cross that boundary. Focus does, in every screen reader.
 *
 * Options are `<fw-option>`s, or `<fw-list-item>`s for richer rows
 * (avatar, description, badge); both behave the same here. Import
 * `@formwright/ui/list` to register `<fw-list-item>`.
 *
 * Events: `input` and `change` when the user picks, `fw-show`, `fw-hide`.
 * Slots: default (options), `label`, `help`, `prefix`, `empty`.
 * Parts: `field`, `label`, `control`, `display`, `clear`, `chevron`, `listbox`, `help`, `error`.
 */
export class FwSelect extends FwFormElement {
  static override props: PropMap = {
    ...FwFormElement.props,
    value: { type: "string", default: "" },
    placeholder: { type: "string" },
    label: { type: "string" },
    help: { type: "string" },
    error: { type: "string" },
    size: { type: "string", reflect: true, default: "md" },
    clearable: { type: "boolean" },
    placement: { type: "string", default: "bottom-start" },
    open: { type: "boolean", reflect: true },
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
  declare placement: Placement;
  declare open: boolean;
  declare disabled: boolean;
  declare required: boolean;
  declare name: string | null;

  #parts!: FieldParts;
  #trigger!: HTMLElement;
  #display!: HTMLSpanElement;
  #clear!: HTMLButtonElement;
  #listbox!: HTMLElement;
  #helpText!: HTMLSpanElement;
  #defaultValue = "";
  #collection: Collection | null = null;
  #anchored: Anchored | null = null;
  /** Bumped when options are added, removed or edited. */
  readonly #optionsVersion = signal(0);
  readonly #slots = signal(0);

  /** The options — `<fw-option>` and `<fw-list-item>` children — in document order. */
  get options(): FwOption[] {
    return [...this.querySelectorAll<FwOption>(OPTION_SELECTOR)];
  }

  /** The chosen option, if any. */
  get selectedOption(): FwOption | null {
    const value = this.prop<string | null>("value").peek() ?? "";
    return this.options.find((o) => o.value === value) ?? null;
  }

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-select");
    this.#parts = buildField(id);
    const parts = this.#parts;
    parts.label.id = `${id}-label`;

    // A label cannot `for=` a non-labelable element; it names the
    // combobox through aria-labelledby, and a click on it focuses it.
    parts.label.removeAttribute("for");

    const trigger = parts.control;
    trigger.id = id;
    trigger.classList.add("trigger");
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-labelledby", parts.label.id);
    trigger.setAttribute("aria-controls", `${id}-listbox`);
    this.#trigger = trigger;

    const prefix = document.createElement("slot");
    prefix.name = "prefix";

    this.#display = document.createElement("span");
    this.#display.className = "display";
    this.#display.setAttribute("part", "display");

    this.#clear = document.createElement("button");
    this.#clear.type = "button";
    this.#clear.className = "icon-button";
    this.#clear.tabIndex = -1;
    this.#clear.setAttribute("part", "clear");
    this.#clear.setAttribute("aria-label", "Clear selection");
    this.#clear.innerHTML = CLEAR;

    const chevron = document.createElement("span");
    chevron.className = "chevron";
    chevron.setAttribute("part", "chevron");
    chevron.innerHTML = CHEVRON;

    trigger.append(prefix, this.#display, this.#clear, chevron);

    this.#listbox = document.createElement("div");
    this.#listbox.id = `${id}-listbox`;
    this.#listbox.className = "listbox";
    this.#listbox.setAttribute("part", "listbox");
    this.#listbox.setAttribute("role", "listbox");
    this.#listbox.setAttribute("aria-labelledby", parts.label.id);
    if (hasPopover) this.#listbox.setAttribute("popover", "manual");
    else this.#listbox.hidden = true;
    const empty = document.createElement("slot");
    empty.name = "empty";
    const emptyText = document.createElement("div");
    emptyText.className = "empty";
    emptyText.textContent = "No options";
    empty.append(emptyText);
    empty.hidden = true;
    this.#listbox.append(document.createElement("slot"), empty);

    this.#helpText = document.createElement("span");
    parts.help.querySelector("slot")!.append(this.#helpText);

    root.append(parts.field, this.#listbox);
    this.#defaultValue = this.getAttribute("value") ?? "";
  }

  protected override connected(scope: Scope): void {
    const parts = this.#parts;
    const trigger = this.#trigger;

    this.#collection = createCollection({
      items: () => this.options,
      textOf: (item) => (item as FwOption).text,
      isDisabled: (item) => item.hasAttribute("disabled"),
      onActiveChange: (item) => {
        for (const option of this.options) option.toggleAttribute("data-active", option === item);
        if (item && this.prop<boolean>("open").peek()) {
          item.focus({ preventScroll: true });
          item.scrollIntoView?.({ block: "nearest" });
        }
      },
    });
    scope.add(() => {
      this.#collection?.dispose();
      this.#collection = null;
    });

    // Options added, removed, relabelled or re-valued.
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

    // Value → which option is selected, what the closed select shows, and
    // what the form submits.
    scope.bind(() => {
      this.#optionsVersion.get();
      const value = this.prop<string | null>("value").get() ?? "";
      const options = this.options;
      let chosen: FwOption | null = null;
      for (const option of options) {
        const on = value !== "" && option.value === value;
        option.selected = on;
        if (!option.hasAttribute("data-selectable")) option.setAttribute("data-selectable", "");
        if (on) chosen = option;
      }
      const placeholder = this.prop<string | null>("placeholder").get() ?? "";
      this.#display.textContent = chosen ? chosen.text : placeholder;
      this.#display.classList.toggle("placeholder", !chosen);
      this.#listbox.querySelector<HTMLSlotElement>('slot[name="empty"]')!.hidden =
        options.length > 0;
      this.#syncFormState(value);
    });

    scope.bind(() => {
      const value = this.prop<string | null>("value").get() ?? "";
      this.#clear.hidden =
        !this.prop<boolean>("clearable").get() || value === "" || this.isDisabled.get();
    });

    scope.bind(() => {
      const disabled = this.isDisabled.get();
      trigger.tabIndex = disabled ? -1 : 0;
      trigger.setAttribute("aria-disabled", String(disabled));
      if (disabled && this.prop<boolean>("open").peek()) this.open = false;
    });

    scope.bind(() => {
      this.#slots.get();
      const label = this.prop<string | null>("label").get();
      parts.labelText.textContent = label ?? "";
      parts.label.hidden = !label && !slotHasContent(this.root, "label");
      parts.required.hidden = !this.prop<boolean>("required").get();
      trigger.setAttribute("aria-required", String(this.prop<boolean>("required").get()));

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
      this.#syncFormState(this.prop<string | null>("value").peek() ?? "");
    });

    // Open state → the popup, its position and where focus is.
    scope.bind(() => {
      const open = this.prop<boolean>("open").get();
      trigger.setAttribute("aria-expanded", String(open));
      if (open) this.#show();
      else this.#hide();
    });
    scope.add(() => this.#hide(false));

    const onTriggerKey = (event: KeyboardEvent) => {
      if (this.isDisabled.get()) return;
      const collection = this.#collection!;
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
        case "Enter":
        case " ":
          event.preventDefault();
          this.open = true;
          if (event.key === "ArrowUp") collection.last();
          return;
      }
      // Closed and typing: change the value directly, like a native select.
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const current = this.selectedOption;
        if (current) collection.setActive(current);
        if (collection.handleKey(event)) {
          const option = collection.active() as FwOption | null;
          if (option) this.#choose(option, false);
        }
      }
    };

    const onListKey = (event: KeyboardEvent) => {
      if (!this.prop<boolean>("open").peek()) return;
      const option = (event.target as Element | null)?.closest?.("fw-option, fw-list-item");
      if (!option) return;
      const collection = this.#collection!;
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          // Stop here, so an Escape that closes the list does not also
          // close the drawer or dialog the select is sitting in.
          event.stopPropagation();
          this.#close(true);
          return;
        case "Tab":
          // Focus goes back to the trigger first and Tab is left to run, so
          // it moves on to the next field rather than being swallowed by an
          // option that is about to be hidden.
          this.#close(true);
          return;
        case "Enter":
        case " ": {
          event.preventDefault();
          const active = collection.active() as FwOption | null;
          if (active) this.#choose(active, true);
          return;
        }
      }
      if (collection.handleKey(event)) event.preventDefault();
    };

    const onTriggerClick = (event: MouseEvent) => {
      if (this.isDisabled.get()) return;
      if ((event.target as Element | null)?.closest?.("[part~=clear]")) return;
      this.open = !this.prop<boolean>("open").peek();
    };

    const onOptionClick = (event: MouseEvent) => {
      const option = (event.target as Element | null)?.closest?.(
        "fw-option, fw-list-item",
      ) as FwOption | null;
      if (!option || option.disabled) return;
      this.#choose(option, true);
    };

    const onOptionHover = (event: PointerEvent) => {
      const option = (event.target as Element | null)?.closest?.(
        "fw-option, fw-list-item",
      ) as FwOption | null;
      if (option && !option.disabled) this.#collection?.setActive(option);
    };

    const onClear = (event: MouseEvent) => {
      event.stopPropagation();
      this.#commit("");
      trigger.focus();
    };

    const onLabelClick = () => trigger.focus();
    const onSlotChange = () => this.#slots.set(this.#slots.peek() + 1);

    // A press anywhere outside closes it. `composedPath` sees into shadow
    // roots, so a click inside the list — which is in this element's own
    // shadow root — is not mistaken for outside.
    const onOutside = (event: PointerEvent) => {
      if (!this.prop<boolean>("open").peek()) return;
      if (!event.composedPath().includes(this)) this.#close(false);
    };

    trigger.addEventListener("keydown", onTriggerKey);
    trigger.addEventListener("click", onTriggerClick);
    this.addEventListener("keydown", onListKey);
    this.addEventListener("click", onOptionClick);
    this.addEventListener("pointermove", onOptionHover);
    this.#clear.addEventListener("click", onClear);
    parts.label.addEventListener("click", onLabelClick);
    this.root.addEventListener("slotchange", onSlotChange);
    document.addEventListener("pointerdown", onOutside, true);
    scope.add(() => {
      trigger.removeEventListener("keydown", onTriggerKey);
      trigger.removeEventListener("click", onTriggerClick);
      this.removeEventListener("keydown", onListKey);
      this.removeEventListener("click", onOptionClick);
      this.removeEventListener("pointermove", onOptionHover);
      this.#clear.removeEventListener("click", onClear);
      parts.label.removeEventListener("click", onLabelClick);
      this.root.removeEventListener("slotchange", onSlotChange);
      document.removeEventListener("pointerdown", onOutside, true);
    });
  }

  #show(): void {
    const listbox = this.#listbox;
    if (hasPopover) {
      if (!listbox.matches(":popover-open")) listbox.showPopover();
    } else {
      listbox.hidden = false;
    }
    this.#anchored?.dispose();
    this.#anchored = anchorTo(this.#trigger, listbox, {
      placement: this.prop<Placement>("placement").peek() ?? "bottom-start",
      sameWidth: true,
      offset: 4,
    });
    const collection = this.#collection;
    if (collection) {
      const target = this.selectedOption ?? (collection.active() as FwOption | null);
      if (target && !target.disabled) {
        collection.setActive(null);
        collection.setActive(target);
      } else {
        collection.setActive(null);
        collection.first();
      }
    }
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
    for (const option of this.options) option.removeAttribute("data-active");
    if (wasOpen && emit) this.emit("fw-hide");
  }

  /** Close, optionally putting focus back on the trigger. */
  #close(returnFocus: boolean): void {
    if (!this.prop<boolean>("open").peek()) return;
    this.open = false;
    if (returnFocus) this.#trigger.focus();
  }

  #choose(option: FwOption, close: boolean): void {
    if (option.disabled) return;
    this.#commit(option.value);
    if (close) this.#close(true);
  }

  /** Set the value from a user action, telling listeners if it changed. */
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
      this.setValidity({ customError: true }, error, this.#trigger);
    } else if (this.prop<boolean>("required").peek() && value === "") {
      this.setValidity({ valueMissing: true }, "Please select an option.", this.#trigger);
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

  /** Open the list. */
  show(): void {
    if (!this.isDisabled.peek()) this.open = true;
  }

  /** Close the list and return focus to the select. */
  hide(): void {
    this.#close(true);
  }

  override focus(options?: FocusOptions): void {
    this.#trigger?.focus(options);
  }
}
