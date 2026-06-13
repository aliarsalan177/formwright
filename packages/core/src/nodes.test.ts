import { describe, expect, it } from "vitest";
import { Form } from "./form.js";
import { CollectionNode, GroupNode } from "./nodes.js";
import { FieldState } from "./model.js";
import type { FormSchema } from "@formwright/schema";

const schema: FormSchema = {
  id: "checkout",
  version: "1.0",
  fields: [
    // Outer toggle that hides fields nested inside the group and the collection.
    { id: "reuseBilling", type: "toggle", label: "Reuse billing" },
    {
      id: "billingAddress",
      type: "group",
      fields: [
        { id: "name", type: "text", validation: { kind: "string", required: true } },
        { id: "city", type: "text" },
        { id: "note", type: "text", visibleWhen: { not: { var: "reuseBilling" } } },
      ],
    },
    {
      id: "contacts",
      type: "collection",
      minItems: 1,
      maxItems: 3,
      fields: [
        { id: "name", type: "text", validation: { kind: "string", required: true } },
        { id: "relation", type: "select", options: [{ label: "Colleague", value: "colleague" }] },
        // Sibling condition inside the row.
        { id: "company", type: "text", visibleWhen: { "==": [{ var: "relation" }, "colleague"] } },
        // Outer-toggle condition, resolved up the scope chain from the row.
        { id: "address", type: "text", visibleWhen: { not: { var: "reuseBilling" } } },
      ],
    },
  ],
};

describe("groups", () => {
  it("aggregates child values into a nested object", () => {
    const form = new Form(schema, { billingAddress: { name: "Ada", city: "London" } });
    expect(form.values.peek().billingAddress).toEqual({
      name: "Ada",
      city: "London",
      note: "",
    });
  });

  it("addresses nested leaves by dotted path", () => {
    const form = new Form(schema);
    form.setValue("billingAddress.name", "Grace");
    expect(form.getValue("billingAddress.name")).toBe("Grace");
    expect(form.fields.get("billingAddress.name")).toBeDefined();
  });
});

describe("collections", () => {
  it("seeds minItems rows and produces an array of objects", () => {
    const form = new Form(schema);
    const contacts = form.tree.find((n) => n.id === "contacts") as CollectionNode;
    expect(contacts.items.peek().length).toBe(1); // minItems
    expect(Array.isArray(form.values.peek().contacts)).toBe(true);
  });

  it("add/remove honour min and max", () => {
    const form = new Form(schema);
    const contacts = form.tree.find((n) => n.id === "contacts") as CollectionNode;
    contacts.add();
    contacts.add();
    expect(contacts.items.peek().length).toBe(3);
    contacts.add(); // at maxItems — no-op
    expect(contacts.items.peek().length).toBe(3);
    contacts.removeAt(0);
    contacts.removeAt(0);
    expect(contacts.items.peek().length).toBe(1);
    contacts.removeAt(0); // at minItems — no-op
    expect(contacts.items.peek().length).toBe(1);
  });

  it("each row carries independent values", () => {
    const form = new Form(schema, {
      contacts: [{ name: "A" }, { name: "B" }],
    });
    const values = form.values.peek().contacts as Array<{ name: string }>;
    expect(values.map((c) => c.name)).toEqual(["A", "B"]);
    expect(values.length).toBe(2);
  });
});

describe("cross-scope conditions", () => {
  it("an outer toggle hides fields inside a group and inside collection rows", () => {
    const form = new Form(schema);
    const group = form.tree.find((n) => n.id === "billingAddress") as GroupNode;
    const note = group.byName.get("note")!;
    const contacts = form.tree.find((n) => n.id === "contacts") as CollectionNode;
    const rowAddress = contacts.items.peek()[0]!.group.byName.get("address")!;

    // reuseBilling defaults to false → nested fields visible.
    expect(note.visible.peek()).toBe(true);
    expect(rowAddress.visible.peek()).toBe(true);

    form.setValue("reuseBilling", true);
    expect(note.visible.peek()).toBe(false);
    expect(rowAddress.visible.peek()).toBe(false);
  });

  it("excludes hidden fields from the payload, including inside groups and rows", () => {
    const form = new Form(schema, {
      reuseBilling: true, // hides billingAddress.note and every row's `address`
      billingAddress: { name: "Ada", city: "London", note: "secret" },
      contacts: [{ name: "Grace", address: "1 St" }],
    });
    const values = form.values.peek();
    expect(values.billingAddress).toEqual({ name: "Ada", city: "London" }); // note hidden → gone
    const contacts = values.contacts as Array<Record<string, unknown>>;
    // address hidden (reuseBilling) and company hidden (relation != colleague) → both gone;
    // relation has no condition, so it stays (empty).
    expect(contacts[0]).toEqual({ name: "Grace", relation: "" });
  });

  it("a sibling condition inside a row resolves to that row's value", () => {
    const form = new Form(schema);
    const contacts = form.tree.find((n) => n.id === "contacts") as CollectionNode;
    const row = contacts.items.peek()[0]!.group;
    const company = row.byName.get("company")!;

    expect(company.visible.peek()).toBe(false);
    (row.byName.get("relation") as FieldState).value.set("colleague");
    expect(company.visible.peek()).toBe(true);
  });
});
