/**
 * Theme / Settings Builder demo — a Shopify/Magento-style page builder built
 * entirely from Formwright forms.
 *
 *   nav rail of sections → selecting one loads that section's SETTINGS SCHEMA
 *   → it renders as a Formwright form → every change drives a LIVE THEME PREVIEW
 *   built from the combined payload.
 *
 * Section schemas here are local (a "mock store API"); in a real app they'd come
 * from your store URL or be generated on the fly with `@formwright/ai`.
 */
import { Form, type FormSchema } from "@formwright/core";
import "@formwright/dom"; // registers the DOM renderer
import "./styles.css";
import "./builder.css";

type SectionId = "header" | "hero" | "products" | "footer";

interface Section {
  readonly id: SectionId;
  readonly title: string;
  readonly icon: string;
  readonly schema: FormSchema;
}

const SECTIONS: readonly Section[] = [
  {
    id: "header",
    title: "Header",
    icon: "▤",
    schema: {
      id: "header",
      version: "1.0",
      title: "Header settings",
      fields: [
        { id: "logo", type: "text", label: "Logo text", tooltip: "Shown at the top-left" },
        { id: "accent", type: "color", label: "Accent color", placeholder: "#6ea8fe" },
        { id: "showSearch", type: "toggle", label: "Show search bar", labelPosition: "start" },
        {
          id: "nav",
          type: "collection",
          label: "Navigation links",
          layout: "cards",
          itemLabel: "Link",
          addLabel: "+ Add link",
          minItems: 1,
          maxItems: 5,
          fields: [
            { id: "label", type: "text", label: "Label" },
            { id: "url", type: "text", label: "URL", placeholder: "/shop" },
          ],
        },
      ],
    },
  },
  {
    id: "hero",
    title: "Hero banner",
    icon: "🖼",
    schema: {
      id: "hero",
      version: "1.0",
      title: "Hero banner",
      fields: [
        { id: "heading", type: "text", label: "Heading" },
        { id: "subheading", type: "textarea", label: "Subheading" },
        { id: "cta", type: "text", label: "Button label" },
        {
          id: "align",
          type: "radio",
          label: "Text alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
        },
      ],
    },
  },
  {
    id: "products",
    title: "Products",
    icon: "🛍",
    schema: {
      id: "products",
      version: "1.0",
      title: "Product grid",
      fields: [
        { id: "title", type: "text", label: "Section title" },
        {
          id: "source",
          type: "select",
          label: "Source",
          placeholder: "Choose…",
          options: [
            { label: "Featured", value: "featured" },
            { label: "New arrivals", value: "new" },
            { label: "On sale", value: "sale" },
          ],
        },
        {
          id: "columns",
          type: "number",
          label: "Columns",
          validation: { kind: "number", min: 1, max: 4 },
        },
        {
          id: "count",
          type: "number",
          label: "How many",
          validation: { kind: "number", min: 1, max: 8 },
        },
      ],
    },
  },
  {
    id: "footer",
    title: "Footer",
    icon: "▥",
    schema: {
      id: "footer",
      version: "1.0",
      title: "Footer",
      fields: [
        { id: "text", type: "textarea", label: "Footer text" },
        { id: "showSocial", type: "toggle", label: "Show social links", labelPosition: "start" },
      ],
    },
  },
];

type Values = Record<string, unknown>;

// The theme's current settings — this is the "payload" that drives the preview.
const settings: Record<SectionId, Values> = {
  header: {
    logo: "ACME",
    accent: "#6ea8fe",
    showSearch: true,
    nav: [
      { label: "Shop", url: "/shop" },
      { label: "About", url: "/about" },
    ],
  },
  hero: {
    heading: "Summer Sale",
    subheading: "Up to 50% off everything.",
    cta: "Shop now",
    align: "center",
  },
  products: { title: "Featured products", source: "featured", columns: 3, count: 6 },
  footer: { text: "© 2026 ACME, Inc. All rights reserved.", showSocial: true },
};

