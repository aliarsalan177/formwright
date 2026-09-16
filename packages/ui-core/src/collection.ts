/**
 * Keyboard movement through a list of items.
 *
 * Menu, select, listbox, combobox, tabs, radio group, tree and command
 * palette all need the same thing: arrows move, Home and End jump, typing
 * a letter goes to the next item starting with it, disabled items are
 * stepped over, and the ends wrap. Written once here.
 *
 * Headless on purpose. It tracks which item is active and tells you when
 * that changes; whether "active" means real focus (roving tabindex, as in
 * tabs) or `aria-activedescendant` with focus left on a trigger (as in a
 * select) is the component's decision, not this module's.
 */

export type Orientation = "vertical" | "horizontal" | "both";

export interface CollectionOptions {
  /** The items, in order. Called on every key, so it can change freely. */
  items: () => readonly HTMLElement[];
  /** Up/down, left/right, or both. Default vertical. */
  orientation?: Orientation;
  /** Wrap from the last item to the first. Default true. */
  loop?: boolean;
  /** Jump to an item by typing the start of its text. Default true. */
  typeahead?: boolean;
  /** Text typeahead matches against. Default: trimmed textContent. */
  textOf?: (item: HTMLElement) => string;
  /** Skipped by movement and typeahead. Default: `disabled` or aria-disabled. */
  isDisabled?: (item: HTMLElement) => boolean;
  /** For horizontal lists, which way Right goes. Default ltr. */
  dir?: () => "ltr" | "rtl";
  /** Called whenever the active item changes. */
  onActiveChange?: (item: HTMLElement | null, index: number) => void;
}

export interface Collection {
  /** Handle a keydown. Returns true when it moved, so the caller can preventDefault. */
  handleKey(event: KeyboardEvent): boolean;
  active(): HTMLElement | null;
  activeIndex(): number;
  /** Make an item active by element or index; null clears. */
  setActive(target: HTMLElement | number | null): void;
  first(): void;
  last(): void;
  next(): void;
  previous(): void;
  /** Clears the typeahead timer. */
  dispose(): void;
}

function defaultDisabled(item: HTMLElement): boolean {
  return item.hasAttribute("disabled") || item.getAttribute("aria-disabled") === "true";
}

function defaultText(item: HTMLElement): string {
  return (item.getAttribute("label") ?? item.textContent ?? "").trim();
}

/** How long typed letters keep adding to one search. */
const TYPEAHEAD_MS = 500;

export function createCollection(options: CollectionOptions): Collection {
  const orientation = options.orientation ?? "vertical";
  const loop = options.loop ?? true;
  const isDisabled = options.isDisabled ?? defaultDisabled;
  const textOf = options.textOf ?? defaultText;

  let current: HTMLElement | null = null;
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const enabled = () => options.items().filter((item) => !isDisabled(item));

  const set = (item: HTMLElement | null) => {
    if (item === current) return;
    current = item;
    options.onActiveChange?.(item, item ? options.items().indexOf(item) : -1);
  };

  const step = (delta: 1 | -1) => {
    const list = enabled();
    if (list.length === 0) return;
    const at = current ? list.indexOf(current) : -1;
    if (at === -1) {
      set(delta === 1 ? list[0]! : list[list.length - 1]!);
      return;
    }
    let next = at + delta;
    if (next < 0 || next >= list.length) {
      if (!loop) return;
      next = (next + list.length) % list.length;
    }
    set(list[next]!);
  };

  const typeahead = (key: string) => {
    buffer += key.toLowerCase();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      buffer = "";
      timer = null;
    }, TYPEAHEAD_MS);

    const list = enabled();
    if (list.length === 0) return false;
    // Pressing the same letter repeatedly cycles through items starting
    // with it, which is how native selects behave.
    const repeated = buffer.length > 1 && [...buffer].every((c) => c === buffer[0]);
    const needle = repeated ? buffer[0]! : buffer;
    const start = current ? list.indexOf(current) + (repeated || buffer.length === 1 ? 1 : 0) : 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[(start + i) % list.length]!;
      if (textOf(item).toLowerCase().startsWith(needle)) {
        set(item);
        return true;
      }
    }
    return false;
  };

  return {
    handleKey(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return false;
      const rtl = options.dir?.() === "rtl";
      const vertical = orientation !== "horizontal";
      const horizontal = orientation !== "vertical";

      switch (event.key) {
        case "ArrowDown":
          if (!vertical) return false;
          step(1);
          return true;
        case "ArrowUp":
          if (!vertical) return false;
          step(-1);
          return true;
        case "ArrowRight":
          if (!horizontal) return false;
          step(rtl ? -1 : 1);
          return true;
        case "ArrowLeft":
          if (!horizontal) return false;
          step(rtl ? 1 : -1);
          return true;
        case "Home": {
          const list = enabled();
          if (list[0]) set(list[0]);
          return true;
        }
        case "End": {
          const list = enabled();
          const last = list[list.length - 1];
          if (last) set(last);
          return true;
        }
      }

      if (options.typeahead !== false && event.key.length === 1 && event.key !== " ") {
        return typeahead(event.key);
      }
      return false;
    },
    active: () => current,
    activeIndex: () => (current ? options.items().indexOf(current) : -1),
    setActive(target) {
      if (target === null) return set(null);
      const item = typeof target === "number" ? (options.items()[target] ?? null) : target;
      set(item && !isDisabled(item) ? item : current);
    },
    first() {
      const list = enabled();
      if (list[0]) set(list[0]);
    },
    last() {
      const list = enabled();
      const item = list[list.length - 1];
      if (item) set(item);
    },
    next: () => step(1),
    previous: () => step(-1),
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
      buffer = "";
    },
  };
}
