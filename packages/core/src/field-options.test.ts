import { describe, expect, it, vi } from "vitest";
import { Form } from "./form.js";
import {
  createFieldOptionsController,
  mapToFieldOptions,
  parseOptionsQuery,
} from "./field-options.js";
import { createQueryProvider } from "./query-provider.js";

describe("parseOptionsQuery", () => {
  it("parses lazy query config with preload and map", () => {
    const spec = parseOptionsQuery({
      $query: ["countries", { region: "eu" }],
      lazy: true,
      preload: [{ label: "Germany", value: "DE" }],
      map: { label: "name", value: "code" },
      transform: "unwrap",
      tanstack: { staleTime: 60_000 },
    });
    expect(spec).toEqual({
      key: "countries",
      params: { region: "eu" },
      lazy: true,
      preload: [{ label: "Germany", value: "DE" }],
      map: { label: "name", value: "code" },
      transform: "unwrap",
      tanstack: { staleTime: 60_000 },
    });
  });
});

describe("mapToFieldOptions", () => {
  it("maps API rows using label/value keys", () => {
    expect(
      mapToFieldOptions(
        [
          { name: "Canada", code: "CA" },
          { name: "United States", code: "US" },
        ],
        { label: "name", value: "code" },
      ),
    ).toEqual([
      { label: "Canada", value: "CA" },
      { label: "United States", value: "US" },
    ]);
  });
});

describe("createFieldOptionsController", () => {
  it("keeps preload visible and fetches lazily on requestLoad", async () => {
    const fetcher = vi.fn().mockResolvedValue([
      { name: "Canada", code: "CA" },
      { name: "Mexico", code: "MX" },
    ]);
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
      {
        providers: { query: createQueryProvider({ countries: fetcher }) },
      },
    );
    const field = form.field("country")!;
    const source = createFieldOptionsController(form, field)!;

    expect(source.options.get()).toEqual([{ label: "United States", value: "US" }]);
    expect(fetcher).not.toHaveBeenCalled();

    source.requestLoad();
    await vi.waitFor(() => expect(source.loading.get()).toBe(false));

    expect(fetcher).toHaveBeenCalledOnce();
    expect(source.options.get()).toEqual([
      { label: "United States", value: "US" },
      { label: "Canada", value: "CA" },
      { label: "Mexico", value: "MX" },
    ]);
    source.dispose();
  });

  it("applies optionsTransforms before map", async () => {
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
              map: { label: "name", value: "code" },
              transform: "unwrap",
            },
          },
        ],
      },
      {},
      {
        providers: {
          query: createQueryProvider({
            countries: async () => ({ items: [{ name: "France", code: "FR" }] }),
          }),
        },
        optionsTransforms: {
          unwrap: (data) => (data as { items: unknown }).items,
        },
      },
    );
    const source = createFieldOptionsController(form, form.field("country")!)!;
    await vi.waitFor(() => expect(source.options.get().length).toBe(1));
    expect(source.options.get()[0]).toEqual({ label: "France", value: "FR" });
    source.dispose();
  });
});
