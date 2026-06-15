import type { FieldSchema, FieldType } from "@formwright/schema";
import type { Form } from "./form.js";
import type { CollectionNode, FieldNode, StepsNode } from "./nodes.js";
import { isPresentational } from "./nodes.js";
import { untrack } from "./reactive.js";

export type SkeletonVariant =
  | "text"
  | "textarea"
  | "select"
  | "toggle"
  | "checkbox"
  | "radio"
  | "date"
  | "file"
  | "range"
  | "color"
  | "heading"
  | "separator"
  | "paragraph"
  | "unknown";

export interface SkeletonNode {
  readonly kind: "field" | "group" | "collection";
  readonly variant: SkeletonVariant;
  readonly colSpan?: number;
  readonly rows?: number;
  readonly lines?: number;
  readonly children?: readonly SkeletonNode[];
}

const TEXT_LIKE = new Set(["text", "email", "password", "url", "tel", "search", "number"]);

function presentationalVariant(type: FieldType): SkeletonVariant {
  if (type === "heading") return "heading";
  if (type === "separator") return "separator";
  if (type === "paragraph") return "paragraph";
  return "unknown";
}

function variantForType(type: FieldType, schema: FieldSchema): SkeletonVariant {
  if (schema.skeleton?.variant) return schema.skeleton.variant;
  if (TEXT_LIKE.has(type)) return "text";
  if (type === "textarea") return "textarea";
  if (type === "select") return "select";
  if (type === "toggle") return "toggle";
  if (type === "checkbox") return "checkbox";
  if (type === "radio") return "radio";
  if (type === "date" || type === "time" || type === "datetime-local") return "date";
  if (type === "file") return "file";
  if (type === "range") return "range";
  if (type === "color") return "color";
  return "unknown";
}

function isNodeVisible(node: FieldNode): boolean {
  return untrack(() => node.visible.get());
}

function withColSpan(colSpan: number | undefined): Pick<SkeletonNode, "colSpan"> {
  return typeof colSpan === "number" ? { colSpan } : {};
}

function withLines(lines: number | undefined): Pick<SkeletonNode, "lines"> {
  return typeof lines === "number" ? { lines } : {};
}

function skeletonField(node: FieldNode & { kind: "field" }): SkeletonNode {
  const { schema } = node;
  const type = schema.type;
  const lines = schema.skeleton?.lines ?? (type === "textarea" ? 3 : undefined);
  return {
    kind: "field",
    variant: isPresentational(type) ? presentationalVariant(type) : variantForType(type, schema),
    ...withColSpan(schema.colSpan),
    ...withLines(lines),
  };
}

/** Build a skeleton plan from a schema field list (e.g. a collection row template). */
export function buildSkeletonPlanFromSchemas(
  fields: readonly FieldSchema[],
): readonly SkeletonNode[] {
  const out: SkeletonNode[] = [];
  for (const schema of fields) {
    if (schema.type === "group") {
      const children = buildSkeletonPlanFromSchemas(schema.fields ?? []);
      if (children.length) {
        out.push({ kind: "group", variant: "unknown", ...withColSpan(schema.colSpan), children });
      }
      continue;
    }
    if (schema.type === "collection") {
      const children = buildSkeletonPlanFromSchemas(schema.fields ?? []);
      out.push({
        kind: "collection",
        variant: "unknown",
        ...withColSpan(schema.colSpan),
        rows: schema.minItems ?? 1,
        children,
      });
      continue;
    }
    if (schema.type === "steps" || schema.type === "step") continue;
    const lines = schema.skeleton?.lines ?? (schema.type === "textarea" ? 3 : undefined);
    out.push({
      kind: "field",
      variant: isPresentational(schema.type)
        ? presentationalVariant(schema.type)
        : variantForType(schema.type, schema),
      ...withColSpan(schema.colSpan),
      ...withLines(lines),
    });
  }
  return out;
}

/** Build a skeleton plan from live field nodes (respects visibility). */
export function buildSkeletonPlanFromNodes(nodes: readonly FieldNode[]): readonly SkeletonNode[] {
  const out: SkeletonNode[] = [];
  for (const node of nodes) {
    if (!isNodeVisible(node)) continue;
    if (node.kind === "field") {
      out.push(skeletonField(node));
    } else if (node.kind === "group") {
      const children = buildSkeletonPlanFromNodes(node.children);
      if (children.length) {
        out.push({
          kind: "group",
          variant: "unknown",
          ...withColSpan(node.schema.colSpan),
          children,
        });
      }
    } else if (node.kind === "collection") {
      const collection = node as CollectionNode;
      const items = untrack(() => collection.items.peek());
      const rowChildren = items[0]
        ? buildSkeletonPlanFromNodes(items[0].group.children)
        : buildSkeletonPlanFromSchemas(collection.schema.fields ?? []);
      out.push({
        kind: "collection",
        variant: "unknown",
        ...withColSpan(collection.schema.colSpan),
        rows: Math.max(1, collection.schema.minItems ?? 1),
        children: rowChildren,
      });
    } else if (node.kind === "steps") {
      out.push(...buildSkeletonPlanFromSteps(node as StepsNode));
    } else if (node.kind === "step") {
      out.push(...buildSkeletonPlanFromNodes(node.children));
    }
  }
  return out;
}

function buildSkeletonPlanFromSteps(steps: StepsNode): readonly SkeletonNode[] {
  const index = untrack(() => steps.currentStep.peek());
  const step = steps.steps[index];
  return step ? buildSkeletonPlanFromNodes(step.children) : [];
}

/** Skeleton plan for the currently visible form surface (full form or active wizard step). */
export function buildSkeletonPlanFromForm(form: Form): readonly SkeletonNode[] {
  const steps = form.findSteps();
  if (steps) return buildSkeletonPlanFromSteps(steps);
  return buildSkeletonPlanFromNodes(form.tree);
}
