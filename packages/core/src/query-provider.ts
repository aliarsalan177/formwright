import type { Form } from "./form.js";
import { effect, signal, type ReadSignal } from "./reactive.js";
import type { OptionsFetcher } from "./field-options.js";
import type { QueryProvider, QueryProviderOptions, QueryResult } from "./providers.js";

/**
 * Build a {@link QueryProvider} from named fetchers — works with lazy `$query`
 * options (`lazy: true`) and optional TanStack-style options passthrough.
 */
export function createQueryProvider(fetchers: Record<string, OptionsFetcher>): QueryProvider {
  return {
    query<T = unknown>(
      key: string,
      params?: Record<string, unknown>,
      options?: QueryProviderOptions,
    ): ReadSignal<QueryResult<T>> {
      const state = signal<QueryResult<T>>({
        data: undefined,
        loading: false,
        error: undefined,
      });
      const fetcher = fetchers[key];
      if (!fetcher) {
        state.set({ data: undefined, loading: false, error: new Error(`Unknown query: ${key}`) });
        return state;
      }

      let seq = 0;
      effect(() => {
        const enabled = options?.enabled?.get() ?? true;
        if (!enabled) return;
        const run = ++seq;
        state.set({ data: state.peek().data, loading: true, error: undefined });
        void fetcher(params, { form: undefined as unknown as Form, key })
          .then((data: unknown) => {
            if (run !== seq) return;
            state.set({ data: data as T, loading: false, error: undefined });
          })
          .catch((error: unknown) => {
            if (run !== seq) return;
            state.set({ data: undefined, loading: false, error });
          });
      });
      return state;
    },
  };
}
