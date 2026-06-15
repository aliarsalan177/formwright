/**
 * Nested field tree — `group` (object) and `collection` (array-of-groups) nodes
 * on top of the leaf {@link FieldState}.
 *
 * Names in conditions resolve **lexically**: a child first looks among its own
 * siblings, then walks up the enclosing {@link Scope} chain to the form root. So
 * a field nested inside a group or a collection row can be hidden by an outer
 * toggle (`{ var: "showDetails" }`) *and* by a sibling in the same row — without
 * any path syntax. Hidden fields keep their value in the aggregated payload but
 * are skipped by validation.
 */
import type { FieldSchema, FieldValue } from "@formwright/schema";
import { computed, signal, type ReadSignal, type WriteSignal } from "./reactive.js";
import { evaluateCondition, type ValueGetter } from "./conditions.js";
import { FieldState, defaultValueFor } from "./model.js";

/** A node in the field tree: a leaf field, a nested object, a repeatable list, or a wizard. */
export type FieldNode = FieldState | GroupNode | CollectionNode | StepsNode | StepNode;

/** Resolves a referenced field name to its current value, walking enclosing scopes. */
export type Scope = ValueGetter;

type Dict = Record<string, unknown>;

/** Presentational field types carry no value and never appear in the payload. */
const PRESENTATIONAL = new Set(["heading", "separator", "paragraph"]);

/** True for fields that render content but contribute nothing to the payload. */
export function isPresentational(type: string): boolean {
  return PRESENTATIONAL.has(type);
}

/** Current value of any node (subscribes the caller). */
function nodeValue(node: FieldNode): unknown {
  return node.value.get();
}

/**
 * Aggregate children into an object. Hidden fields (whose `visibleWhen` is false)
 * are excluded from the payload — at any depth, including inside groups and
 * collection rows — as are fields flagged `omit`. Hide a field or a whole
 * group/collection and its data drops out of the submitted payload.
 */
function collectValues(nodes: readonly FieldNode[]): Dict {
  const out: Dict = {};
  for (const node of nodes) {
    if (node.schema.omit || isPresentational(node.schema.type)) continue;
    if (!node.visible.get()) continue;
    out[node.id] = nodeValue(node);
  }
  return out;
}

/** Build sibling nodes that share `scope`, seeding each from `initial`. */
function buildNodes(
  schemas: readonly FieldSchema[],
  scope: Scope,
  initial: Dict,
  stepActive?: ReadSignal<boolean>,
): { nodes: FieldNode[]; byName: Map<string, FieldNode> } {
  const nodes: FieldNode[] = [];
  const byName = new Map<string, FieldNode>();
  for (const schema of schemas) {
    let node: FieldNode;
    if (schema.type === "group") {
      node = new GroupNode(schema, scope, asDict(initial[schema.id]), stepActive);
    } else if (schema.type === "step") {
      if (!stepActive)
        throw new Error('Field type "step" must be nested inside a "steps" container');
      node = new StepNode(schema, scope, asDict(initial[schema.id]), stepActive);
    } else if (schema.type === "collection") {
      node = new CollectionNode(schema, scope, asArray(initial[schema.id]));
    } else if (schema.type === "steps") {
      node = new StepsNode(schema, scope, asDict(initial[schema.id]));
    } else {
      const init = initial[schema.id] ?? schema.defaultValue ?? defaultValueFor(schema.type);
      node = new FieldState(schema, init as FieldValue, scope, stepActive);
    }
    nodes.push(node);
    byName.set(schema.id, node);
  }
  return { nodes, byName };
}

function asDict(v: unknown): Dict {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Dict) : {};
}
function asArray(v: unknown): Dict[] {
  return Array.isArray(v) ? (v as Dict[]) : [];
}

/** Reset a sibling list in place from a fresh `initial` object. */
function resetNodes(nodes: readonly FieldNode[], initial: Dict): void {
  for (const node of nodes) {
    if (node.kind === "field") {
      const init =
        initial[node.id] ?? node.schema.defaultValue ?? defaultValueFor(node.schema.type);
      node.reset(init as FieldValue);
    } else if (node.kind === "group" || node.kind === "step") {
      node.reset(asDict(initial[node.id]));
    } else if (node.kind === "steps") {
      node.reset(asDict(initial[node.id]));
    } else {
      node.reset(asArray(initial[node.id]));
    }
  }
}

/** A nested object field: produces `{ ...visible child values }`. */
export class GroupNode {
  readonly kind = "group" as const;
  readonly id: string;
  readonly schema: FieldSchema;
  readonly children: readonly FieldNode[];
  readonly byName: ReadonlyMap<string, FieldNode>;
  readonly value: ReadSignal<Dict>;
  readonly visible: ReadSignal<boolean>;
  readonly enabled: ReadSignal<boolean>;

