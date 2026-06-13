// Reactivity facade
export {
  signal,
  computed,
  effect,
  untrack,
  batch,
  isTracking,
  type ReadSignal,
  type WriteSignal,
  type Dispose,
} from "./reactive.js";

// Condition engine
export { evaluateCondition, referencedFields, type ValueGetter } from "./conditions.js";

// Validation
export { compileValidator, type FieldValidator } from "./validation.js";

// Providers
export {
  resolve,
  resolveQuery,
  isProviderRef,
  type Providers,
  type I18nProvider,
  type QueryProvider,
  type QueryResult,
  type ThemeProvider,
} from "./providers.js";

// Model
export { FieldState } from "./model.js";

// Form
export {
  Form,
  FormValidationError,
  setDefaultRenderer,
  type FormOptions,
  type FormValues,
  type FormErrors,
  type FormRenderer,
  type Transform,
  type SuccessHandler,
  type ErrorHandler,
} from "./form.js";

// Re-export schema types for convenience
export type {
  FormSchema,
  FieldSchema,
  FieldValue,
  FieldOption,
  Condition,
} from "@formwright/schema";
