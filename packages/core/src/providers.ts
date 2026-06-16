/**
 * Provider system — the host app injects integrations (i18n, data fetching,
 * theming) that the schema references via sigils (`{ $t }`, `{ $query }`,
 * `{ $theme }`). Providers expose plain functions (optionally signal-backed),
 * so when a locale changes or a query resolves, only bound nodes update.
 */
import type { FieldOption, FieldValue, ProviderRef, Resolvable } from "@formwright/schema";
import type { ReadSignal } from "./reactive.js";

export interface I18nProvider {
  /** Translate a key with optional interpolation args. */
  t(key: string, args?: Record<string, FieldValue>): string;
}

export interface QueryResult<T> {
  readonly data: T | undefined;
  readonly loading: boolean;
  readonly error: unknown;
}

/** Per-query options passed to {@link QueryProvider.query}. */
export interface QueryProviderOptions {
  /** When provided, the query runs only while this signal is `true` (lazy load). */
  readonly enabled?: ReadSignal<boolean>;
  /** Passthrough TanStack Query options (`staleTime`, `gcTime`, `retry`, …). */
  readonly tanstack?: Record<string, unknown>;
}

export interface QueryProvider {
  /** Return a reactive query result for a key and optional params. */
  query<T = unknown>(
    key: string,
    params?: Record<string, unknown>,
    options?: QueryProviderOptions,
  ): ReadSignal<QueryResult<T>>;
}

export interface ThemeProvider {
  token(name: string): string;
}

export interface Providers {
  readonly i18n?: I18nProvider;
  readonly query?: QueryProvider;
  readonly theme?: ThemeProvider;
  readonly [name: string]: unknown;
}

function isProviderRef(value: unknown): value is ProviderRef {
  return (
    typeof value === "object" &&
    value !== null &&
    ("$t" in value || "$query" in value || "$theme" in value)
  );
}

/**
 * Resolve a {@link Resolvable} to a concrete value using the available providers.
 * Literals pass through; sigils dispatch to the matching provider. Unresolved
 * refs fall back to a readable string so the form still renders.
 */
export function resolve<T extends FieldValue | readonly FieldOption[]>(
  value: Resolvable<T> | undefined,
  providers: Providers | undefined,
): T | undefined {
  if (value === undefined) return undefined;
  if (!isProviderRef(value)) return value;

  if ("$t" in value) {
    const i18n = providers?.i18n;
    return (i18n ? i18n.t(value.$t, value.args) : value.$t) as T;
  }
  if ("$theme" in value) {
    const theme = providers?.theme;
    return (theme ? theme.token(value.$theme) : value.$theme) as T;
  }
  // $query is async/reactive and resolved by the renderer via resolveQuery.
  return undefined;
}

/** Resolve a `$query` ref to its reactive result signal, or `null` if not a query ref. */
export function resolveQuery(
  value: unknown,
  providers: Providers | undefined,
): ReadSignal<QueryResult<unknown>> | null {
  if (!isProviderRef(value) || !("$query" in value)) return null;
  const provider = providers?.query;
  if (!provider) return null;
  const spec = value.$query;
  if (typeof spec === "string") return provider.query(spec);
  const [key, params] = spec;
  return provider.query(key, params);
}

export { isProviderRef };
