import { Form, type FieldSchema, type FieldType, type FormSchema } from "@formwright/core";
import "@formwright/dom";
import type { StoryHost } from "../helpers/mount";

const PALETTE: { type: FieldType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "email", label: "Email" },
  { type: "number", label: "Number" },
  { type: "textarea", label: "Textarea" },
  { type: "select", label: "Select" },
  { type: "toggle", label: "Toggle" },
  { type: "checkbox", label: "Checkbox" },
];

let fields: FieldSchema[] = [];
let previewForm: Form | null = null;
let seq = 0;

function buildSchema(): FormSchema {
  // The summary side panel doesn't fit the preview rail.
  return { id: "forge", version: "1.0", title: "Untitled form", summary: false, fields };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderPreview(host: HTMLElement): void {
  previewForm?.destroy();
  previewForm = null;
  host.replaceChildren();
  if (!fields.length) {
    host.append(el("p", "forge-hint", "Add a field from the palette to preview the form."));
    return;
  }
  previewForm = new Form(buildSchema(), {}, { dom: { customStyles: true } });
  previewForm.mount(host);
}

function renderCanvas(canvas: HTMLElement, preview: HTMLElement): void {
  canvas.replaceChildren();
  if (!fields.length) {
    canvas.append(el("div", "forge-empty", "Click a field type to start building."));
    return;
  }
  for (const f of fields) {
    const card = el("div", "forge-card");
    const head = el("div", "forge-card-head");
    head.append(
      el("span", "forge-card-title", String(f.label ?? f.id)),
      el("span", "forge-card-type", String(f.type)),
    );
    const actions = el("div", "forge-card-actions");
    const del = el("button", "forge-chip forge-chip-danger", "✕");
    del.type = "button";
    del.title = "Delete field";
    del.setAttribute("aria-label", `Delete ${String(f.label ?? f.id)}`);
    del.addEventListener("click", () => {
      fields = fields.filter((x) => x.id !== f.id);
      sync(preview, canvas);
    });
    actions.append(del);
    card.append(head, actions);
    canvas.append(card);
  }
}

function sync(preview: HTMLElement, canvas: HTMLElement): void {
  renderCanvas(canvas, preview);
  renderPreview(preview);
}

function addField(type: FieldType, label: string): void {
  const id = `${type}_${++seq}`;
  const base: FieldSchema = { id, type, label };
  if (type === "select") {
    (base as FieldSchema & { options: unknown }).options = [
      { label: "Option A", value: "a" },
      { label: "Option B", value: "b" },
    ];
  }
  fields = [...fields, base];
}

/** Mini Forge — the form builder's palette, canvas and live preview. */
export function mountForgeMini(): StoryHost {
  seq = 0;
  fields = [
    {
      id: "name",
      type: "text",
      label: "Full name",
      validation: { kind: "string", required: true },
    },
    { id: "email", type: "email", label: "Email", validation: { kind: "string", format: "email" } },
  ];

  const wrap = el("div", "forge-mini") as StoryHost;
  const main = el("div", "forge");

  const palette = el("aside", "forge-palette");
  palette.setAttribute("aria-label", "Field palette");
  palette.append(el("h2", "", "Fields"));
  for (const item of PALETTE) {
    const chip = el("button", "forge-pal-item", item.label);
    chip.type = "button";
    chip.addEventListener("click", () => {
      addField(item.type, item.label);
      sync(preview, canvas);
    });
    palette.append(chip);
  }
  palette.append(el("p", "forge-hint", "Click a field type to append it."));

  const canvasCol = el("section", "forge-canvas-wrap");
  const canvasHead = el("div", "forge-canvas-head");
  canvasHead.append(el("h2", "", "Canvas"), el("p", "", "Fields render top to bottom."));
  const canvas = el("div", "forge-canvas");
  canvasCol.append(canvasHead, canvas);

  const rail = el("aside", "forge-rail");
  const preview = el("div", "forge-panel form-host");
  rail.append(el("h2", "", "Live preview"), preview);

  main.append(palette, canvasCol, rail);
  wrap.append(main);
  sync(preview, canvas);

  wrap.__storyDispose = () => previewForm?.destroy();
  return wrap;
}
