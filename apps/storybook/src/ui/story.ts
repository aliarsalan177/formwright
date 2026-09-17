/**
 * Helpers for the `@formwright/ui` stories: a canvas to render into, args
 * turned into attributes, and an on-canvas event log so what a component
 * emits is visible without opening the Actions panel.
 */
import "@formwright/ui";

export type StoryHost = HTMLElement & { __storyDispose?: () => void };

export interface CanvasOptions {
  /** Max width of the content column. Default 32rem. */
  width?: string;
  /** Centre the content vertically and horizontally, for floating things. */
  center?: boolean;
  /** Short explanation shown above the example. */
  note?: string;
}

/** A padded canvas holding `html`. */
export function canvas(html: string, options: CanvasOptions = {}): StoryHost {
  const host = document.createElement("div") as StoryHost;
  host.className = "sb-ui" + (options.center ? " sb-ui--center" : "");
  host.style.setProperty("--sb-ui-width", options.width ?? "32rem");
  const note = options.note ? `<p class="sb-ui-note">${options.note}</p>` : "";
  host.innerHTML = `${note}<div class="sb-ui-body">${html}</div>`;
  return host;
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Args → an attribute string. `true` is a bare attribute; `false`, `null`,
 * `undefined` and `""` are left out; everything else is quoted. Keys are
 * camelCase in args and kebab-case in HTML.
 */
export function attrs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .flatMap(([key, value]) => {
      if (value === false || value === null || value === undefined || value === "") return [];
      if (value === true) return [kebab(key)];
      return [`${kebab(key)}="${escape(String(value))}"`];
    })
    .join(" ");
}

/**
 * Append a live log of `events` fired inside `host` (they bubble and are
 * composed). Details are shown as JSON; element values are summarised.
 */
export function logEvents(host: StoryHost, events: string[]): StoryHost {
  const log = document.createElement("pre");
  log.className = "sb-ui-log";
  log.textContent = "Events will appear here.";
  host.append(log);
  const lines: string[] = [];
  const summarise = (_key: string, value: unknown) =>
    value instanceof Element ? `<${value.localName}>` : value;
  const onEvent = (event: Event) => {
    const target = event.target as HTMLElement & { value?: unknown };
    const detail = event instanceof CustomEvent && event.detail !== null ? event.detail : undefined;
    const value = "value" in target ? target.value : undefined;
    const parts = [`${event.type} on <${target.localName}>`];
    if (detail !== undefined) parts.push(`detail ${JSON.stringify(detail, summarise)}`);
    else if (value !== undefined) parts.push(`value ${JSON.stringify(value)}`);
    lines.unshift(parts.join(" · "));
    log.textContent = lines.slice(0, 8).join("\n");
  };
  for (const type of events) host.addEventListener(type, onEvent);
  return host;
}
