/**
 * The label / control / help / error frame shared by every text-like
 * control, so `<fw-input>`, `<fw-textarea>`, `<fw-select>` and the rest
 * line up and read out the same way.
 *
 * The label is a real `<label>` inside the shadow root, pointed at the
 * real control beside it. That is the one arrangement every screen reader
 * gets right; pointing a light-DOM label across a shadow boundary is not.
 */
export const fieldStyles = /* css */ `
:host { display: block; }
.field { display: flex; flex-direction: column; gap: 0.375rem; }
.label { font-size: var(--_text-size); font-weight: 500; color: var(--_text); }
.label .required { color: var(--_danger); margin-inline-start: 0.125rem; }
.help { font-size: 0.8125rem; color: var(--_muted); }
.error { font-size: 0.8125rem; color: var(--_danger); }

.control {
  display: flex; align-items: center; gap: 0.5rem;
  min-height: var(--_height); padding: 0 0.75rem;
  background: var(--_surface); color: var(--_text);
  border: 1px solid var(--_border); border-radius: var(--_radius);
  transition: border-color var(--_duration), box-shadow var(--_duration);
}
.control:focus-within { border-color: var(--_accent); box-shadow: var(--_ring); }
:host([invalid]) .control { border-color: var(--_danger); }
:host([invalid]) .control:focus-within { box-shadow: 0 0 0 3px color-mix(in srgb, var(--_danger) 30%, transparent); }
:host([disabled]) .control { opacity: 0.6; cursor: not-allowed; background: var(--_surface-2); }

.icon-button {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 1.75rem; height: 1.75rem; margin-inline-end: -0.375rem;
  border: 0; border-radius: var(--_radius-sm); background: transparent;
  color: var(--_muted); cursor: pointer; font: inherit;
}
.icon-button:hover { background: var(--_surface-2); color: var(--_text); }
.icon-button:focus-visible { outline: none; box-shadow: var(--_ring); }
/* Slotted content keeps the page's font size unless told otherwise, which
   left a "PKR" prefix a size larger than the value beside it. */
::slotted([slot="prefix"]), ::slotted([slot="suffix"]) {
  display: inline-flex; flex: none; color: var(--_muted); font-size: var(--_text-size);
}
`;

export interface FieldParts {
  field: HTMLElement;
  label: HTMLLabelElement;
  labelText: HTMLSpanElement;
  required: HTMLSpanElement;
  control: HTMLElement;
  help: HTMLElement;
  error: HTMLElement;
}

/** Build the frame. `controlId` is the id of the element the label names. */
export function buildField(controlId: string): FieldParts {
  const field = document.createElement("div");
  field.className = "field";
  field.setAttribute("part", "field");

  const label = document.createElement("label");
  label.className = "label";
  label.setAttribute("part", "label");
  label.htmlFor = controlId;
  const labelSlot = document.createElement("slot");
  labelSlot.name = "label";
  const labelText = document.createElement("span");
  labelSlot.append(labelText);
  const required = document.createElement("span");
  required.className = "required";
  required.setAttribute("aria-hidden", "true");
  required.textContent = "*";
  label.append(labelSlot, required);

  const control = document.createElement("div");
  control.className = "control";
  control.setAttribute("part", "control");

  const help = document.createElement("div");
  help.className = "help";
  help.setAttribute("part", "help");
  help.id = `${controlId}-help`;
  const helpSlot = document.createElement("slot");
  helpSlot.name = "help";
  help.append(helpSlot);

  const error = document.createElement("div");
  error.className = "error";
  error.setAttribute("part", "error");
  error.id = `${controlId}-error`;
  // Announced when it appears, so an error set after submit is heard
  // without the user having to find it.
  error.setAttribute("aria-live", "polite");

  field.append(label, control, help, error);
  return { field, label, labelText, required, control, help, error };
}

/** Whether a named slot currently has anything assigned. */
export function slotHasContent(root: ShadowRoot, name: string): boolean {
  const slot = root.querySelector<HTMLSlotElement>(`slot[name="${name}"]`);
  if (!slot) return false;
  // Not flattened: a flattened read returns the slot's own fallback when
  // nothing is assigned, which would make every slot look filled.
  return slot
    .assignedNodes()
    .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? "").trim() !== "");
}
