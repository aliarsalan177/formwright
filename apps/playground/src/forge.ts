/**
 * Formwright Forge — a drag-and-drop visual form builder.
 *
 * Drag field types from the palette onto the canvas, reorder them, arrange two
 * side-by-side (½ width = `colSpan: 6` on the 12-col grid), and edit each
 * field in the inspector. The builder's only state is a `FieldSchema[]`; the
 * live preview is rendered by the very same `@formwright/dom` runtime your app
 * ships, so what you design renders identically. "Export schema" gives you the
 * exact JSON to drop into `new Form(schema)`.
 */
import { Form, type FieldSchema, type FieldType, type FormSchema } from "@formwright/core";
import "@formwright/dom";
import "./styles.css";
import "./forge.css";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// ---- Palette ---------------------------------------------------------------

interface PaletteItem {
  type: FieldType;
  label: string;
  /** Seed schema for a freshly-dropped field of this type. */
  seed: () => Record<string, unknown>;
}

const TEXTISH = (kind: "string" | "number" = "string") => ({ validation: { kind } });

const PALETTE: PaletteItem[] = [
  { type: "text", label: "Text", seed: () => ({ type: "text", label: "Text", ...TEXTISH() }) },
  {
    type: "email",
    label: "Email",
    seed: () => ({
      type: "email",
      label: "Email",
      validation: { kind: "string", format: "email" },
    }),
  },
  {
    type: "number",
    label: "Number",
    seed: () => ({ type: "number", label: "Number", ...TEXTISH("number") }),
  },
  {
    type: "textarea",
    label: "Textarea",
    seed: () => ({ type: "textarea", label: "Message", ...TEXTISH() }),
  },
  {
    type: "select",
    label: "Select",
    seed: () => ({
      type: "select",
      label: "Choose one",
      options: [
        { label: "Option A", value: "a" },
        { label: "Option B", value: "b" },
      ],
    }),
  },
  {
    type: "radio",
    label: "Radio",
    seed: () => ({
      type: "radio",
      label: "Pick one",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    }),
  },
  { type: "checkbox", label: "Checkbox", seed: () => ({ type: "checkbox", label: "I agree" }) },
  { type: "toggle", label: "Toggle", seed: () => ({ type: "toggle", label: "Enabled" }) },
  {
    type: "color",
    label: "Color",
    seed: () => ({ type: "color", label: "Color", defaultValue: "#6ea8fe" }),
  },
  {
    type: "range",
    label: "Slider",
    seed: () => ({
      type: "range",
      label: "Brightness",
      defaultValue: 50,
      props: { min: 0, max: 100, unit: "%" },
    }),
  },
  { type: "date", label: "Date", seed: () => ({ type: "date", label: "Date" }) },
  { type: "datetime", label: "Date + time", seed: () => ({ type: "datetime", label: "When" }) },
  { type: "file", label: "File", seed: () => ({ type: "file", label: "Attachment" }) },
  {
    type: "heading",
    label: "Heading",
    seed: () => ({ type: "heading", content: "Section title" }),
  },
  {
    type: "paragraph",
    label: "Paragraph",
    seed: () => ({ type: "paragraph", content: "Helpful description text." }),
  },
  { type: "separator", label: "Separator", seed: () => ({ type: "separator" }) },
];

const PRESENTATIONAL = new Set<FieldType>(["heading", "paragraph", "separator"]);

// ---- State -----------------------------------------------------------------

let fields: FieldSchema[] = [];
let selectedId: string | null = null;
let seq = 0;

const newId = (type: FieldType): string => `${String(type)}_${++seq}`;

function buildSchema(): FormSchema {
  return { id: "forge", version: "1.0", title: "Untitled form", fields };
}

// ---- Render: canvas --------------------------------------------------------

const canvasEl = $<HTMLDivElement>("forge-canvas");

function fieldSummary(f: FieldSchema): string {
  if (PRESENTATIONAL.has(f.type)) return String(f.content ?? f.type);
  return String(f.label ?? f.id);
}