  /** The scope a child uses: resolve a name among siblings, else delegate upward. */
  readonly scope: Scope;

  constructor(
    schema: FieldSchema,
    parentScope: Scope,
    initial: Dict,
    stepActive?: ReadSignal<boolean>,
  ) {
    this.id = schema.id;
    this.schema = schema;
    this.scope = (name) => {
      const child = this.byName.get(name);
      return child ? (nodeValue(child) as FieldValue) : parentScope(name);
    };
    const built = buildNodes(schema.fields ?? [], this.scope, initial, stepActive);
    this.children = built.nodes;
    this.byName = built.byName;
    this.value = computed(() => collectValues(this.children));
    this.visible = computed(() => evaluateCondition(schema.visibleWhen, parentScope, true));
    this.enabled = computed(() => evaluateCondition(schema.enabledWhen, parentScope, true));
  }

  reset(initial: Dict): void {
    resetNodes(this.children, initial);
  }
}

/** One row of a {@link CollectionNode}: a group with a stable identity key. */
export interface CollectionItem {
  readonly key: number;
  readonly group: GroupNode;
}

/** A repeatable list of object rows: produces `[{ ... }, { ... }]`. */
export class CollectionNode {
  readonly kind = "collection" as const;
  readonly id: string;
  readonly schema: FieldSchema;
  readonly value: ReadSignal<Dict[]>;
  readonly visible: ReadSignal<boolean>;
  readonly enabled: ReadSignal<boolean>;

  private readonly rows: WriteSignal<CollectionItem[]>;
  private readonly parentScope: Scope;
  private readonly itemSchema: FieldSchema;
  private seq = 0;

  constructor(schema: FieldSchema, parentScope: Scope, initial: Dict[]) {
    this.id = schema.id;
    this.schema = schema;
    this.parentScope = parentScope;
    // Each row is a group over the collection's child fields; the row carries no
    // visibility condition of its own (that belongs to the whole collection).
    this.itemSchema = { id: schema.id, type: "group", fields: schema.fields ?? [] };

    const seed = this.seedRows(initial);
    this.rows = signal(seed);
    this.value = computed(() => this.rows.get().map((row) => row.group.value.get()));
    this.visible = computed(() => evaluateCondition(schema.visibleWhen, parentScope, true));
    this.enabled = computed(() => evaluateCondition(schema.enabledWhen, parentScope, true));
  }

  /** Reactive list of rows (subscribes the caller to add/remove). */
  get items(): ReadSignal<CollectionItem[]> {
    return this.rows;
  }

  private makeItem(initial: Dict): CollectionItem {
    return { key: this.seq++, group: new GroupNode(this.itemSchema, this.parentScope, initial) };
  }

  private seedRows(initial: Dict[]): CollectionItem[] {
    const rows = initial.map((row) => this.makeItem(row));
    const min = this.schema.minItems ?? 0;
    while (rows.length < min) rows.push(this.makeItem({}));
    return rows;
  }

  /** Append a new empty row, unless `maxItems` is reached. */
  add(): void {
    const max = this.schema.maxItems;
    if (max !== undefined && this.rows.peek().length >= max) return;
    this.rows.update((rows) => [...rows, this.makeItem({})]);
  }

  /** Remove the row at `index`, unless `minItems` would be violated. */
  removeAt(index: number): void {
    const min = this.schema.minItems ?? 0;
    if (this.rows.peek().length <= min) return;
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
  }

  reset(initial: Dict[]): void {
    this.seq = 0;
    this.rows.set(this.seedRows(initial));
  }
}

/** One step of a {@link StepsNode}: a titled section of nested fields. */
export class StepNode {
  readonly kind = "step" as const;
  readonly id: string;
  readonly schema: FieldSchema;
  readonly children: readonly FieldNode[];
  readonly byName: ReadonlyMap<string, FieldNode>;
  readonly value: ReadSignal<Dict>;
  readonly visible: ReadSignal<boolean>;
  readonly enabled: ReadSignal<boolean>;
  readonly scope: Scope;
  /** True when this step is the active step in its parent wizard. */
  readonly active: ReadSignal<boolean>;

  constructor(schema: FieldSchema, parentScope: Scope, initial: Dict, active: ReadSignal<boolean>) {
    this.id = schema.id;
    this.schema = schema;
    this.active = active;
    this.scope = (name) => {
      const child = this.byName.get(name);
      return child ? (nodeValue(child) as FieldValue) : parentScope(name);
    };
    const built = buildNodes(schema.fields ?? [], this.scope, initial, active);
    this.children = built.nodes;
    this.byName = built.byName;
    this.value = computed(() => collectValues(this.children));
    this.visible = computed(() => evaluateCondition(schema.visibleWhen, parentScope, true));
    this.enabled = computed(() => evaluateCondition(schema.enabledWhen, parentScope, true));
  }

