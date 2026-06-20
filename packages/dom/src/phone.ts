/**
 * International phone field — country picker with SVG flags, national input,
 * AsYouType formatting, and libphonenumber validation per country.
 */
import { registerFormatValidator } from "@formwright/core";
import type { FieldValue, PhoneValue } from "@formwright/schema";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { bindDisabled, on, Scope } from "./internal.js";
import { createFlagIcon, injectFlagStyles, setFlagIcon } from "./phone-flags.js";
import { registerWidget, type WidgetContext } from "./widgets.js";

export { flagEmoji, createFlagIcon, injectFlagStyles, setFlagIcon } from "./phone-flags.js";

export function isPhoneValue(value: unknown): value is PhoneValue {
  return typeof value === "object" && value !== null && "country" in value && "national" in value;
}

function detectDefaultCountry(fallback: string): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    const part = navigator.language.split("-")[1];
    if (part && part.length === 2) return part.toUpperCase();
  }
  return fallback;
}

interface CountryEntry {
  readonly code: CountryCode;
  readonly name: string;
  readonly dial: string;
}

let countryEntries: CountryEntry[] | null = null;

function allCountries(): CountryEntry[] {
  if (countryEntries) return countryEntries;
  const display =
    typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  countryEntries = getCountries()
    .map((code) => ({
      code,
      name: display?.of(code) ?? code,
      dial: `+${getCountryCallingCode(code)}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return countryEntries;
}

function orderedCountries(preferred: readonly string[] | undefined): CountryEntry[] {
  const all = allCountries();
  if (!preferred?.length) return all;
  const pref = new Set(preferred.map((c) => c.toUpperCase()));
  const top = preferred
    .map((c) => all.find((e) => e.code === c.toUpperCase()))
    .filter((e): e is CountryEntry => !!e);
  const rest = all.filter((e) => !pref.has(e.code));
  return [...top, ...rest];
}

export function normalizePhoneValue(value: FieldValue, defaultCountry: string): PhoneValue {
  if (isPhoneValue(value)) {
    return {
      country: value.country.toUpperCase(),
      national: String(value.national ?? ""),
    };
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed) {
      return {
        country: parsed.country ?? defaultCountry,
        national: parsed.formatNational(),
      };
    }
  }
  return { country: defaultCountry, national: "" };
}

export function formatPhoneDisplay(value: PhoneValue): string {
  if (!value.national.replace(/\D/g, "")) return "";
  try {
    const parsed = parsePhoneNumberFromString(value.national, value.country as CountryCode);
    return parsed?.formatInternational() ?? value.national;
  } catch {
    return value.national;
  }
}

export function validatePhoneValue(value: FieldValue): string | null {
  if (!isPhoneValue(value)) return "Enter a valid phone number";
  const digits = String(value.national).replace(/\D/g, "");
  if (!digits) return null;
  try {
    if (!isValidPhoneNumber(value.national, value.country as CountryCode)) {
      return "Enter a valid phone number for the selected country";
    }
  } catch {
    return "Enter a valid phone number";
  }
  return null;
}

registerFormatValidator("phone", validatePhoneValue);

/** Register the built-in phone widget and format validator. Called from package entry. */
export function registerPhoneField(): void {
  injectFlagStyles();
  registerWidget("phone", phoneWidget);
}

function dialFor(code: string, entries: CountryEntry[]): string {
  return (
    entries.find((e) => e.code === code)?.dial ?? `+${getCountryCallingCode(code as CountryCode)}`
  );
}

function createCountryPicker(
  entries: CountryEntry[],
  getCountry: () => string,
  onSelect: (code: string) => void,
  scope: Scope,
  isDisabled: () => boolean,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "fw-phone-country";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "fw-phone-country-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const triggerFlag = createFlagIcon(getCountry());
  const triggerDial = document.createElement("span");
  triggerDial.className = "fw-phone-dial";
  const chevron = document.createElement("span");
  chevron.className = "fw-phone-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "▾";
  trigger.append(triggerFlag, triggerDial, chevron);

  const menu = document.createElement("ul");
  menu.className = "fw-phone-country-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  for (const entry of entries) {
    const item = document.createElement("li");
    item.setAttribute("role", "presentation");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fw-phone-country-option";
    btn.setAttribute("role", "option");
    btn.dataset.code = entry.code;
    const flag = createFlagIcon(entry.code);
    const name = document.createElement("span");
    name.className = "fw-phone-country-name";
    name.textContent = entry.name;
    const dial = document.createElement("span");
    dial.className = "fw-phone-country-dial";
    dial.textContent = entry.dial;
    btn.append(flag, name, dial);
    item.append(btn);
    menu.append(item);

    on(scope, btn, "click", () => {
      onSelect(entry.code);
      closeMenu();
      trigger.focus();
    });
  }

  const closeMenu = (): void => {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };

  const openMenu = (): void => {
    if (isDisabled()) return;
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    const selected = menu.querySelector(`[data-code="${getCountry()}"]`) as HTMLElement | null;
    selected?.scrollIntoView?.({ block: "nearest" });
  };

  on(scope, trigger, "click", () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  on(scope, trigger, "keydown", (ev) => {
    const e = ev as KeyboardEvent;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
    }
    if (e.key === "Escape") closeMenu();
  });

  scope.add(() => {
    const onDoc = (ev: Event) => {
      if (!root.contains(ev.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  });

  scope.bind(() => {
    const code = getCountry();
    setFlagIcon(triggerFlag, code);
    triggerDial.textContent = dialFor(code, entries);
    for (const btn of menu.querySelectorAll<HTMLElement>(".fw-phone-country-option")) {
      btn.setAttribute("aria-selected", btn.dataset.code === code ? "true" : "false");
    }
  });

  bindDisabled(scope, trigger, isDisabled);

  root.append(trigger, menu);
  return root;
}

function phoneWidget(ctx: WidgetContext): HTMLElement {
  const { form, field, scope } = ctx;
  const spec = field.schema.phone;
  const fallback = (spec?.defaultCountry ?? "US").toUpperCase();
  const defaultCountry = detectDefaultCountry(fallback);
  const entries = orderedCountries(spec?.preferredCountries);

  const wrap = document.createElement("div");
  wrap.className = "fw-phone";

  const input = document.createElement("input");
  input.type = "tel";
  input.className = "fw-phone-input";
  input.id = field.domId;
  input.name = field.id;
  input.setAttribute("autocomplete", field.schema.autocomplete ?? "tel");

  const commit = (next: PhoneValue): void => {
    form.setFieldValue(field, next);
  };

  const read = (): PhoneValue => normalizePhoneValue(field.value.peek(), defaultCountry);

  const formatNational = (country: string, national: string): string => {
    const typer = new AsYouType(country as CountryCode);
    return typer.input(national);
  };

  let countryCode = read().country;

  const countryPicker = createCountryPicker(
    entries,
    () => countryCode,
    (code) => {
      const current = read();
      countryCode = code;
      commit({
        country: code,
        national: formatNational(code, current.national),
      });
    },
    scope,
    () => !field.enabled.get(),
  );

  scope.bind(() => {
    const current = read();
    countryCode = current.country;
    const formatted = formatNational(current.country, current.national);
    if (input.value !== formatted) input.value = formatted;
  });

  on(scope, input, "input", () => {
    const country = countryCode;
    commit({ country, national: formatNational(country, input.value) });
  });

  bindDisabled(scope, input, () => !field.enabled.get());

  wrap.append(countryPicker, input);
  return wrap;
}
