import { describe, expect, it, vi } from "vitest";
import { Form } from "@formwright/core";
import { createQueryProvider } from "@formwright/core";
import { mount } from "./index.js";

describe("lazy field options", () => {
  it("loads select options on focus and keeps preload selected value", async () => {
    const fetcher = vi.fn().mockResolvedValue([
      { name: "Canada", code: "CA" },
      { name: "Mexico", code: "MX" },
    ]);
    const host = document.createElement("div");
    const form = new Form(
      {
        id: "f",
        version: "1.0",
        fields: [
          {
            id: "country",
            type: "select",
            options: {
              $query: "countries",
              lazy: true,
              preload: [{ label: "United States", value: "US" }],
              map: { label: "name", value: "code" },
            },
          },
        ],
      },
      { country: "US" },
      { providers: { query: createQueryProvider({ countries: fetcher }) } },
    );
    mount(form, host);
    const select = host.querySelector("select[name='country']") as HTMLSelectElement;
    expect(select.options.length).toBe(2); // placeholder + preload
    expect(fetcher).not.toHaveBeenCalled();

    select.dispatchEvent(new Event("focus"));
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    await vi.waitFor(() => select.options.length >= 4);

    expect(select.value).toBe("US");
    expect([...select.options].some((o) => o.value === "CA")).toBe(true);
  });
});
