import { describe, expect, it } from "vitest";
import { Form } from "@formwright/core";
import { mount } from "./render.js";

describe("form summary panel", () => {
  it("renders live summary by default and omits flagged fields", () => {
    const host = document.createElement("div");
    const form = new Form(
      {
        id: "f",
        version: "1.0",
        fields: [
          { id: "name", type: "text", label: "Name" },
          { id: "secret", type: "text", label: "Secret", omitFromSummary: true },
        ],
      },
      { name: "Ada" },
      { dom: { customStyles: true } },
    );
    mount(form, host, { customStyles: true });
    expect(host.querySelector(".fw-summary")).toBeTruthy();
    const summaryText = host.querySelector(".fw-summary")?.textContent ?? "";
    expect(summaryText).toContain("Name");
    expect(summaryText).toContain("Ada");
    expect(summaryText).not.toContain("Secret");
  });

  it("hides summary when schema.summary is false", () => {
    const host = document.createElement("div");
    const form = new Form(
      {
        id: "f",
        version: "1.0",
        summary: false,
        fields: [{ id: "name", type: "text", label: "Name" }],
      },
      {},
      { dom: { customStyles: true } },
    );
    mount(form, host, { customStyles: true });
    expect(host.querySelector(".fw-summary")).toBeNull();
  });

  it("updates summary when values change", () => {
    const host = document.createElement("div");
    const form = new Form(
      { id: "f", version: "1.0", fields: [{ id: "email", type: "email", label: "Email" }] },
      {},
      { dom: { customStyles: true } },
    );
    mount(form, host, { customStyles: true });
    form.setValue("email", "a@b.com");
    expect(host.querySelector(".fw-summary-value")?.textContent).toBe("a@b.com");
  });
});
