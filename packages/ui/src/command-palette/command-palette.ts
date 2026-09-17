import {
  createCollection,
  lockScroll,
  trapFocus,
  unlockScroll,
  type Collection,
  type FocusTrap,
  type Scope,
} from "@formwright/ui-core";
import { FwElement, nextId, type PropMap } from "../core/element.js";
import { LAYER_SLOT, enterModalLayer } from "../core/layers.js";
import { srOnly } from "../core/styles.js";
import type { FwCommand } from "./command.js";
import type { FwCommandGroup } from "./command-group.js";

/** Detail of `fw-select`. */
export interface CommandSelectDetail {
  value: string;
  command: FwCommand;
}

const styles =
  srOnly +
  /* css */ `
:host { display: contents; }
.dialog {
  box-sizing: border-box; padding: 0; border: 0; margin: 12vh auto auto;
  width: min(36rem, calc(100vw - 2rem)); max-width: none; max-height: min(28rem, 76vh);
  background: transparent; color: var(--_text); overflow: visible;
}
.dialog:not([open]) { display: none; }
.dialog::backdrop { background: var(--_backdrop); }
/* No showModal: sit on top by hand and dim the page with a shadow. */
.dialog.fallback {
  position: fixed; inset: 0; z-index: 1000; height: fit-content;
  box-shadow: 0 0 0 100vmax var(--_backdrop); border-radius: min(var(--_radius), 1rem);
}
.panel {
  display: flex; flex-direction: column; max-height: inherit;
  background: var(--_surface); border: 1px solid var(--_border);
  /* Capped so a pill-shaped theme still gets a panel, not a lozenge. */
  border-radius: min(var(--_radius), 1rem);
  box-shadow: var(--_shadow); overflow: hidden; font-family: var(--_font); font-size: var(--_text-size);
}
.search {
  flex: none; display: flex; align-items: center; gap: 0.625rem; padding: 0 1rem;
  border-bottom: 1px solid var(--_border); color: var(--_muted);
}
.search svg { flex: none; }
.input {
  flex: 1; min-width: 0; height: 3.25rem; padding: 0; border: 0; outline: none;
  background: transparent; font: inherit; font-size: 1rem; color: var(--_text);
}
.input::placeholder { color: var(--_muted); opacity: 1; }
.list {
  display: flex; flex-direction: column; min-height: 0;
  overflow: auto; overscroll-behavior: contain; padding: 0.375rem;
  scroll-padding-block: 0.375rem;
}
.list[hidden] { display: none; }
.empty { padding: 2rem 1rem; text-align: center; color: var(--_muted); }
::slotted([slot="footer"]) { flex: none; border-top: 1px solid var(--_border); }
`;

const ICON_SEARCH = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;

interface Hotkey {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

function isApple(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform ?? nav.platform ?? "");
}

/** "mod+k" → Meta+K on Apple platforms, Control+K elsewhere. */
export function parseHotkey(text: string | null | undefined): Hotkey | null {
  if (!text) return null;
  const parts = text
    .toLowerCase()
    .split("+")
    .map((p) => p.trim());
  const key = parts.pop();
  if (!key) return null;
  const hotkey: Hotkey = { key, ctrl: false, meta: false, alt: false, shift: false };
  for (const mod of parts) {
    if (mod === "mod") {
      if (isApple()) hotkey.meta = true;
      else hotkey.ctrl = true;
    } else if (mod === "ctrl" || mod === "control") hotkey.ctrl = true;
    else if (mod === "meta" || mod === "cmd" || mod === "command") hotkey.meta = true;
    else if (mod === "alt" || mod === "option") hotkey.alt = true;
    else if (mod === "shift") hotkey.shift = true;
    else return null;
  }
  return hotkey;
}

function matchesHotkey(event: KeyboardEvent, hotkey: Hotkey): boolean {
  if (
    event.ctrlKey !== hotkey.ctrl ||
    event.metaKey !== hotkey.meta ||
    event.altKey !== hotkey.alt ||
    event.shiftKey !== hotkey.shift
  ) {
    return false;
  }
  if (event.key.toLowerCase() === hotkey.key) return true;
  // Layout-independent fallback: Alt or a non-Latin layout changes `key`.
  if (/^[a-z]$/.test(hotkey.key)) return event.code === `Key${hotkey.key.toUpperCase()}`;
  if (/^[0-9]$/.test(hotkey.key)) return event.code === `Digit${hotkey.key}`;
  return false;
}