  reset(initial: Dict): void {
    resetNodes(this.children, initial);
  }
}

/** A multi-step wizard: shows one {@link StepNode} at a time with next/back navigation. */
export class StepsNode {
  readonly kind = "steps" as const;
  readonly id: string;
  readonly schema: FieldSchema;
  readonly steps: readonly StepNode[];
  readonly byName: Map<string, StepNode>;
  readonly value: ReadSignal<Dict>;
  readonly visible: ReadSignal<boolean>;
  readonly enabled: ReadSignal<boolean>;
  readonly currentStep: WriteSignal<number>;
  readonly scope: Scope;

  constructor(schema: FieldSchema, parentScope: Scope, initial: Dict) {
    this.id = schema.id;
    this.schema = schema;
    this.currentStep = signal(0);
    this.byName = new Map<string, StepNode>();
    this.scope = (name) => {
      const step = this.byName.get(name);
      return step ? (step.value.get() as unknown as FieldValue) : parentScope(name);
    };

    const stepSchemas = schema.fields ?? [];
    const steps: StepNode[] = stepSchemas.map((stepSchema, index) => {
      const active = computed(() => this.currentStep.get() === index);
      const stepInitial = asDict(initial[stepSchema.id]);
      const step = new StepNode(stepSchema, this.scope, stepInitial, active);
      this.byName.set(stepSchema.id, step);
      return step;
    });
    this.steps = steps;
    this.value = computed(() => {
      const out: Dict = {};
      for (const step of this.steps) out[step.id] = step.value.get();
      return out;
    });
    this.visible = computed(() => evaluateCondition(schema.visibleWhen, parentScope, true));
    this.enabled = computed(() => evaluateCondition(schema.enabledWhen, parentScope, true));
  }

  /** Validate every leaf in the step at `index` (defaults to the current step). */
  validateStep(index?: number): boolean {
    const i = index ?? this.currentStep.peek();
    const step = this.steps[i];
    if (!step) return true;
    let ok = true;
    eachLeaf([step], (leaf) => {
      if (leaf.validate() !== null) ok = false;
    });
    return ok;
  }

  /** Advance to the next step after optionally validating the current one. Returns false if blocked. */
  next(): boolean {
    const validate = this.schema.validateOnNext !== false;
    if (validate && !this.validateStep()) return false;
    const cur = this.currentStep.peek();
    if (cur < this.steps.length - 1) {
      this.currentStep.set(cur + 1);
      return true;
    }
    return false;
  }

  /** Go back one step (no validation). */
  prev(): void {
    this.currentStep.update((i) => Math.max(0, i - 1));
  }

  /** Jump to a step by index (does not validate). */
  goTo(index: number): void {
    if (index >= 0 && index < this.steps.length) this.currentStep.set(index);
  }

  /** Jump to a step by its schema `id`. */
  goToId(id: string): boolean {
    const index = this.steps.findIndex((s) => s.id === id);
    if (index === -1) return false;
    this.goTo(index);
    return true;
  }

  /** Active step index and id (non-reactive peek). */
  activeStep(): { index: number; id: string } {
    const index = this.currentStep.peek();
    const step = this.steps[index];
    return { index, id: step?.id ?? "" };
  }

  reset(initial: Dict): void {
    this.currentStep.set(0);
    for (const step of this.steps) step.reset(asDict(initial[step.id]));
  }
}

/** Build the top-level field tree for a form, rooted at `rootScope`. */
export function buildTree(
  schemas: readonly FieldSchema[],
  initial: Dict,
): { nodes: FieldNode[]; byName: Map<string, FieldNode>; scope: Scope } {
  let byName: Map<string, FieldNode>;
  const scope: Scope = (name) => {
    const node = byName.get(name);
    return node ? (nodeValue(node) as FieldValue) : undefined;
  };
  const built = buildNodes(schemas, scope, initial);
  byName = built.byName;
  return { nodes: built.nodes, byName, scope };
}

/** Visit every leaf {@link FieldState} in a node list (descends groups/collections/steps). */
export function eachLeaf(nodes: readonly FieldNode[], visit: (leaf: FieldState) => void): void {
  for (const node of nodes) {
    if (node.kind === "field") visit(node);
    else if (node.kind === "group" || node.kind === "step") eachLeaf(node.children, visit);
    else if (node.kind === "steps") {
      for (const step of node.steps) eachLeaf(step.children, visit);
    } else for (const row of node.items.peek()) eachLeaf(row.group.children, visit);
  }
}

export { collectValues, resetNodes };
