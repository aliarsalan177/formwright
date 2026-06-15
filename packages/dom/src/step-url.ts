import type { Dispose, Form, StepsNode } from "@formwright/core";
import { Scope } from "./internal.js";

/** Parse the `:step` segment from a URL pattern like `/apply/step/:step`. */
export function readStepFromUrl(pattern: string, pathname = location.pathname): string | undefined {
  const pat = pattern.split("/").filter(Boolean);
  const path = pathname.split("/").filter(Boolean);
  const slot = pat.indexOf(":step");
  if (slot === -1 || path.length <= slot) return undefined;
  return decodeURIComponent(path[slot]!);
}

/** Build a URL from a pattern, substituting `:step`. */
export function writeStepToUrl(pattern: string, step: string): string {
  const parts = pattern.split("/").filter(Boolean);
  const slot = parts.indexOf(":step");
  if (slot === -1) return pattern;
  parts[slot] = encodeURIComponent(step);
  return `/${parts.join("/")}`;
}

/**
 * Keep the active wizard step in sync with the browser URL (`history.replaceState`
 * on change; `popstate` restores step on back/forward).
 */
export function wireStepUrlSync(
  form: Form,
  steps: StepsNode,
  pattern: string,
  by: "id" | "index",
  scope: Scope,
): Dispose {
  const applyFromUrl = () => {
    const raw = readStepFromUrl(pattern);
    if (raw === undefined) return;
    if (by === "index") {
      const index = Number(raw);
      if (!Number.isNaN(index)) steps.goTo(index);
    } else {
      steps.goToId(raw);
    }
  };

  applyFromUrl();

  scope.bind(() => {
    const { index, id } = steps.activeStep();
    const segment = by === "index" ? String(index) : id;
    const next = writeStepToUrl(pattern, segment);
    if (location.pathname !== next) {
      history.replaceState({ fwStep: segment }, "", next);
    }
  });

  const onPop = () => applyFromUrl();
  window.addEventListener("popstate", onPop);
  scope.add(() => window.removeEventListener("popstate", onPop));

  return () => {};
}