/**
 * How well a command matches: 0 label starts with the query, 1 a word in
 * the label does, 2 a keyword does, 3 the label contains it, 4 a keyword
 * contains it; -1 no match.
 */
function rankOf(command: FwCommand, query: string): number {
  const label = command.label.toLowerCase();
  const keywords = command.keywordList.map((k) => k.toLowerCase());
  if (label.startsWith(query)) return 0;
  if (label.split(/\s+/).some((word) => word.startsWith(query))) return 1;
  if (keywords.some((k) => k.startsWith(query))) return 2;
  if (label.includes(query)) return 3;
  if (keywords.some((k) => k.includes(query))) return 4;
  return -1;
}

/**
 * `<fw-command-palette>` — a modal search box that finds and runs commands.
 *
 * ```html
 * <fw-command-palette hotkey="mod+k">
 *   <fw-command-group heading="Members">
 *     <fw-command value="add-member" keywords="new, join" shortcut="⌘ M">Add member</fw-command>
 *     <fw-command value="find-member">Find member</fw-command>
 *   </fw-command-group>
 *   <fw-command value="logout">Log out</fw-command>
 * </fw-command-palette>
 * <script>
 *   palette.addEventListener("fw-select", (e) => run(e.detail.value));
 * </script>
 * ```
 *
 * Opens as a native modal `<dialog>` (the page behind is inert, and the
 * dialog sits in the top layer) from `hotkey` — `mod` is ⌘ on Apple
 * platforms and Ctrl elsewhere; `hotkey=""` disables it — or from `show()`
 * or the `open` attribute. Where `showModal` is missing it falls back to an
 * `open` dialog with a focus trap.
 *
 * Typing filters the commands case-insensitively by label and `keywords`,
 * ranking label prefix matches first; the best match is active. The search
 * field keeps focus throughout — the active command is pointed at with
 * `ariaActiveDescendantElement` where the browser has element reflection
 * (an id reference cannot cross into the page from the shadow root), and
 * always marked with `data-active` and highlighted.
 *
 * Keyboard: ArrowUp / ArrowDown move, Enter runs the active command, Escape
 * clears the search if there is one and closes if not. Clicking the
 * backdrop closes. Focus returns to wherever it was before opening.
 *
 * Ranking moves the matching commands (and groups) into rank order in the
 * page itself, not just on screen, so a screen reader browsing the list
 * meets them in the same order the arrow keys do. The authored order comes
 * back when the search is cleared or the palette closes. Commands and
 * groups should be direct children of the palette (commands of a group,
 * direct children of the group).
 *
 * Events: `fw-select` (detail `{ value, command }`, cancelable — cancel it
 * to keep the palette open), `fw-show`, `fw-hide`.
 * Slots: default (commands and groups), `empty` (no results), `footer`.
 * Parts: `dialog`, `panel`, `search`, `input`, `listbox`, `empty`.
 * Methods: `show()`, `hide()`, `toggle()`.
 */
export class FwCommandPalette extends FwElement {
  static override props: PropMap = {
    open: { type: "boolean", reflect: true },
    placeholder: { type: "string", default: "Type a command or search…" },
    hotkey: { type: "string", default: "mod+k" },
    emptyText: { type: "string", default: "No results" },
    label: { type: "string", default: "Command palette" },
  };
  static override styles = styles;

  declare open: boolean;
  declare placeholder: string;
  declare hotkey: string;
  declare emptyText: string;
  declare label: string;

  #dialog!: HTMLDialogElement;
  #panel!: HTMLElement;
  #input!: HTMLInputElement;
  #list!: HTMLElement;
  #empty!: HTMLElement;
  #emptyText!: HTMLElement;
  #collection: Collection | null = null;
  #trap: FocusTrap | null = null;
  #locked = false;
  #returnFocus: HTMLElement | null = null;
  #leaveLayer: (() => void) | null = null;
  #observer: MutationObserver | null = null;
  /** Authored position of each command and group, taken when a search starts. */
  #authored: WeakMap<Element, number> | null = null;
  /** Visible commands in the order they appear. */
  #visible: FwCommand[] = [];

