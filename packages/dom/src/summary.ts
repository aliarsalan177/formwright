import type { Form, FieldState } from "@formwright/core";
import { isPresentational, resolve } from "@formwright/core";
import type { FormSchema, FormSummarySchema, PhoneValue } from "@formwright/schema";
import { h, Scope } from "./internal.js";
import { formatPhoneDisplay, isPhoneValue } from "./phone.js";
import { resolveSummaryEnabled } from "./styles.js";

function summarySpec(schema: FormSchema): FormSummarySchema | undefined {
  if (schema.summary === false || schema.summary === undefined) {
    return resolveSummaryEnabled(schema.summary) ? {} : undefined;
  }
  if (schema.summary === true) return {};
  return schema.summary;
}

function includeInSummary(field: FieldState): boolean {
  const s = field.schema;
  if (s.omitFromSummary || s.summary === false) return false;
  if (s.omit || isPresentational(s.type)) return false;
  return true;
}

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (isPhoneValue(value)) return formatPhoneDisplay(value as PhoneValue);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return value
      .map((v) => formatSummaryValue(v))
      .filter(Boolean)
      .join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldLabel(form: Form, field: FieldState): string {
  const label = resolve(field.schema.label, form.options.providers);
  return typeof label === "string" ? label : field.id;
}

/** Live summary panel listing visible, filled fields. */
export function renderSummaryPanel(form: Form, scope: Scope): HTMLElement | null {
  const spec = summarySpec(form.schema);
  if (!spec) return null;

  const providers = form.options.providers;
  const position = spec.position ?? "side";
  const panel = h("aside", {
    class: "fw-summary",
    "aria-label": "Form summary",
  });

  const titleText = resolve(spec.title ?? "Summary", providers);
  if (typeof titleText === "string") {
    const heading = h("h2", { class: "fw-summary-title" });
    heading.textContent = titleText;
    panel.appendChild(heading);
  }

  const list = h("ul", { class: "fw-summary-list" });
  const empty = h("p", { class: "fw-summary-empty" });
  panel.append(list, empty);

  scope.bind(() => {
    list.replaceChildren();
    let count = 0;
    for (const [, field] of form.fields) {
      if (!includeInSummary(field)) continue;
      if (!field.visible.get()) continue;
      const raw = field.value.get();
      const text = formatSummaryValue(raw);
      if (!text) continue;
      count++;
      const item = h("li", { class: "fw-summary-item" });
      const labelEl = h("span", { class: "fw-summary-label" });
      labelEl.textContent = fieldLabel(form, field);
      const valueEl = h("span", { class: "fw-summary-value" });
      valueEl.textContent = text;
      item.append(labelEl, valueEl);
      list.appendChild(item);
    }
    const emptyMsg = resolve(
      spec.emptyMessage ?? "Start filling the form to see a summary.",
      providers,
    );
    empty.textContent = typeof emptyMsg === "string" ? emptyMsg : "";
    empty.hidden = count > 0;
    list.hidden = count === 0;
  });

  panel.dataset.position = position;
  return panel;
}

export function summaryLayoutClass(schema: FormSchema): string {
  const spec = summarySpec(schema);
  if (!spec) return "";
  return spec.position === "bottom" ? "fw-layout fw-layout-bottom" : "fw-layout";
}
