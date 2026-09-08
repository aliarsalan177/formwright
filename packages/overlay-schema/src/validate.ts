import type { OverlayBlock, OverlaySchema } from "./types.js";

export interface SchemaIssue {
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SchemaIssue[];
}

const KINDS = new Set(["modal", "drawer", "sheet", "popover"]);
const SIDES = new Set(["left", "right", "top", "bottom"]);
const SIZES = new Set(["sm", "md", "lg", "xl", "full"]);
const DISMISS = new Set(["modal", "alert", "non-modal"]);
const BLOCKS = new Set(["text", "list", "fields", "divider", "html", "form", "slot"]);
const ROLES = new Set(["confirm", "cancel", "danger", "neutral"]);
const TONES = new Set(["default", "muted", "danger", "success"]);

/**
 * Validate an {@link OverlaySchema} — dependency-free, path-addressed.
 *
 * Aimed at the mistakes that would otherwise surface as a dialog that
 * looks fine and behaves wrongly: an alert nobody can answer because it
 * has no actions, snap points out of order so a sheet jumps the wrong
 * way, a confirm whose buttons all resolve the same value.
 */
export function validateSchema(schema: unknown): ValidationResult {
  const issues: SchemaIssue[] = [];
  const push = (path: string, message: string) => issues.push({ path, message });

  if (typeof schema !== "object" || schema === null) {
    return {
      valid: false,
      issues: [{ path: "", message: "Schema must be an object." }],
    };
  }
  const s = schema as Partial<OverlaySchema>;

  if (typeof s.id !== "string" || s.id.length === 0) {
    push("id", "`id` must be a non-empty string.");
  }
  if (typeof s.kind !== "string" || !KINDS.has(s.kind)) {
    push("kind", `\`kind\` must be one of ${[...KINDS].join(", ")}.`);
  }
  if (s.side !== undefined && !SIDES.has(s.side)) {
    push("side", `\`side\` must be one of ${[...SIDES].join(", ")}.`);
  }
  if (s.size !== undefined && !SIZES.has(s.size)) {
    push("size", `\`size\` must be one of ${[...SIZES].join(", ")}.`);
  }
  if (s.dismiss !== undefined && !DISMISS.has(s.dismiss)) {
    push("dismiss", `\`dismiss\` must be one of ${[...DISMISS].join(", ")}.`);
  }

  // An alert refuses escape and backdrop clicks by design, so without a
  // button it is a dialog with no way out.
  if (s.dismiss === "alert" && (s.actions?.length ?? 0) === 0) {
    push(
      "actions",
      "An `alert` overlay must define at least one action — escape and backdrop dismissal are disabled, so it would have no way to close.",
    );
  }

  if (s.body !== undefined) {
    if (!Array.isArray(s.body)) {
      push("body", "`body` must be an array of blocks.");
    } else {
      s.body.forEach((block, i) => validateBlock(block, `body[${i}]`, push));
    }
  }

  if (s.footer !== undefined) {
    if (!Array.isArray(s.footer)) {
      push("footer", "`footer` must be an array of blocks.");
    } else {
      s.footer.forEach((block, i) => validateBlock(block, `footer[${i}]`, push));
    }
  }

  if (s.actions !== undefined) {
    if (!Array.isArray(s.actions)) {
      push("actions", "`actions` must be an array.");
    } else {
      const seen = new Set<string>();
      s.actions.forEach((action, i) => {
        const at = `actions[${i}]`;
        if (typeof action !== "object" || action === null) {
          push(at, "Each action must be an object.");
          return;
        }
        if (typeof action.name !== "string" || action.name.length === 0) {
          push(`${at}.name`, "`name` must be a non-empty string.");
          return;
        }
        if (seen.has(action.name)) {
          push(`${at}.name`, `Duplicate action name "${action.name}".`);
        }
        seen.add(action.name);
        if (typeof action.label !== "string" || action.label.length === 0) {
          push(`${at}.label`, "`label` must be a non-empty string.");
        }
        if (action.role !== undefined && !ROLES.has(action.role)) {
          push(`${at}.role`, `\`role\` must be one of ${[...ROLES].join(", ")}.`);
        }
        if (action.closeOnRun !== undefined && typeof action.closeOnRun !== "boolean") {
          push(`${at}.closeOnRun`, "`closeOnRun` must be a boolean.");
        }
        if (action.disabled !== undefined && typeof action.disabled !== "boolean") {
          push(`${at}.disabled`, "`disabled` must be a boolean.");
        }
      });
    }
  }

  if (s.snapPoints !== undefined) {
    if (!Array.isArray(s.snapPoints) || s.snapPoints.length === 0) {
      push("snapPoints", "`snapPoints` must be a non-empty array.");
    } else {
      let previous = 0;
      s.snapPoints.forEach((point, i) => {
        const at = `snapPoints[${i}]`;
        // Number.isFinite, not `typeof === "number"`: NaN is a number, and
        // NaN comparisons are all false, so it slipped through every bound.
        if (!Number.isFinite(point) || point <= 0 || point > 1) {
          push(at, "Each snap point must be a finite fraction in (0, 1].");
          return;
        }
        // Out of order would make "snap up" move the sheet down.
        if (point <= previous) {
          push(at, "Snap points must ascend.");
        }
        previous = point;
      });
    }
  }

  // Judged independently of snapPoints, so a schema with both wrong is
  // told about both rather than only the first.
  if (s.defaultSnap !== undefined) {
    const points = Array.isArray(s.snapPoints) ? s.snapPoints : [];
    if (!Number.isInteger(s.defaultSnap) || s.defaultSnap < 0 || s.defaultSnap >= points.length) {
      push("defaultSnap", "`defaultSnap` must index into `snapPoints`.");
    }
  }

  if (s.backdrop !== undefined) {
    if (typeof s.backdrop !== "object" || s.backdrop === null) {
      push("backdrop", "`backdrop` must be an object.");
    } else {
      const b = s.backdrop;
      if (b.color !== undefined && (typeof b.color !== "string" || !b.color.trim())) {
        push("backdrop.color", "`color` must be a non-empty CSS colour.");
      }
      if (
        b.opacity !== undefined &&
        (!Number.isFinite(b.opacity) || b.opacity < 0 || b.opacity > 1)
      ) {
        push("backdrop.opacity", "`opacity` must be a number between 0 and 1.");
      }
      if (b.blur !== undefined && (!Number.isFinite(b.blur) || b.blur < 0)) {
        push("backdrop.blur", "`blur` must be a non-negative number of pixels.");
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

function validateBlock(
  block: OverlayBlock | undefined,
  at: string,
  push: (path: string, message: string) => void,
): void {
  if (typeof block !== "object" || block === null) {
    push(at, "Each body entry must be a block object.");
    return;
  }
  if (typeof block.type !== "string" || !BLOCKS.has(block.type)) {
    push(`${at}.type`, `Unknown block type. Expected one of ${[...BLOCKS].join(", ")}.`);
    return;
  }
  switch (block.type) {
    case "text":
      if (typeof block.text !== "string") {
        push(`${at}.text`, "`text` must be a string.");
      }
      if (block.tone !== undefined && !TONES.has(block.tone)) {
        push(`${at}.tone`, `\`tone\` must be one of ${[...TONES].join(", ")}.`);
      }
      break;
    case "html":
      if (typeof block.html !== "string") {
        push(`${at}.html`, "`html` must be a string.");
      }
      break;
    case "list":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        push(`${at}.items`, "`items` must be a non-empty array of strings.");
      } else {
        block.items.forEach((item, i) => {
          if (typeof item !== "string") {
            push(`${at}.items[${i}]`, "Each list item must be a string.");
          }
        });
      }
      if (block.ordered !== undefined && typeof block.ordered !== "boolean") {
        push(`${at}.ordered`, "`ordered` must be a boolean.");
      }
      break;
    case "fields":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        push(`${at}.items`, "`items` must be a non-empty array.");
      } else {
        block.items.forEach((item, i) => {
          const row = `${at}.items[${i}]`;
          if (typeof item !== "object" || item === null) {
            push(row, "Each field must be an object with a label and a value.");
            return;
          }
          if (typeof item.label !== "string") {
            push(`${row}.label`, "`label` must be a string.");
          }
          if (typeof item.value !== "string") {
            push(`${row}.value`, "`value` must be a string.");
          }
        });
      }
      break;
    case "form":
      // An array is an object; a form schema is not one.
      if (typeof block.form !== "object" || block.form === null || Array.isArray(block.form)) {
        push(`${at}.form`, "`form` must be a Formwright schema object.");
      }
      if (
        block.submitAction !== undefined &&
        (typeof block.submitAction !== "string" || block.submitAction.length === 0)
      ) {
        push(`${at}.submitAction`, "`submitAction` must be a non-empty string.");
      }
      break;
    case "slot":
      if (typeof block.name !== "string" || block.name.length === 0) {
        push(`${at}.name`, "`name` must be a non-empty string.");
      }
      break;
    case "divider":
      break;
  }
}
