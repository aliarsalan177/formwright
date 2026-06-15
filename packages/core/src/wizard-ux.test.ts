import { describe, expect, it, vi, beforeEach } from "vitest";
import { interpolateTemplate } from "./interpolate.js";
import { loadPersisted, savePersisted, clearPersistedKey } from "./persist.js";
import { Form } from "./form.js";
import type { FormSchema } from "@formwright/schema";

const storage = new Map<string, string>();
const session = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
});
vi.stubGlobal("sessionStorage", {
  getItem: (key: string) => session.get(key) ?? null,
  setItem: (key: string, value: string) => {
    session.set(key, value);
  },
  removeItem: (key: string) => {
    session.delete(key);
  },
  clear: () => {
    session.clear();
  },
});

describe("interpolateTemplate", () => {
  it("replaces {{key}} from response data", () => {
    expect(interpolateTemplate("Ref {{referenceId}}", { referenceId: "ABC" })).toBe("Ref ABC");
  });

  it("merges extra vars", () => {
    expect(interpolateTemplate("{{a}} {{b}}", {}, { a: "1", b: "2" })).toBe("1 2");
  });
});

describe("persist", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("round-trips values and step meta", () => {
    savePersisted("draft", { name: "Ada" }, { step: 2, stepId: "prefs" });
    const loaded = loadPersisted("draft", {});
    expect(loaded.values).toEqual({ name: "Ada" });
    expect(loaded.step).toBe(2);
    expect(loaded.stepId).toBe("prefs");
    expect(loaded.restored).toBe(true);
  });

  it("clears storage", () => {
    savePersisted("draft", { x: 1 }, {});
    clearPersistedKey("draft");
    expect(loadPersisted("draft", {}).restored).toBe(false);
  });

  it("round-trips consent flag", () => {
    savePersisted("draft", { name: "Ada" }, { consented: true });
    expect(loadPersisted("draft", {}).consented).toBe(true);
  });
});

const simpleForm: FormSchema = {
  id: "simple",
  version: "1",
  fields: [{ id: "name", type: "text" }],
  persist: { mode: "consent" },
};

describe("persist consent", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("does not write until the user grants consent", () => {
    const form = new Form(simpleForm, {}, { persistKey: "draft" });
    expect(form.persistConsented.peek()).toBe(false);
    form.setValue("name", "Ada");
    expect(form.showPersistConsent.peek()).toBe(true);
    expect(localStorage.getItem("draft")).toBeNull();
    form.grantPersistConsent();
    expect(form.persistConsented.peek()).toBe(true);
    expect(form.showPersistConsent.peek()).toBe(false);
    expect(JSON.parse(localStorage.getItem("draft")!).consented).toBe(true);
    expect(JSON.parse(localStorage.getItem("draft")!).values.name).toBe("Ada");
  });

  it("restores a consented draft after refresh", () => {
    savePersisted("draft", { name: "Ada" }, { consented: true });
    const form = new Form(simpleForm, {}, { persistKey: "draft" });
    expect(form.getValue("name")).toBe("Ada");
    expect(form.showResumeBanner.peek()).toBe(true);
    expect(form.persistConsented.peek()).toBe(true);
  });

  it("hides consent prompt when declined for the session", () => {
    const form = new Form(simpleForm, {}, { persistKey: "draft" });
    form.setValue("name", "Ada");
    expect(form.showPersistConsent.peek()).toBe(true);
    form.declinePersistConsent();
    expect(form.showPersistConsent.peek()).toBe(false);
    expect(localStorage.getItem("draft")).toBeNull();

    const again = new Form(simpleForm, {}, { persistKey: "draft" });
    again.setValue("name", "Bob");
    expect(again.showPersistConsent.peek()).toBe(false);
  });
});

const wizardWithSuccess: FormSchema = {
  id: "w",
  version: "1",
  fields: [
    {
      id: "wizard",
      type: "steps",
      fields: [
        {
          id: "one",
          type: "step",
          fields: [{ id: "name", type: "text", validation: { kind: "string", required: true } }],
        },
      ],
    },
  ],
  success: { heading: "Done", message: "ID {{id}}" },
};

describe("wizard UX", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("shows success screen after submit when schema.success is set", async () => {
    const form = new Form(
      wizardWithSuccess,
      { wizard: { one: { name: "Ada" } } },
      {
        send: async () => ({ id: "42" }),
      },
    );
    expect(form.showSuccessScreen.peek()).toBe(false);
    const res = await form.submit();
    expect(res.ok).toBe(true);
    expect(form.showSuccessScreen.peek()).toBe(true);
    expect(form.successContext().interpolate("ID {{id}}")).toBe("ID 42");
  });

  it("discardDraft clears banner and resets", () => {
    savePersisted("draft", { wizard: { one: { name: "Ada" } } }, { step: 0 });
    const form = new Form(wizardWithSuccess, {}, { persistKey: "draft" });
    expect(form.showResumeBanner.peek()).toBe(true);
    form.discardDraft();
    expect(form.showResumeBanner.peek()).toBe(false);
    expect(localStorage.getItem("draft")).toBeNull();
  });

  it("emits step events when navigating", () => {
    const twoStep: FormSchema = {
      id: "w2",
      version: "1",
      fields: [
        {
          id: "wizard",
          type: "steps",
          fields: [
            { id: "a", type: "step", fields: [{ id: "x", type: "text" }] },
            { id: "b", type: "step", fields: [{ id: "y", type: "text" }] },
          ],
        },
      ],
    };
    const form = new Form(twoStep);
    const steps = form.findSteps()!;
    const spy = vi.fn();
    form.on("step", spy);
    steps.goTo(1);
    expect(spy).toHaveBeenCalledWith({ index: 1, id: "b" });
  });
});
