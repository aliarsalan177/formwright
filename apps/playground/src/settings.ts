/**
 * Settings Builder demo — an iOS-style settings app built entirely from Formwright.
 *
 *   a sidebar of top-level sections → the detail pane renders that section's
 *   SETTINGS SCHEMA as a form, plus rows that drill into SUB-SECTIONS
 *   (General → About → Legal). Each change PATCHes its own per-field endpoint;
 *   "Save all" PUTs the complete section payload.
 *
 * Schemas are local here (a "mock settings API"); in a real app they'd load from
 * your backend or be generated with `@formwright/ai`.
 */
import { Form, type FormSchema } from "@formwright/core";
import "@formwright/dom";
import { defineIconPicker } from "./components.js";
import "./styles.css";
import "./settings.css";

defineIconPicker();

interface Section {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly schema?: FormSchema;
  readonly children?: readonly Section[];
}

const SECTIONS: readonly Section[] = [
  {
    id: "general",
    title: "General",
    icon: "⚙️",
    schema: {
      id: "general",
      version: "1.0",
      title: "General",
      fields: [
        { id: "appName", type: "text", label: "Application name" },
        { id: "appIcon", type: "text", label: "App icon", widget: "icon" },
        {
          id: "language",
          type: "select",
          label: "Language",
          placeholder: "Choose…",
          options: [
            { label: "English", value: "en" },
            { label: "العربية", value: "ar" },
            { label: "Français", value: "fr" },
          ],
        },
        {
          id: "beta",
          type: "toggle",
          label: "Enable beta features",
          description: "Get early access to features still in development.",
          labelPosition: "start",
        },
      ],
    },
    children: [
      {
        id: "about",
        title: "About",
        icon: "ℹ️",
        schema: {
          id: "about",
          version: "1.0",
          title: "About",
          fields: [
            { id: "version", type: "paragraph", content: "Version 2.0.0 (build 1432)" },
            {
              id: "device",
              type: "paragraph",
              content: "Workspace: Acme · 42 members · 12 GB used",
            },
            { id: "sep", type: "separator" },
            {
              id: "autoUpdate",
              type: "toggle",
              label: "Automatic updates",
              description: "Install new versions as they ship.",
              labelPosition: "start",
            },
            {
              id: "channel",
              type: "select",
              label: "Update channel",
              placeholder: "Select…",
              options: [
                { label: "Stable", value: "stable" },
                { label: "Beta", value: "beta" },
              ],
            },
          ],
        },
        children: [
          {
            id: "legal",
            title: "Legal & Regulatory",
            icon: "§",
            schema: {
              id: "legal",
              version: "1.0",
              title: "Legal & Regulatory",
              fields: [
                {
                  id: "terms",
                  type: "paragraph",
                  content: "Terms of Service — last updated 2026-01-04.",
                },
                {
                  id: "privacy",
                  type: "paragraph",
                  content: "Privacy Policy — last updated 2026-01-04.",
                },
                {
                  id: "analytics",
                  type: "toggle",
                  label: "Share anonymous analytics",
                  description: "Help improve the product. No personal data is collected.",
                  labelPosition: "start",
                },
              ],
            },
          },
        ],
      },
      {
        id: "datetime",
        title: "Date & Time",
        icon: "🕐",
        schema: {
          id: "datetime",
          version: "1.0",
          title: "Date & Time",
          fields: [
            { id: "auto", type: "toggle", label: "Set automatically", labelPosition: "start" },
            {
              id: "timezone",
              type: "select",
              label: "Time zone",
              placeholder: "Select…",
              visibleWhen: { not: { var: "auto" } },
              options: [
                { label: "UTC", value: "UTC" },
                { label: "America/New_York", value: "America/New_York" },
                { label: "Asia/Dubai", value: "Asia/Dubai" },
              ],
            },
            { id: "h24", type: "toggle", label: "24-hour time", labelPosition: "start" },
          ],
        },
      },
    ],
  },
  {
    id: "appearance",
    title: "Appearance",
    icon: "🎨",
    schema: {
      id: "appearance",
      version: "1.0",
      title: "Appearance",
      fields: [
        {
          id: "theme",
          type: "radio",
          label: "Theme",
          options: [
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
            { label: "Auto", value: "auto" },
          ],
        },
        { id: "accent", type: "color", label: "Accent color", placeholder: "#6ea8fe" },
        {
          id: "brightness",
          type: "range",
          label: "Brightness",
          labelPosition: "start",
          props: { min: 0, max: 100, unit: "%" },
        },
        { id: "reduceMotion", type: "toggle", label: "Reduce motion", labelPosition: "start" },
      ],
    },
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: "🔔",
    schema: {
      id: "notifications",
      version: "1.0",
      title: "Notifications",
      fields: [
        { id: "emailHeading", type: "heading", label: "Email" },
        { id: "digest", type: "toggle", label: "Weekly digest", labelPosition: "start" },
        { id: "mentions", type: "toggle", label: "Mentions and replies", labelPosition: "start" },
        { id: "sep", type: "separator" },
        { id: "pushHeading", type: "heading", label: "Push" },
        { id: "push", type: "toggle", label: "Enable push", labelPosition: "start" },
        {
          id: "frequency",
          type: "select",
          label: "Frequency",
          placeholder: "Select…",
          visibleWhen: { var: "push" },
          options: [
            { label: "Real-time", value: "realtime" },
            { label: "Hourly", value: "hourly" },
            { label: "Daily", value: "daily" },
          ],
        },
      ],
    },
  },
  {
    id: "security",
    title: "Security",
    icon: "🔒",
    schema: {
      id: "security",
      version: "1.0",
      title: "Security",
      fields: [
        {
          id: "twofa",
          type: "toggle",
          label: "Two-factor authentication",
          description: "Require a one-time code at sign-in.",
          labelPosition: "start",
        },
        {
          id: "timeout",
          type: "number",
          label: "Session timeout (minutes)",
          validation: { kind: "number", min: 1, max: 240, messages: { max: "Max 240 minutes" } },
        },
        { id: "sep", type: "separator" },
        {
          id: "lastLogin",
          type: "paragraph",
          content: "Last login: 2 hours ago · Chrome on macOS",
        },
      ],
    },
  },
];

