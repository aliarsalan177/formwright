import { Form, type FormSchema } from "@formwright/core";
import "@formwright/dom";
import type { StoryHost } from "../helpers/mount";

const SECTIONS = [
  {
    id: "header",
    title: "Header",
    icon: "▤",
    schema: {
      id: "header",
      version: "1.0",
      title: "Header settings",
      summary: false,
      actions: [],
      fields: [
        { id: "logo", type: "text", label: "Logo text" },
        { id: "accent", type: "color", label: "Accent color" },
        { id: "showSearch", type: "toggle", label: "Show search", labelPosition: "start" as const },
      ],
    } satisfies FormSchema,
  },
  {
    id: "hero",
    title: "Hero",
    icon: "▦",
    schema: {
      id: "hero",
      version: "1.0",
      title: "Hero banner",
      summary: false,
      actions: [],
      fields: [
        { id: "heading", type: "text", label: "Heading" },
        { id: "subheading", type: "textarea", label: "Subheading" },
        { id: "cta", type: "text", label: "Button label" },
      ],
    } satisfies FormSchema,
  },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function esc(v: unknown): string {
  return String(v ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

function heading(text: string, className = ""): HTMLHeadingElement {
  const h = document.createElement("h2");
  if (className) h.className = className;
  h.textContent = text;
  return h;
}

/** Mini theme builder — section nav, the section's settings form, and a live theme preview. */
export function mountThemeBuilderMini(): StoryHost {
  const settings: Record<SectionId, Record<string, unknown>> = {
    header: { logo: "Acme Store", accent: "#2563eb", showSearch: true },
    hero: { heading: "Summer collection", subheading: "New arrivals every week.", cta: "Shop now" },
  };

  let currentForm: Form | null = null;

  const wrap = document.createElement("div") as StoryHost;
  wrap.className = "builder-mini";
  const layout = document.createElement("div");
  layout.className = "builder";

  const rail = document.createElement("aside");
  rail.className = "builder-rail";
  const nav = document.createElement("div");
  nav.className = "builder-nav";
  rail.append(heading("Sections"), nav);

  const settingsCol = document.createElement("section");
  settingsCol.className = "panel builder-settings";
  const panel = document.createElement("div");
  panel.className = "form-host";
  settingsCol.append(heading("Settings"), panel);

  const stage = document.createElement("section");
  stage.className = "builder-stage";
  const preview = document.createElement("div");
  preview.className = "builder-preview";
  stage.append(heading("Live preview", "stage-title"), preview);

  function renderPreview(): void {
    const h = settings.header;
    const hero = settings.hero;
    preview.style.setProperty("--t-accent", esc(h.accent) || "#2563eb");
    preview.innerHTML = `
      <header class="t-header">
        <strong class="t-logo">${esc(h.logo) || "Store"}</strong>
        ${h.showSearch ? '<input class="t-search" placeholder="Search…" aria-label="Search" />' : ""}
      </header>
      <section class="t-hero">
        <h1>${esc(hero.heading) || "Welcome"}</h1>
        <p>${esc(hero.subheading)}</p>
        ${hero.cta ? `<button type="button" class="t-cta">${esc(hero.cta)}</button>` : ""}
      </section>`;
  }

  function openSection(id: SectionId): void {
    currentForm?.destroy();
    panel.replaceChildren();
    const section = SECTIONS.find((s) => s.id === id)!;
    for (const btn of nav.querySelectorAll("button")) {
      btn.classList.toggle("active", btn.dataset.section === id);
    }
    const form = new Form(section.schema, settings[id], { dom: { customStyles: true } });
    form.on("change", () => {
      settings[id] = form.values.peek() as Record<string, unknown>;
      renderPreview();
    });
    form.mount(panel);
    currentForm = form;
    renderPreview();
  }

  for (const s of SECTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.section = s.id;
    const ico = document.createElement("span");
    ico.className = "ico";
    ico.setAttribute("aria-hidden", "true");
    ico.textContent = s.icon;
    btn.append(ico, s.title);
    btn.addEventListener("click", () => openSection(s.id));
    nav.append(btn);
  }

  layout.append(rail, settingsCol, stage);
  wrap.append(layout);
  openSection("header");

  wrap.__storyDispose = () => currentForm?.destroy();
  return wrap;
}