const MOCK_PRODUCTS = [
  { name: "Runner Sneakers", price: 79, emoji: "👟", tag: "sale" },
  { name: "Canvas Tote", price: 29, emoji: "👜", tag: "new" },
  { name: "Aviator Shades", price: 119, emoji: "🕶", tag: "featured" },
  { name: "Wool Beanie", price: 24, emoji: "🧢", tag: "new" },
  { name: "Leather Wallet", price: 49, emoji: "👛", tag: "sale" },
  { name: "Sport Watch", price: 199, emoji: "⌚", tag: "featured" },
  { name: "Hoodie", price: 59, emoji: "🧥", tag: "featured" },
  { name: "Trail Backpack", price: 89, emoji: "🎒", tag: "new" },
];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const navEl = $<HTMLDivElement>("builder-nav");
const panelEl = $<HTMLDivElement>("builder-panel");
const previewEl = $<HTMLDivElement>("builder-preview");
const payloadEl = $<HTMLPreElement>("builder-payload");

let currentForm: Form | null = null;
let activeId: SectionId = "header";

function openSection(id: SectionId): void {
  activeId = id;
  const section = SECTIONS.find((s) => s.id === id)!;
  currentForm?.destroy();
  panelEl.replaceChildren();

  // A Formwright form IS the settings panel. Each change updates the theme live.
  const form = new Form(section.schema, settings[id], { dom: { customStyles: true } });
  form.on("change", () => {
    settings[id] = form.values.peek() as Values;
    renderPreview();
  });
  form.mount(panelEl);
  currentForm = form;

  for (const btn of navEl.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset["section"] === id);
  }
}

function renderNav(): void {
  navEl.replaceChildren();
  for (const s of SECTIONS) {
    const btn = document.createElement("button");
    btn.dataset["section"] = s.id;
    btn.innerHTML = `<span class="ico">${s.icon}</span>${s.title}`;
    btn.addEventListener("click", () => openSection(s.id));
    navEl.appendChild(btn);
  }
}

function esc(v: unknown): string {
  return String(v ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

function renderPreview(): void {
  const h = settings.header;
  const hero = settings.hero;
  const p = settings.products;
  const f = settings.footer;
  const accent = esc(h["accent"]) || "#6ea8fe";

  const nav = (h["nav"] as Array<Record<string, unknown>> | undefined) ?? [];
  const navHtml = nav.map((n) => `<a href="#">${esc(n["label"])}</a>`).join("");

  const source = String(p["source"] ?? "featured");
  const count = Math.max(1, Number(p["count"]) || 6);
  const columns = Math.min(4, Math.max(1, Number(p["columns"]) || 3));
  const items = MOCK_PRODUCTS.filter((x) => source === "featured" || x.tag === source).slice(
    0,
    count,
  );
  const productsHtml = items
    .map(
      (x) => `<div class="t-card"><div class="t-emoji">${x.emoji}</div>
        <div class="t-name">${esc(x.name)}</div><div class="t-price">$${x.price}</div></div>`,
    )
    .join("");

  previewEl.style.setProperty("--t-accent", accent);
  previewEl.innerHTML = `
    <header class="t-header">
      <strong class="t-logo">${esc(h["logo"]) || "Store"}</strong>
      <nav class="t-nav">${navHtml}</nav>
      ${h["showSearch"] ? '<input class="t-search" placeholder="Search…" />' : ""}
    </header>
    <section class="t-hero" style="text-align:${esc(hero["align"]) || "center"}">
      <h1>${esc(hero["heading"]) || "Welcome"}</h1>
      <p>${esc(hero["subheading"])}</p>
      ${hero["cta"] ? `<button class="t-cta">${esc(hero["cta"])}</button>` : ""}
    </section>
    <section class="t-products">
      <h2>${esc(p["title"]) || "Products"}</h2>
      <div class="t-grid" style="grid-template-columns:repeat(${columns},1fr)">${productsHtml}</div>
    </section>
    <footer class="t-footer">
      <span>${esc(f["text"])}</span>
      ${f["showSocial"] ? '<span class="t-social">𝕏 · ⓕ · ◎</span>' : ""}
    </footer>`;

  payloadEl.textContent = JSON.stringify(settings, null, 2);
}

// Boot.
renderNav();
openSection("header");
renderPreview();