  /** Every command, in document order. */
  get commands(): FwCommand[] {
    return [...this.querySelectorAll<FwCommand>("fw-command")];
  }

  protected render(root: ShadowRoot): void {
    const id = nextId("fw-command-palette");

    this.#dialog = document.createElement("dialog");
    this.#dialog.className = "dialog";
    this.#dialog.setAttribute("part", "dialog");

    this.#panel = document.createElement("div");
    this.#panel.className = "panel";
    this.#panel.setAttribute("part", "panel");

    const search = document.createElement("div");
    search.className = "search";
    search.setAttribute("part", "search");
    search.innerHTML = ICON_SEARCH;

    this.#input = document.createElement("input");
    this.#input.type = "text";
    this.#input.className = "input";
    this.#input.autocomplete = "off";
    this.#input.spellcheck = false;
    this.#input.setAttribute("part", "input");
    this.#input.setAttribute("role", "combobox");
    this.#input.setAttribute("aria-expanded", "true");
    this.#input.setAttribute("aria-autocomplete", "list");
    this.#input.setAttribute("aria-controls", `${id}-listbox`);
    search.append(this.#input);

    this.#list = document.createElement("div");
    this.#list.id = `${id}-listbox`;
    this.#list.className = "list";
    this.#list.setAttribute("part", "listbox");
    this.#list.setAttribute("role", "listbox");
    this.#list.setAttribute("aria-label", "Commands");
    this.#list.append(document.createElement("slot"));

    this.#empty = document.createElement("div");
    this.#empty.className = "empty";
    this.#empty.setAttribute("part", "empty");
    this.#empty.setAttribute("role", "status");
    const emptySlot = document.createElement("slot");
    emptySlot.name = "empty";
    this.#emptyText = document.createElement("span");
    emptySlot.append(this.#emptyText);
    this.#empty.append(emptySlot);
    this.#empty.hidden = true;

    const footer = document.createElement("slot");
    footer.name = "footer";

    this.#panel.append(search, this.#list, this.#empty, footer);
    // Toast regions move in here while the palette is open, so they stay
    // clickable instead of inert behind it.
    const layer = document.createElement("slot");
    layer.name = LAYER_SLOT;
    this.#dialog.append(this.#panel, layer);
    root.append(this.#dialog);
  }

  protected override connected(scope: Scope): void {
    const input = this.#input;
    const dialog = this.#dialog;

    this.#collection = createCollection({
      items: () => this.#visible,
      typeahead: false,
      isDisabled: (item) => item.hasAttribute("disabled"),
      onActiveChange: (item) => this.#markActive(item as FwCommand | null),
    });
    scope.add(() => {
      this.#collection?.dispose();
      this.#collection = null;
    });

    scope.bind(() => {
      input.placeholder = this.prop<string | null>("placeholder").get() ?? "";
    });
    scope.bind(() => {
      const label = this.prop<string | null>("label").get() || "Command palette";
      dialog.setAttribute("aria-label", label);
      input.setAttribute("aria-label", label);
    });
    scope.bind(() => {
      this.#emptyText.textContent = this.prop<string | null>("emptyText").get() ?? "";
    });

    scope.bind(() => {
      if (this.prop<boolean>("open").get()) this.#show();
      else this.#hide();
    });
    scope.add(() => this.#hide(false));

    // Commands added, removed, renamed or disabled while the palette is up.
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => {
        if (this.prop<boolean>("open").peek()) this.#filter(false);
      });
      this.#observer = observer;
      observer.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["keywords", "disabled", "value", "heading"],
      });
      scope.add(() => {
        observer.disconnect();
        this.#observer = null;
      });
    }

    const onHotkey = (event: KeyboardEvent) => {
      const hotkey = parseHotkey(this.prop<string | null>("hotkey").peek());
      if (!hotkey || event.defaultPrevented || !matchesHotkey(event, hotkey)) return;
      event.preventDefault();
      this.open = !this.prop<boolean>("open").peek();
    };

    const onSearch = () => this.#filter(true);

    const onInputKey = (event: KeyboardEvent) => {
      const collection = this.#collection;
      if (!collection || event.isComposing) return;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          collection.next();
          return;
        case "ArrowUp":
          event.preventDefault();
          collection.previous();
          return;
        case "Enter": {
          event.preventDefault();
          const active = collection.active() as FwCommand | null;
          if (active) this.#run(active);
          return;
        }
      }
    };

    // Escape is handled here for both the native dialog and the fallback;
    // cancelling the keydown stops the native dialog closing on its own.
    const onDialogKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      if (input.value !== "") {
        input.value = "";
        this.#filter(true);
      } else {
        this.#close();
      }
    };

    // Other close requests — the Android back gesture, for one.
    const onCancel = (event: Event) => {
      event.preventDefault();
      this.#close();
    };
    const onNativeClose = () => {
      if (this.prop<boolean>("open").peek()) this.open = false;
    };

    // The dialog's own box is only hit through the backdrop around the panel.
    const onDialogClick = (event: MouseEvent) => {
      if (event.target === dialog) this.#close();
    };

    const commandOf = (event: Event): FwCommand | null => {
      for (const node of event.composedPath()) {
        if (node instanceof Element && node.localName === "fw-command") return node as FwCommand;
        if (node === this) break;
      }
      return null;
    };
    const onCommandClick = (event: MouseEvent) => {
      const command = commandOf(event);
      if (command) this.#run(command);
    };
    const onCommandHover = (event: Event) => {
      const command = commandOf(event);
      if (command && !command.disabled) this.#collection?.setActive(command);
    };

    document.addEventListener("keydown", onHotkey);
    input.addEventListener("input", onSearch);
    input.addEventListener("keydown", onInputKey);
    dialog.addEventListener("keydown", onDialogKey);
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", onNativeClose);
    dialog.addEventListener("click", onDialogClick);
    this.addEventListener("click", onCommandClick);
    this.addEventListener("pointermove", onCommandHover);
    scope.add(() => {
      document.removeEventListener("keydown", onHotkey);
      input.removeEventListener("input", onSearch);
      input.removeEventListener("keydown", onInputKey);
      dialog.removeEventListener("keydown", onDialogKey);
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", onNativeClose);
      dialog.removeEventListener("click", onDialogClick);
      this.removeEventListener("click", onCommandClick);
      this.removeEventListener("pointermove", onCommandHover);
    });
  }

  /** Open the palette with an empty search. */
  show(): void {
    this.open = true;
  }

  /** Close the palette, returning focus to where it was. */
  hide(): void {
    this.#close();
  }

  toggle(): void {
    this.open = !this.prop<boolean>("open").peek();
  }

  #show(): void {
    const dialog = this.#dialog;
    if (dialog.hasAttribute("open")) return;

    const previous = document.activeElement;
    this.#returnFocus =
      previous instanceof HTMLElement && previous !== document.body ? previous : null;

    this.#input.value = "";
    this.#filter(true);

    if (typeof dialog.showModal === "function") {
      dialog.classList.remove("fallback");
      dialog.showModal();
    } else {
      dialog.classList.add("fallback");
      dialog.setAttribute("open", "");
      this.#trap = trapFocus(dialog);
    }
    if (!this.#locked) {
      lockScroll();
      this.#locked = true;
    }
    this.#input.focus({ preventScroll: true });
    this.#leaveLayer ??= enterModalLayer(this);
    this.emit("fw-show");
  }

  #hide(emit = true): void {
    const dialog = this.#dialog;
    const wasOpen = dialog.hasAttribute("open");
    if (wasOpen) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
    this.#trap?.release();
    this.#trap = null;
    if (this.#locked) {
      unlockScroll();
      this.#locked = false;
    }
    this.#leaveLayer?.();
    this.#leaveLayer = null;
    this.#collection?.setActive(null);
    // Leave the page's markup as it was written.
    this.#arrange(null);

    const previous = this.#returnFocus;
    this.#returnFocus = null;
    if (!wasOpen) return;
    // Only when still in the page and focus has not gone somewhere else.
    const active = document.activeElement;
    if (
      this.isConnected &&
      previous?.isConnected &&
      (active === this || active === document.body || active === null)
    ) {
      previous.focus({ preventScroll: true });
    }
    if (emit) this.emit("fw-hide");
  }

  #close(): void {
    if (this.prop<boolean>("open").peek()) this.open = false;
  }

  #run(command: FwCommand): void {
    if (command.disabled || command.hasAttribute("data-filtered")) return;
    const proceed = this.emit<CommandSelectDetail>(
      "fw-select",
      { value: command.commandValue, command },
      { cancelable: true },
    );
    if (proceed) this.#close();
  }

  #markActive(item: FwCommand | null): void {
    for (const command of this.commands) {
      const on = command === item;
      command.toggleAttribute("data-active", on);
      command.setAttribute("aria-selected", String(on));
    }
    // Element reflection crosses the shadow boundary; an id would not.
    if ("ariaActiveDescendantElement" in Element.prototype) {
      (
        this.#input as HTMLInputElement & { ariaActiveDescendantElement: Element | null }
      ).ariaActiveDescendantElement = item;
    }
    item?.scrollIntoView?.({ block: "nearest" });
  }

  /**
   * Show the commands that match the search, best first, and make the best
   * one active — or keep the active one when `resetActive` is false and it
   * is still visible.
   */
  #filter(resetActive: boolean): void {
    const query = this.#input.value.trim().toLowerCase();
    const commands = this.commands;
    const ranks = new Map<FwCommand, number>();

    for (const command of commands) {
      const rank = query === "" ? 0 : rankOf(command, query);
      command.toggleAttribute("data-filtered", rank < 0);
      if (rank >= 0) ranks.set(command, rank);
    }

    const groupRanks = new Map<Element, number>();
    for (const group of this.querySelectorAll<FwCommandGroup>("fw-command-group")) {
      const best = Math.min(
        ...[...group.querySelectorAll<FwCommand>("fw-command")].map(
          (c) => ranks.get(c) ?? Infinity,
        ),
      );
      group.toggleAttribute("data-filtered", !Number.isFinite(best));
      if (Number.isFinite(best)) groupRanks.set(group, best);
    }

    this.#arrange(query === "" ? null : (el) => ranks.get(el as FwCommand) ?? groupRanks.get(el));

    // The page order is now the ranked order.
    this.#visible = this.commands.filter((c) => ranks.has(c));

    const empty = this.#visible.length === 0;
    this.#empty.hidden = !empty;
    this.#list.hidden = empty;

    const collection = this.#collection;
    if (!collection) return;
    const current = collection.active() as FwCommand | null;
    if (!resetActive && current && this.#visible.includes(current) && !current.disabled) {
      this.#markActive(current);
      return;
    }
    collection.setActive(null);
    collection.first();
    if (!collection.active()) this.#markActive(null);
  }

  /**
   * Put commands and groups in rank order in the page — matches first, best
   * rank first, ties in authored order, non-matches after — or, with no
   * ranking, back in authored order.
   *
   * Moving the nodes rather than reordering them with CSS keeps the reading
   * order a screen reader browses in the same as what is on screen. Only
   * nodes out of place are moved, and the observer's records of our own
   * moves are dropped so they do not trigger another filter.
   */
  #arrange(rankOf: ((el: Element) => number | undefined) | null): void {
    if (!rankOf && !this.#authored) return;
    const isBlock = (el: Element) =>
      el.localName === "fw-command" || el.localName === "fw-command-group";
    const parents: Element[] = [this, ...this.querySelectorAll(":scope > fw-command-group")];

    if (rankOf && !this.#authored) {
      const authored = new WeakMap<Element, number>();
      for (const parent of parents) {
        [...parent.children].filter(isBlock).forEach((el, i) => authored.set(el, i));
      }
      this.#authored = authored;
    }
    const authored = this.#authored!;
    const indexOf = (el: Element) => authored.get(el) ?? Number.MAX_SAFE_INTEGER;

    for (const parent of parents) {
      const current = [...parent.children].filter(isBlock);
      const wanted = [...current].sort((a, b) => {
        if (rankOf) {
          const ra = rankOf(a) ?? Infinity;
          const rb = rankOf(b) ?? Infinity;
          if (ra !== rb) return ra - rb;
        }
        return indexOf(a) - indexOf(b);
      });
      if (wanted.every((el, i) => el === current[i])) continue;
      // Gathered where the last block was; other children (the slotted
      // empty text, the footer) are in their own slots and unaffected.
      const anchor = current[current.length - 1]!.nextSibling;
      for (const el of wanted) parent.insertBefore(el, anchor);
    }

    this.#observer?.takeRecords();
    if (!rankOf) this.#authored = null;
  }
}