function renderCanvas(): void {
  canvasEl.replaceChildren();
  if (fields.length === 0) {
    const empty = document.createElement("div");
    empty.className = "forge-empty";
    empty.textContent = "Drag a field here to start building.";
    canvasEl.append(empty);
    return;
  }

  for (const f of fields) {
    const card = document.createElement("div");
    card.className = "forge-card";
    card.dataset.id = f.id;
    card.draggable = true;
    if (f.id === selectedId) card.classList.add("is-selected");
    if (f.colSpan === 6) card.classList.add("is-half");

    const head = document.createElement("div");
    head.className = "forge-card-head";
    const title = document.createElement("span");
    title.className = "forge-card-title";
    title.textContent = fieldSummary(f);
    const badge = document.createElement("span");
    badge.className = "forge-card-type";
    badge.textContent = String(f.type);
    head.append(title, badge);

    const actions = document.createElement("div");
    actions.className = "forge-card-actions";

    if (!PRESENTATIONAL.has(f.type)) {
      const half = document.createElement("button");
      half.type = "button";
      half.className = "forge-chip" + (f.colSpan === 6 ? " is-on" : "");
      half.textContent = "½";
      half.title = "Half width (side-by-side)";
      half.addEventListener("click", (e) => {
        e.stopPropagation();
        patchField(f.id, { colSpan: f.colSpan === 6 ? undefined : 6 });
      });
      actions.append(half);
    }

    const del = document.createElement("button");
    del.type = "button";
    del.className = "forge-chip forge-chip-danger";
    del.textContent = "✕";
    del.title = "Delete field";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      removeField(f.id);
    });
    actions.append(del);

    card.append(head, actions);
    card.addEventListener("click", () => select(f.id));

    // Reorder via native drag-and-drop.
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("application/x-forge-move", f.id);
      card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("is-dragging"));

    canvasEl.append(card);
  }
}

// ---- Drag-and-drop ---------------------------------------------------------

function cardAfterPoint(y: number): HTMLElement | null {
  const cards = [...canvasEl.querySelectorAll<HTMLElement>(".forge-card:not(.is-dragging)")];
  for (const card of cards) {
    const box = card.getBoundingClientRect();
    if (y < box.top + box.height / 2) return card;
  }
  return null;
}

canvasEl.addEventListener("dragover", (e) => {
  e.preventDefault();
  canvasEl.classList.add("is-drop");
});
canvasEl.addEventListener("dragleave", (e) => {
  if (!canvasEl.contains(e.relatedTarget as Node)) canvasEl.classList.remove("is-drop");
});
canvasEl.addEventListener("drop", (e) => {
  e.preventDefault();
  canvasEl.classList.remove("is-drop");

  const moveId = e.dataTransfer?.getData("application/x-forge-move");
  const addType = e.dataTransfer?.getData("application/x-forge-add") as FieldType | undefined;
  const before = cardAfterPoint(e.clientY);
  const index = before ? fields.findIndex((f) => f.id === before.dataset.id) : fields.length;

  if (moveId) {
    const from = fields.findIndex((f) => f.id === moveId);
    if (from < 0) return;
    const [moved] = fields.splice(from, 1);
    if (!moved) return;
    const to = before ? fields.findIndex((f) => f.id === before.dataset.id) : fields.length;
    fields.splice(to, 0, moved);
    sync();
  } else if (addType) {
    addField(addType, index);
  }
});

// ---- Mutations -------------------------------------------------------------

function addField(type: FieldType, index = fields.length): void {
  const item = PALETTE.find((p) => p.type === type);
  if (!item) return;
  const field = { id: newId(type), ...item.seed() } as unknown as FieldSchema;
  fields.splice(index, 0, field);
  selectedId = field.id;
  sync();
}

function removeField(id: string): void {
  fields = fields.filter((f) => f.id !== id);
  if (selectedId === id) selectedId = null;
  sync();
}

// `opts.inspector === false` skips rebuilding the inspector — used by text
// inputs so editing a field doesn't destroy the very <input> being typed in
// (which would steal focus after each keystroke).
function patchField(
  id: string,
  partial: Record<string, unknown>,
  opts: { inspector?: boolean } = {},
): void {
  fields = fields.map((f) => {
    if (f.id !== id) return f;
    const next = { ...f, ...partial } as Record<string, unknown>;
    // Strip keys explicitly cleared (undefined) so the JSON stays clean.
    for (const [k, v] of Object.entries(partial)) if (v === undefined) delete next[k];
    return next as unknown as FieldSchema;
  });
  sync(opts);
}