// Initial values per section id.
const values: Record<string, Record<string, unknown>> = {
  general: { appName: "Acme Console", language: "en", beta: false },
  about: { autoUpdate: true, channel: "stable" },
  legal: { analytics: false },
  datetime: { auto: true, h24: false },
  appearance: { theme: "dark", accent: "#6ea8fe", brightness: 80, reduceMotion: false },
  notifications: { digest: true, mentions: true, push: false, frequency: "daily" },
  security: { twofa: true, timeout: 30 },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const navEl = $<HTMLDivElement>("settings-nav");
const headEl = $<HTMLDivElement>("settings-head");
const panelEl = $<HTMLDivElement>("settings-panel");
const childrenEl = $<HTMLDivElement>("settings-children");
const savesEl = $<HTMLPreElement>("settings-saves");
const payloadEl = $<HTMLPreElement>("settings-payload");

let currentForm: Form | null = null;
let path: Section[] = [];
const saveLog: string[] = [];
// iOS-style instant apply (each change persists immediately, no Save button) vs.
// a manual "review & save" flow (changes buffer until you press Save all).
let instantApply = true;

function pushSave(line: string): void {
  saveLog.unshift(line);
  savesEl.textContent = saveLog.slice(0, 8).join("\n");
}

function pathString(): string {
  return path.map((s) => s.id).join("/");
}

function open(section: Section, stack: Section[]): void {
  path = stack;
  currentForm?.destroy();
  panelEl.replaceChildren();
  childrenEl.replaceChildren();

  // iOS-style nav bar: a leading Back button (chevron + parent title), a
  // centered title, and a trailing mode switch.
  headEl.replaceChildren();
  const bar = document.createElement("div");
  bar.className = "settings-navbar";

  const lead = document.createElement("div");
  lead.className = "settings-navbar-lead";
  if (path.length > 1) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "settings-back";
    const chev = document.createElement("span");
    chev.className = "settings-back-chev";
    chev.setAttribute("aria-hidden", "true");
    chev.textContent = "‹";
    const backLabel = document.createElement("span");
    backLabel.textContent = path[path.length - 2]!.title;
    back.append(chev, backLabel);
    back.addEventListener("click", () => open(path[path.length - 2]!, path.slice(0, -1)));
    lead.appendChild(back);
  }
  bar.appendChild(lead);

  const title = document.createElement("h2");
  title.className = "settings-title";
  title.textContent = section.title;
  bar.appendChild(title);

  // Trailing segmented control: Instant vs Manual save.
  const seg = document.createElement("div");
  seg.className = "settings-seg";
  for (const [label, instant] of [
    ["Instant", true],
    ["Save", false],
  ] as const) {
    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "settings-seg-opt" + (instantApply === instant ? " is-on" : "");
    opt.textContent = label;
    opt.title = instant
      ? "Apply each change immediately (iOS-style)"
      : "Buffer changes until you press Save all";
    opt.addEventListener("click", () => {
      if (instantApply === instant) return;
      instantApply = instant;
      open(section, stack); // re-render in the new mode
    });
    seg.appendChild(opt);
  }
  bar.appendChild(seg);
  headEl.appendChild(bar);

  if (section.schema) {
    const sectionPath = pathString();
    // `actions: []` suppresses the renderer's default Submit button — settings
    // apply instantly or via our own "Save all" control below, never both.
    const form = new Form({ ...section.schema, actions: [] }, values[section.id], {
      // "Save all" — PUT the complete section payload.
      send: async (payload) => {
        pushSave(`PUT  /api/settings/${sectionPath}  ←  ${JSON.stringify(payload)}`);
        return payload;
      },
    });
    form.on("change", (p) => {
      const { id, value } = p as { id: string; value: unknown };
      values[section.id] = form.values.peek() as Record<string, unknown>;
      payloadEl.textContent = JSON.stringify({ [section.id]: values[section.id] }, null, 2);
      // Instant mode: each change PATCHes its own endpoint right away. Manual
      // mode: changes only update the local payload until you press Save all.
      if (instantApply) {
        pushSave(`PATCH /api/settings/${sectionPath}/${id}  ←  ${JSON.stringify(value)}`);
      }
    });
    form.mount(panelEl);
    currentForm = form;
    payloadEl.textContent = JSON.stringify({ [section.id]: values[section.id] }, null, 2);

    if (instantApply) {
      const note = document.createElement("p");
      note.className = "settings-instant-note";
      note.textContent = "Changes apply instantly.";
      panelEl.appendChild(note);
    } else {
      const saveAll = document.createElement("button");
      saveAll.type = "button";
      saveAll.className = "settings-saveall";
      saveAll.textContent = "Save all";
      saveAll.addEventListener("click", () => void form.submit());
      panelEl.appendChild(saveAll);
    }
  }

  // Drill-down rows for sub-sections.
  for (const child of section.children ?? []) {
    const row = fillRow(document.createElement("button"), child);
    row.type = "button";
    row.className = "settings-childrow";
    row.addEventListener("click", () => open(child, [...path, child]));
    childrenEl.appendChild(row);
  }

  // Highlight the active top-level section.
  for (const btn of navEl.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset["section"] === path[0]!.id);
  }
}

function renderNav(): void {
  navEl.replaceChildren();
  for (const s of SECTIONS) {
    const btn = fillRow(document.createElement("button"), s);
    btn.dataset["section"] = s.id;
    btn.addEventListener("click", () => open(s, [s]));
    navEl.appendChild(btn);
  }
}

/** Fill a row button with an icon, title, and trailing chevron — as text, never
 * markup, so section data from an API can't inject HTML. */
function fillRow(btn: HTMLButtonElement, s: Section): HTMLButtonElement {
  const ico = document.createElement("span");
  ico.className = "s-ico";
  ico.textContent = s.icon;
  const label = document.createElement("span");
  label.textContent = s.title;
  const chev = document.createElement("span");
  chev.className = "s-chev";
  chev.textContent = "›";
  btn.append(ico, label, chev);
  return btn;
}

renderNav();
open(SECTIONS[0]!, [SECTIONS[0]!]);
