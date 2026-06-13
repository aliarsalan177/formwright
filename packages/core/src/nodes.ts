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

/** A node in the field tree: a leaf field, a nested object, or a repeatable list. */
export type FieldNode = FieldState | GroupNode | CollectionNode;

/** Resolves a referenced field name to its current value, walking enclosing scopes. */
export type Scope = ValueGetter;

type Dict = Record<string, unknown>;

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
    if (node.schema.omit) continue;
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
): { nodes: FieldNode[]; byName: Map<string, FieldNode> } {
  const nodes: FieldNode[] = [];
  const byName = new Map<string, FieldNode>();
  for (const schema of schemas) {
    let node: FieldNode;
    if (schema.type === "group") {
      node = new GroupNode(schema, scope, asDict(initial[schema.id]));
    } else if (schema.type === "collection") {
      node = new CollectionNode(schema, scope, asArray(initial[schema.id]));
    } else {
      const init = initial[schema.id] ?? schema.defaultValue ?? defaultValueFor(schema.type);
      node = new FieldState(schema, init as FieldValue, scope);
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
    } else if (node.kind === "group") {
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

  constructor(schema: FieldSchema, parentScope: Scope, initial: Dict) {
    this.id = schema.id;
    this.schema = schema;
    this.scope = (name) => {
      const child = this.byName.get(name);
      return child ? (nodeValue(child) as FieldValue) : parentScope(name);
    };
    const built = buildNodes(schema.fields ?? [], this.scope, initial);
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

/** Visit every leaf {@link FieldState} in a node list (descends groups/collections). */
export function eachLeaf(nodes: readonly FieldNode[], visit: (leaf: FieldState) => void): void {
  for (const node of nodes) {
    if (node.kind === "field") visit(node);
    else if (node.kind === "group") eachLeaf(node.children, visit);
    else for (const row of node.items.peek()) eachLeaf(row.group.children, visit);
  }
}

export { collectValues, resetNodes };