function select(id: string): void {
  selectedId = id;
  sync();
}

// ---- Inspector -------------------------------------------------------------

const inspectEl = $<HTMLDivElement>("forge-inspect");

function field(id: string | null): FieldSchema | undefined {
  return fields.find((f) => f.id === id);
}

function row(label: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "forge-row";
  const span = document.createElement("span");
  span.textContent = label;
  wrap.append(span, control);
  return wrap;
}

function textInput(value: string, on: (v: string) => void, placeholder = ""): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = placeholder;
  input.addEventListener("input", () => on(input.value));
  return input;
}

function renderInspector(): void {
  inspectEl.replaceChildren();
  const f = field(selectedId);
  if (!f) {
    const hint = document.createElement("p");
    hint.className = "forge-hint";
    hint.textContent = "Select a field on the canvas to edit it.";
    inspectEl.append(hint);
    return;
  }

  // Presentational fields edit their `content`.
  if (PRESENTATIONAL.has(f.type)) {
    if (f.type !== "separator") {
      inspectEl.append(
        row(
          "Content",
          textInput(String(f.content ?? ""), (v) =>
            patchField(f.id, { content: v }, { inspector: false }),
          ),
        ),
      );
    } else {
      const note = document.createElement("p");
      note.className = "forge-hint";
      note.textContent = "A separator has no options.";
      inspectEl.append(note);
    }
    appendIdRow(f);
    return;
  }

  inspectEl.append(
    row(
      "Label",
      textInput(String(f.label ?? ""), (v) => patchField(f.id, { label: v }, { inspector: false })),
    ),
    row(
      "Placeholder",
      textInput(String(f.placeholder ?? ""), (v) =>
        patchField(f.id, { placeholder: v || undefined }, { inspector: false }),
      ),
    ),
    row(
      "Description",
      textInput(String(f.description ?? ""), (v) =>
        patchField(f.id, { description: v || undefined }, { inspector: false }),
      ),
    ),
  );

  // Required toggle.
  const reqWrap = document.createElement("label");
  reqWrap.className = "forge-row forge-row-inline";
  const req = document.createElement("input");
  req.type = "checkbox";
  req.checked = Boolean(f.validation?.required);
  req.addEventListener("change", () => {
    const kind = f.validation?.kind ?? (f.type === "number" ? "number" : "string");
    patchField(f.id, { validation: { ...f.validation, kind, required: req.checked } });
  });
  const reqSpan = document.createElement("span");
  reqSpan.textContent = "Required";
  reqWrap.append(req, reqSpan);
  inspectEl.append(reqWrap);

  // Width.
  const widthSel = document.createElement("select");
  for (const [label, span] of [
    ["Full width", ""],
    ["Half (side-by-side)", "6"],
  ] as const) {
    const opt = document.createElement("option");
    opt.value = span;
    opt.textContent = label;
    if ((f.colSpan === 6 ? "6" : "") === span) opt.selected = true;
    widthSel.append(opt);
  }
  widthSel.addEventListener("change", () =>
    patchField(f.id, { colSpan: widthSel.value === "6" ? 6 : undefined }),
  );
  inspectEl.append(row("Width", widthSel));

  // Options editor for select / radio.
  if (f.type === "select" || f.type === "radio") {
    const opts = (f.options ?? []) as { label: string; value: unknown }[];
    const optBox = document.createElement("div");
    optBox.className = "forge-options";
    opts.forEach((o, i) => {
      const line = document.createElement("div");
      line.className = "forge-opt";
      const lab = textInput(String(o.label), (v) => {
        const next = opts.map((opt, j) => (j === i ? { ...opt, label: v } : opt));
        patchField(f.id, { options: next }, { inspector: false });
      });
      lab.placeholder = "Label";
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "forge-chip forge-chip-danger";
      rm.textContent = "✕";
      rm.addEventListener("click", () =>
        patchField(f.id, { options: opts.filter((_, j) => j !== i) }),
      );
      line.append(lab, rm);
      optBox.append(line);
    });
    const add = document.createElement("button");
    add.type = "button";
    add.className = "forge-ghost forge-add-opt";
    add.textContent = "+ Add option";
    add.addEventListener("click", () => {
      const n = opts.length + 1;
      patchField(f.id, { options: [...opts, { label: `Option ${n}`, value: `opt${n}` }] });
    });
    optBox.append(add);
    inspectEl.append(row("Options", optBox));
  }

  appendIdRow(f);
}

