import type { FieldOption, Form } from "@formwright/core";
import { createFieldOptionsController, resolve } from "@formwright/core";
import type { WidgetContext } from "./widgets.js";
import { on, Scope } from "./internal.js";

function optionLabel(opt: FieldOption, form: Form): string {
  if (typeof opt.label === "string") return opt.label;
  const resolved = resolve(opt.label, form.options.providers);
  return typeof resolved === "string" ? resolved : String(opt.value);
}

/** Bind reactive field options (static, eager `$query`, or lazy `$query`) to a control host. */
export function bindFieldOptions(
  ctx: WidgetContext,
  host: HTMLElement,
  render: (options: readonly FieldOption[], loading: boolean) => void,
): void {
  const { form, field, scope } = ctx;
  const source = createFieldOptionsController(form, field);
  if (source) scope.add(() => source.dispose());

  const requestLoad = () => source?.requestLoad();
  on(scope, host, "focus", requestLoad);
  on(scope, host, "mousedown", requestLoad);

  scope.bind(() => {
    const options = source?.options.get() ?? [];
    const loading = source?.loading.get() ?? false;
    host.classList.toggle("fw-options-loading", loading);
    host.setAttribute("aria-busy", loading ? "true" : "false");
    render(options, loading);
  });
}

export { optionLabel };
