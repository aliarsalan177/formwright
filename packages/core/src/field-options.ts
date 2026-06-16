import type { FieldOption, OptionsMapper, OptionsQueryRef } from "@formwright/schema";
import type { FieldState } from "./model.js";
import type { Form } from "./form.js";
import { computed, effect, signal, untrack, type Dispose, type ReadSignal } from "./reactive.js";
import { isProviderRef, resolve, type QueryProviderOptions } from "./providers.js";

export interface OptionsQuerySpec {
  readonly key: string;
  readonly params?: Record<string, unknown>;
  readonly lazy: boolean;
  readonly map?: OptionsMapper;
  readonly transform?: string;
  readonly preload: readonly FieldOption[];
  readonly tanstack?: Record<string, unknown>;
}

export type OptionsTransform = (data: unknown, form: Form) => unknown;

export type OptionsFetcher = (
  params: Record<string, unknown> | undefined,
  ctx: { form: Form; key: string },
) => Promise<unknown>;

function isOptionsQueryRef(value: unknown): value is OptionsQueryRef {
  return isProviderRef(value) && "$query" in value;
}

/** Parse a field's `options` when it is an async/lazy `$query` ref. */
export function parseOptionsQuery(value: unknown): OptionsQuerySpec | null {
  if (!isOptionsQueryRef(value)) return null;
  const spec = value.$query;
  const key = typeof spec === "string" ? spec : spec[0];
  const params = typeof spec === "string" ? undefined : spec[1];
  return {
    key,
    lazy: value.lazy === true,
    preload: value.preload ?? [],
    ...(params ? { params } : {}),
    ...(value.map ? { map: value.map } : {}),
    ...(value.transform ? { transform: value.transform } : {}),
    ...(value.tanstack ? { tanstack: value.tanstack } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

/** Map an API payload to {@link FieldOption} rows using a mapper config. */
export function mapToFieldOptions(data: unknown, map: OptionsMapper): readonly FieldOption[] {
  const rows = Array.isArray(data) ? data : [];
  const out: FieldOption[] = [];
  for (const row of rows) {
    const rec = asRecord(row);
    if (!rec) continue;
    const label = rec[map.label];
    const value = rec[map.value];
    if (value === undefined) continue;
    out.push({
      label: typeof label === "string" || typeof label === "number" ? String(label) : String(value),
      value: value as FieldOption["value"],
    });
  }
  return out;
}

function mergeOptions(
  preload: readonly FieldOption[],
  fetched: readonly FieldOption[],
): readonly FieldOption[] {
  const seen = new Set<string>();
  const out: FieldOption[] = [];
  for (const opt of [...preload, ...fetched]) {
    const key = String(opt.value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(opt);
  }
  return out;
}

function applyPipeline(raw: unknown, spec: OptionsQuerySpec, form: Form): readonly FieldOption[] {
  let data = raw;
  if (spec.transform) {
    const fn = form.options.optionsTransforms?.[spec.transform];
    if (fn) data = fn(data, form);
  }
  if (spec.map) return mapToFieldOptions(data, spec.map);
  if (Array.isArray(data)) return data as readonly FieldOption[];
  return [];
}

export interface FieldOptionsController {
  readonly options: ReadSignal<readonly FieldOption[]>;
  readonly loading: ReadSignal<boolean>;
  readonly error: ReadSignal<unknown | null>;
  /** Start fetching when `lazy` is enabled (no-op for eager queries). */
  requestLoad(): void;
  dispose(): void;
}

function staticOptions(form: Form, field: FieldState): readonly FieldOption[] | null {
  const literal = resolve(field.schema.options, form.options.providers);
  if (Array.isArray(literal)) return literal as readonly FieldOption[];
  return null;
}

/** Reactive options source for select/radio/checkbox groups (static, eager, or lazy `$query`). */
export function createFieldOptionsController(
  form: Form,
  field: FieldState,
): FieldOptionsController | null {
  const staticOpts = staticOptions(form, field);
  const spec = parseOptionsQuery(field.schema.options);
  if (!spec) {
    if (staticOpts) {
      const options = signal(staticOpts);
      const loading = signal(false);
      const error = signal<unknown | null>(null);
      return {
        options,
        loading,
        error,
        requestLoad: () => undefined,
        dispose: () => undefined,
      };
    }
    return null;
  }

  const enabled = signal(!spec.lazy);
  const fetched = signal<readonly FieldOption[]>([]);
  const loading = signal(false);
  const error = signal<unknown | null>(null);

  const options = computed(() =>
    mergeOptions(spec.preload, [...(staticOpts ?? []), ...fetched.get()]),
  );

  const provider = form.options.providers?.query;
  const providerOpts: QueryProviderOptions = {
    enabled,
    ...(spec.tanstack ? { tanstack: spec.tanstack } : {}),
  };

  let disposeQuery: Dispose | null = null;

  if (provider) {
    const result = provider.query(spec.key, spec.params, providerOpts);
    disposeQuery = effect(() => {
      if (spec.lazy && !enabled.get()) return;
      const r = result.get();
      loading.set(r.loading);
      error.set(r.error ?? null);
      if (r.data !== undefined) {
        fetched.set(applyPipeline(r.data, spec, form));
      }
    });
  } else {
    const fetcher = form.options.optionsFetch?.[spec.key];
    if (!fetcher) {
      return {
        options,
        loading,
        error,
        requestLoad: () => undefined,
        dispose: () => disposeQuery?.(),
      };
    }
    let inflight: Promise<void> | null = null;
    const runFetch = () => {
      if (inflight) return inflight;
      loading.set(true);
      error.set(null);
      inflight = fetcher(spec.params, { form, key: spec.key })
        .then((raw) => {
          fetched.set(applyPipeline(raw, spec, form));
        })
        .catch((err) => {
          error.set(err);
        })
        .finally(() => {
          loading.set(false);
          inflight = null;
        });
      return inflight;
    };
    disposeQuery = effect(() => {
      if (!enabled.get()) return;
      void runFetch();
    });
  }

  return {
    options,
    loading,
    error,
    requestLoad() {
      if (!spec.lazy) return;
      if (!enabled.peek()) enabled.set(true);
      else if (!provider && form.options.optionsFetch?.[spec.key]) {
        untrack(() => {
          if (!loading.peek() && fetched.peek().length === 0) {
            enabled.set(true);
          }
        });
      }
    },
    dispose() {
      disposeQuery?.();
    },
  };
}