function appendIdRow(f: FieldSchema): void {
  const id = textInput(f.id, (v) => {
    const clean = v.trim();
    // Resolve the current field via the live selection (not the captured `f`)
    // so successive keystrokes keep targeting it after the id changes.
    const cur = field(selectedId);
    if (!cur || !clean || fields.some((o) => o.id === clean && o !== cur)) return;
    fields = fields.map((o) => (o === cur ? ({ ...o, id: clean } as FieldSchema) : o));
    selectedId = clean;
    sync({ inspector: false });
  });
  inspectEl.append(row("Field id (payload key)", id));
}

// ---- Live preview ----------------------------------------------------------

const previewEl = $<HTMLDivElement>("forge-preview");
let previewForm: Form | null = null;

function renderPreview(): void {
  previewForm?.destroy?.();
  previewEl.replaceChildren();
  if (fields.length === 0) {
    const hint = document.createElement("p");
    hint.className = "forge-hint";
    hint.textContent = "Add a field to preview the live form.";
    previewEl.append(hint);
    return;
  }
  try {
    previewForm = new Form(buildSchema(), {}, { dom: { customStyles: true } });
    previewForm.mount(previewEl);
  } catch (err) {
    const pre = document.createElement("pre");
    pre.className = "forge-error";
    pre.textContent = String(err);
    previewEl.append(pre);
  }
}

// ---- Schema panel ----------------------------------------------------------

const schemaJsonEl = $<HTMLPreElement>("forge-schema-json");
function renderSchema(): void {
  schemaJsonEl.textContent = JSON.stringify(buildSchema(), null, 2);
}

// ---- Sync ------------------------------------------------------------------

let activeTab = "inspect";
function sync(opts: { inspector?: boolean } = {}): void {
  renderCanvas();
  if (activeTab === "inspect") {
    if (opts.inspector !== false) renderInspector();
  } else if (activeTab === "preview") renderPreview();
  else renderSchema();
}

// ---- Boot ------------------------------------------------------------------

function buildPalette(): void {
  const palette = $<HTMLElement>("forge-palette");
  const heading = document.createElement("h2");
  heading.textContent = "Fields";
  palette.append(heading);
  for (const item of PALETTE) {
    const chip = document.createElement("div");
    chip.className = "forge-pal-item";
    chip.draggable = true;
    chip.textContent = item.label;
    chip.dataset.type = String(item.type);
    chip.addEventListener("dragstart", (e) =>
      e.dataTransfer?.setData("application/x-forge-add", String(item.type)),
    );
    // Click also adds (appends) — convenient on touch / no-drag.
    chip.addEventListener("dblclick", () => addField(item.type));
    palette.append(chip);
  }
  const tip = document.createElement("p");
  tip.className = "forge-hint";
  tip.textContent = "Drag onto the canvas — or double-click to append.";
  palette.append(tip);
}

function wireTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>(".forge-tab")];
  const panels = [...document.querySelectorAll<HTMLElement>(".forge-panel")];
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab!;
      tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      panels.forEach((p) => (p.hidden = p.dataset.panel !== activeTab));
      sync();
    });
  }
}

function wireToolbar(): void {
  $<HTMLButtonElement>("forge-clear").addEventListener("click", () => {
    if (fields.length && !confirm("Clear all fields?")) return;
    fields = [];
    selectedId = null;
    sync();
  });
  $<HTMLButtonElement>("forge-export").addEventListener("click", async () => {
    const json = JSON.stringify(buildSchema(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      flash("Schema copied to clipboard");
    } catch {
      // Fallback: switch to the schema tab so the user can copy manually.
      (document.querySelector('.forge-tab[data-tab="schema"]') as HTMLButtonElement).click();
    }
  });
}

function flash(message: string): void {
  const el = document.createElement("div");
  el.className = "forge-toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

// Seed with a couple of fields so the canvas isn't empty on first load.
addField("text", 0);
patchField(fields[0]!.id, { label: "Full name", validation: { kind: "string", required: true } });
addField("email", 1);
selectedId = null;

buildPalette();
wireTabs();
wireToolbar();
sync();
