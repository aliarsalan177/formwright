import type { FormValues } from "./form.js";

export interface PersistedForm {
  readonly values: FormValues;
  readonly step?: number;
  readonly stepId?: string;
  /** Set when the user opted in to local draft storage (`persist.mode: "consent"`). */
  readonly consented?: boolean;
}

export interface PersistLoadResult {
  readonly values: FormValues;
  readonly restored: boolean;
  readonly step?: number;
  readonly stepId?: string;
  readonly consented?: boolean;
}

/** Load draft from `localStorage`, supporting legacy value-only blobs. */
export function loadPersisted(key: string | undefined, initial: FormValues): PersistLoadResult {
  if (!key || typeof localStorage === "undefined") {
    return { values: initial, restored: false };
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { values: initial, restored: false };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed !== null && typeof parsed === "object" && "values" in (parsed as object)) {
      const bag = parsed as PersistedForm;
      const values = { ...initial, ...bag.values };
      const restored = hasDraftContent(values, initial);
      return {
        values,
        restored,
        ...(bag.step !== undefined ? { step: bag.step } : {}),
        ...(bag.stepId !== undefined ? { stepId: bag.stepId } : {}),
        ...(bag.consented !== undefined ? { consented: bag.consented } : {}),
      };
    }
    const values = { ...initial, ...(parsed as FormValues) };
    return { values, restored: hasDraftContent(values, initial) };
  } catch {
    return { values: initial, restored: false };
  }
}

export function savePersisted(
  key: string,
  values: FormValues,
  meta: { step?: number; stepId?: string; consented?: boolean },
): void {
  try {
    const payload: PersistedForm = {
      values,
      ...(meta.step !== undefined ? { step: meta.step } : {}),
      ...(meta.stepId !== undefined ? { stepId: meta.stepId } : {}),
      ...(meta.consented !== undefined ? { consented: meta.consented } : {}),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* storage unavailable */
  }
}

export function clearPersistedKey(key: string | undefined): void {
  if (!key || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Session flag: user declined consent for this storage key (re-ask on next visit). */
export function isPersistDeclined(key: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(declineKey(key)) === "1";
  } catch {
    return false;
  }
}

export function setPersistDeclined(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(declineKey(key), "1");
  } catch {
    /* ignore */
  }
}

export function clearPersistDeclined(key: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(declineKey(key));
  } catch {
    /* ignore */
  }
}

export function hasDraftContent(values: FormValues, initial: FormValues): boolean {
  return JSON.stringify(values) !== JSON.stringify(initial);
}

function declineKey(key: string): string {
  return `${key}:declined`;
}
