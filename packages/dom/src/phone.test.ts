import { describe, expect, it } from "vitest";
import { Form } from "@formwright/core";
import { mount } from "./render.js";
import { registerPhoneField } from "./phone.js";

registerPhoneField();

describe("phone field", () => {
  it("renders country selector and national input", () => {
    const host = document.createElement("div");
    const form = new Form(
      {
        id: "f",
        version: "1.0",
        fields: [
          {
            id: "mobile",
            type: "phone",
            label: "Mobile",
            phone: { defaultCountry: "US", preferredCountries: ["US", "GB"] },
            validation: { required: true },
          },
        ],
      },
      {},
      { dom: { customStyles: true } },
    );
    mount(form, host, { customStyles: true });
    expect(host.querySelector(".fw-phone")).toBeTruthy();
    expect(host.querySelector(".fw-phone-country-trigger")).toBeTruthy();
    expect(host.querySelector(".fw-phone-flag.flag\\:US")).toBeTruthy();
    expect(host.querySelector(".fw-phone-input")).toBeTruthy();
  });

  it("opens country menu with flag options", () => {
    const host = document.createElement("div");
    const form = new Form(
      {
        id: "f",
        version: "1.0",
        fields: [{ id: "mobile", type: "phone", label: "Mobile" }],
      },
      {},
      { dom: { customStyles: true } },
    );
    mount(form, host, { customStyles: true });
    const trigger = host.querySelector(".fw-phone-country-trigger") as HTMLButtonElement;
    trigger.click();
    const menu = host.querySelector(".fw-phone-country-menu") as HTMLElement;
    expect(menu.hidden).toBe(false);
    expect(menu.querySelectorAll(".fw-phone-flag").length).toBeGreaterThan(100);
  });

  it("validates national number for the selected country", () => {
    const host = document.createElement("div");
    const form = new Form(
      {
        id: "f",
        version: "1.0",
        fields: [{ id: "mobile", type: "phone", label: "Mobile" }],
      },
      { mobile: { country: "US", national: "555" } },
      { dom: { customStyles: true } },
    );
    mount(form, host, { customStyles: true });
    expect(form.field("mobile")!.validate()).toMatch(/valid phone/i);

    form.setValue("mobile", { country: "US", national: "(202) 555-0100" });
    expect(form.field("mobile")!.validate()).toBeNull();
  });

  it("stores { country, national } in the payload", () => {
    const form = new Form({
      id: "f",
      version: "1.0",
      fields: [{ id: "mobile", type: "phone", label: "Mobile" }],
    });
    form.setValue("mobile", { country: "GB", national: "7700 900123" });
    expect(form.getValue("mobile")).toEqual({ country: "GB", national: "7700 900123" });
  });
});
