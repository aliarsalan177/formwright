import { describe, expect, it } from "vitest";
import { evaluateCondition, referencedFields } from "./conditions.js";
import type { Condition, FieldValue } from "@formwright/schema";

const get = (values: Record<string, FieldValue>) => (id: string) => values[id];

describe("evaluateCondition", () => {
  it("defaults to true when undefined", () => {
    expect(evaluateCondition(undefined, get({}))).toBe(true);
  });

  it("evaluates equality on a var", () => {
    const cond: Condition = { "==": [{ var: "country" }, "US"] };
    expect(evaluateCondition(cond, get({ country: "US" }))).toBe(true);
    expect(evaluateCondition(cond, get({ country: "CA" }))).toBe(false);
  });

  it("evaluates numeric comparisons", () => {
    expect(evaluateCondition({ ">": [{ var: "age" }, 18] }, get({ age: 21 }))).toBe(true);
    expect(evaluateCondition({ "<=": [{ var: "age" }, 18] }, get({ age: 21 }))).toBe(false);
  });

  it("evaluates in (array and string)", () => {
    expect(evaluateCondition({ in: [{ var: "x" }, ["a", "b"]] }, get({ x: "b" }))).toBe(true);
    expect(evaluateCondition({ in: ["ell", { var: "s" }] }, get({ s: "hello" }))).toBe(true);
  });

  it("composes and / or / not", () => {
    const cond: Condition = {
      and: [{ ">": [{ var: "age" }, 18] }, { "==": [{ var: "country" }, "US"] }],
    };
    expect(evaluateCondition(cond, get({ age: 21, country: "US" }))).toBe(true);
    expect(evaluateCondition(cond, get({ age: 21, country: "CA" }))).toBe(false);
    expect(evaluateCondition({ not: { var: "flag" } }, get({ flag: false }))).toBe(true);
    expect(evaluateCondition({ or: [false, { var: "flag" }] }, get({ flag: true }))).toBe(true);
  });

  it("treats malformed conditions as falsy", () => {
    expect(evaluateCondition({ bogus: 1 } as unknown as Condition, get({}))).toBe(false);
  });
});

describe("referencedFields", () => {
  it("collects all vars used", () => {
    const cond: Condition = {
      and: [{ "==": [{ var: "a" }, 1] }, { ">": [{ var: "b" }, { var: "c" }] }],
    };
    expect(referencedFields(cond).sort()).toEqual(["a", "b", "c"]);
  });
});
