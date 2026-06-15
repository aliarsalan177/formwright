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

let fields: FieldSchema[] = [
  { id: "name", type: "text", label: "Full name", validation: { kind: "string", required: true } },
  { id: "email", type: "email", label: "Email", validation: { kind: "string", format: "email" } },
];
let previewForm: Form | null = null;

function buildSchema(): FormSchema {
  return { id: "forge", version: "1.0", title: "Untitled form", fields };
}

function renderPreview(host: HTMLElement): void {
  previewForm?.destroy();
  previewForm = null;
  host.replaceChildren();
  if (!fields.length) {
    host.textContent = "Add a field from the palette.";
    return;
  }
  previewForm = new Form(buildSchema());
  previewForm.mount(host);
}

function renderCanvas(canvas: HTMLElement, preview: HTMLElement): void {
  canvas.replaceChildren();
  for (const f of fields) {
    const row = document.createElement("div");
    row.className = "forge-canvas-item";
    row.textContent = `${f.label ?? f.id} (${f.type})`;
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => {
      fields = fields.filter((x) => x.id !== f.id);
      sync(preview, canvas);
    });
    row.append(del);
    canvas.append(row);
  }
}

function sync(preview: HTMLElement, canvas: HTMLElement): void {
  renderCanvas(canvas, preview);
  renderPreview(preview);
}

function addField(type: FieldType): void {
  const id = `${type}_${fields.length + 1}`;
  const base: FieldSchema = { id, type, label: type.charAt(0).toUpperCase() + type.slice(1) };
  if (type === "select") {
    (base as FieldSchema & { options: unknown }).options = [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ];
  }
  fields = [...fields, base];
}

/** Mini Forge — drag-and-drop form builder preview. */
export function mountForgeMini(): StoryHost {
  fields = [
    {
      id: "name",
      type: "text",
      label: "Full name",
      validation: { kind: "string", required: true },
    },
    { id: "email", type: "email", label: "Email", validation: { kind: "string", format: "email" } },
  ];

  const wrap = document.createElement("div") as StoryHost;
  wrap.className = "sb-forge-mini";

  const palette = document.createElement("div");
  palette.className = "sb-forge-palette";
  const ph = document.createElement("h4");
  ph.textContent = "Palette";
  palette.append(ph);
  for (const item of PALETTE) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "forge-pal-item";
    chip.textContent = item.label;
    chip.addEventListener("click", () => {
      addField(item.type);
      sync(preview, canvas);
    });
    palette.append(chip);
  }

  const canvasCol = document.createElement("div");
  canvasCol.className = "sb-forge-canvas";
  const ch = document.createElement("h4");
  ch.textContent = "Canvas";
  const canvas = document.createElement("div");
  canvas.className = "forge-canvas";
  canvasCol.append(ch, canvas);

  const previewCol = document.createElement("div");
  previewCol.className = "sb-forge-preview";
  const prh = document.createElement("h4");
  prh.textContent = "Live preview";
  const preview = document.createElement("div");
  preview.className = "form-host";
  previewCol.append(prh, preview);

  wrap.append(palette, canvasCol, previewCol);
  sync(preview, canvas);

  wrap.__storyDispose = () => previewForm?.destroy();
  return wrap;
}
