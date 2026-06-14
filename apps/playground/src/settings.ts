/**
 * Settings Builder demo — an iPad-style settings app built entirely from Formwright.
 *
 *   a sidebar of sections (General, Appearance, …) → selecting one loads that
 *   section's SETTINGS SCHEMA → it renders as a Formwright form on the right →
 *   each change updates a single payload (each section could just as well POST to
 *   its own standalone API). "General" nests more settings (a Region group) and
 *   shows static data (account info).
 *
 * The schemas are local here (a "mock settings API"); in a real app they'd load
 * from your backend or be generated with `@formwright/ai`.
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
  readonly schema: FormSchema;
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
        // "General inside it, more settings" — a nested group of region settings.
        {
          id: "region",
          type: "group",
          label: "Region",
          fields: [
            {
              id: "country",
              type: "select",
              label: "Country",
              placeholder: "Select…",
              options: [
                { label: "United States", value: "US" },
                { label: "United Kingdom", value: "UK" },
                { label: "United Arab Emirates", value: "AE" },
              ],
            },
            {
              id: "currency",
              type: "select",
              label: "Currency",
              placeholder: "Select…",
              options: [
                { label: "USD ($)", value: "USD" },
                { label: "GBP (£)", value: "GBP" },
                { label: "AED (د.إ)", value: "AED" },
              ],
            },
          ],
        },
        { id: "sep", type: "separator" },
        { id: "acctHeading", type: "heading", label: "Account" },
        // Static, read-only data — presentational, never in the payload.
        {
          id: "acctInfo",
          type: "paragraph",
          content: "Signed in as admin@acme.com · Plan: Pro · Member since 2024",
        },
        { id: "beta", type: "toggle", label: "Enable beta features", labelPosition: "start" },
      ],
    },
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
          id: "density",
          type: "select",
          label: "Density",
          placeholder: "Select…",
          options: [
            { label: "Comfortable", value: "comfortable" },
            { label: "Compact", value: "compact" },
          ],
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
        { id: "twofa", type: "toggle", label: "Two-factor authentication", labelPosition: "start" },
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
          content: "Last login: 2 hours ago · Chrome on macOS · 102.x.x.x",
        },
      ],
    },
  },
  {
    id: "billing",
    title: "Billing",
    icon: "💳",
    schema: {
      id: "billing",
      version: "1.0",
      title: "Billing",
      fields: [
        {
          id: "plan",
          type: "select",
          label: "Plan",
          placeholder: "Select…",
          options: [
            { label: "Free", value: "free" },
            { label: "Pro — $29/mo", value: "pro" },
            { label: "Enterprise", value: "enterprise" },
          ],
        },
        {
          id: "usage",
          type: "paragraph",
          content: "This month: 12,430 / 50,000 API calls · $29.00 due Jun 30",
        },
        {
          id: "billingEmail",
          type: "text",
          label: "Billing email",
          slots: { start: "✉" },
          validation: { kind: "string", format: "email" },
        },
        { id: "autoRenew", type: "toggle", label: "Auto-renew", labelPosition: "start" },
      ],
    },
  },
];

type Values = Record<string, unknown>;

const settings: Record<string, Values> = {
  general: {
    appName: "Acme Console",
    language: "en",
    region: { country: "US", currency: "USD" },
    beta: false,
  },
  appearance: { theme: "dark", accent: "#6ea8fe", density: "comfortable", reduceMotion: false },
  notifications: { digest: true, mentions: true, push: false, frequency: "daily" },
  security: { twofa: true, timeout: 30 },
  billing: { plan: "pro", billingEmail: "billing@acme.com", autoRenew: true },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const navEl = $<HTMLDivElement>("settings-nav");
const panelEl = $<HTMLDivElement>("settings-panel");
const payloadEl = $<HTMLPreElement>("settings-payload");

let currentForm: Form | null = null;

function openSection(id: string): void {
  const section = SECTIONS.find((s) => s.id === id)!;
  currentForm?.destroy();
  panelEl.replaceChildren();

  const form = new Form(section.schema, settings[id]);
  form.on("change", () => {
    settings[id] = form.values.peek() as Values;
    payloadEl.textContent = JSON.stringify({ [id]: settings[id] }, null, 2);
  });
  form.mount(panelEl);
  currentForm = form;
  payloadEl.textContent = JSON.stringify({ [id]: settings[id] }, null, 2);

  for (const btn of navEl.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset["section"] === id);
  }
}

function renderNav(): void {
  navEl.replaceChildren();
  for (const s of SECTIONS) {
    const btn = document.createElement("button");
    btn.dataset["section"] = s.id;
    btn.innerHTML = `<span class="s-ico">${s.icon}</span><span>${s.title}</span><span class="s-chev">›</span>`;
    btn.addEventListener("click", () => openSection(s.id));
    navEl.appendChild(btn);
  }
}

renderNav();
openSection("general");
