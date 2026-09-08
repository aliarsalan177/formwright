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

  if (s.actions !== undefined) {
    if (!Array.isArray(s.actions)) {
      push("actions", "`actions` must be an array.");
    } else {
      const seen = new Set<string>();
      s.actions.forEach((action, i) => {
        const at = `actions[${i}]`;
        if (typeof action?.name !== "string" || action.name.length === 0) {
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
        if (typeof point !== "number" || point <= 0 || point > 1) {
          push(at, "Each snap point must be a fraction in (0, 1].");
          return;
        }
        // Out of order would make "snap up" move the sheet down.
        if (point <= previous) {
          push(at, "Snap points must ascend.");
        }
        previous = point;
      });
      if (
        s.defaultSnap !== undefined &&
        (!Number.isInteger(s.defaultSnap) ||
          s.defaultSnap < 0 ||
          s.defaultSnap >= s.snapPoints.length)
      ) {
        push("defaultSnap", "`defaultSnap` must index into `snapPoints`.");
      }
    }
  } else if (s.defaultSnap !== undefined) {
    push("defaultSnap", "`defaultSnap` needs `snapPoints`.");
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
      break;
    case "html":
      if (typeof block.html !== "string") {
        push(`${at}.html`, "`html` must be a string.");
      }
      break;
    case "list":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        push(`${at}.items`, "`items` must be a non-empty array of strings.");
      }
      break;
    case "fields":
      if (!Array.isArray(block.items) || block.items.length === 0) {
        push(`${at}.items`, "`items` must be a non-empty array.");
      }
      break;
    case "form":
      if (typeof block.form !== "object" || block.form === null) {
        push(`${at}.form`, "`form` must be a Formwright schema object.");
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
