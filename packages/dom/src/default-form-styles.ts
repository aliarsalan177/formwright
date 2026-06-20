/** Built-in Formwright theme — scoped to `.fw-root`. Injected unless `customStyles` or `styles: false`. */
export const FORM_DEFAULT_CSS = `
.fw-root {
  --fw-bg: #ffffff;
  --fw-surface: #ffffff;
  --fw-panel: #f8fafc;
  --fw-panel-2: #f1f5f9;
  --fw-border: #e2e8f0;
  --fw-border-strong: #cbd5e1;
  --fw-text: #0f172a;
  --fw-muted: #64748b;
  --fw-accent: #6366f1;
  --fw-accent-hover: #4f46e5;
  --fw-accent-text: #ffffff;
  --fw-ok: #059669;
  --fw-err: #e11d48;
  --fw-radius: 12px;
  --fw-radius-sm: 8px;
  --fw-shadow: 0 1px 2px rgb(15 23 42 / 6%), 0 4px 16px rgb(15 23 42 / 4%);
  --fw-shadow-lg: 0 8px 30px rgb(15 23 42 / 8%);
  --fw-ring: color-mix(in srgb, var(--fw-accent) 28%, transparent);
  color: var(--fw-text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.fw-root .fw-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.fw-root .fw-layout-bottom {
  flex-direction: column;
}
.fw-root .fw-layout-main {
  flex: 1;
  min-width: 0;
}
.fw-root .fw-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.fw-root .fw-title {
  margin: 0 0 6px;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.fw-root .fw-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.fw-root .fw-field label,
.fw-root .fw-inline-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--fw-muted);
  letter-spacing: 0.01em;
}
.fw-root .fw-inline-label {
  color: var(--fw-text);
  cursor: pointer;
}
.fw-root input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="range"]),
.fw-root select,
.fw-root textarea {
  font: inherit;
  color: var(--fw-text);
  background: var(--fw-surface);
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-radius-sm);
  padding: 10px 12px;
  width: 100%;
  box-shadow: inset 0 1px 2px rgb(15 23 42 / 4%);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.fw-root input:not([type="checkbox"]):not([type="radio"]):not([type="color"]):not([type="range"]):hover,
.fw-root select:hover,
.fw-root textarea:hover {
  border-color: var(--fw-border-strong);
}
.fw-root input:focus,
.fw-root select:focus,
.fw-root textarea:focus {
  outline: none;
  border-color: var(--fw-accent);
  box-shadow: 0 0 0 3px var(--fw-ring), inset 0 1px 2px rgb(15 23 42 / 4%);
}
.fw-root .fw-phone {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.fw-root .fw-phone-country {
  position: relative;
  flex: 0 0 auto;
}
.fw-root .fw-phone-country-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--fw-text);
  background: var(--fw-surface);
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-radius-sm);
  padding: 8px 10px;
  cursor: pointer;
  box-shadow: inset 0 1px 2px rgb(15 23 42 / 4%);
  transition: border-color 0.15s, box-shadow 0.15s;
  min-width: 6.5rem;
}
.fw-root .fw-phone-country-trigger:hover:not(:disabled) {
  border-color: var(--fw-border-strong);
}
.fw-root .fw-phone-country-trigger:focus {
  outline: none;
  border-color: var(--fw-accent);
  box-shadow: 0 0 0 3px var(--fw-ring);
}
.fw-root .fw-phone-country-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.fw-root .fw-phone-flag {
  --CountryFlagIcon-height: 1.05em;
  flex-shrink: 0;
  border-radius: 2px;
  box-shadow: 0 0 0 1px rgb(15 23 42 / 8%);
}
.fw-root .fw-phone-dial {
  white-space: nowrap;
}
.fw-root .fw-phone-chevron {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--fw-muted);
}
.fw-root .fw-phone-country-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  min-width: min(18rem, 90vw);
  max-width: 22rem;
  max-height: 16rem;
  overflow: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: var(--fw-surface);
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-radius-sm);
  box-shadow: var(--fw-shadow-lg);
}
.fw-root .fw-phone-country-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  color: var(--fw-text);
  background: transparent;
  border: none;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
}
.fw-root .fw-phone-country-option:hover,
.fw-root .fw-phone-country-option[aria-selected="true"] {
  background: color-mix(in srgb, var(--fw-accent) 10%, var(--fw-panel));
}
.fw-root .fw-phone-country-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fw-root .fw-phone-country-dial {
  color: var(--fw-muted);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.fw-root .fw-phone-input {
  flex: 1;
  min-width: 0;
}
.fw-root .fw-invalid .fw-phone-country-trigger,
.fw-root .fw-invalid .fw-phone-input {
  border-color: var(--fw-err);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fw-err) 18%, transparent);
}
.fw-root .fw-help,
.fw-root .fw-description {
  color: var(--fw-muted);
  font-size: 0.8125rem;
}
.fw-root .fw-error {
  color: var(--fw-err);
  font-size: 0.8125rem;
  margin: 0;
  font-weight: 500;
}
.fw-root .fw-invalid input,
.fw-root .fw-invalid select,
.fw-root .fw-invalid textarea {
  border-color: var(--fw-err);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fw-err) 18%, transparent);
}
.fw-root .fw-heading {
  margin: 6px 0 0;
  font-size: 1.0625rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.fw-root .fw-separator {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--fw-border), transparent);
  margin: 6px 0;
}
.fw-root .fw-paragraph {
  margin: 0;
  color: var(--fw-muted);
  font-size: 0.875rem;
}
.fw-root .fw-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.fw-root .fw-field:has(.fw-switch):not(.fw-field-between),
.fw-root .fw-field:has(.fw-checkbox):not(.fw-field-between) {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}
.fw-root .fw-switch {
  appearance: none;
  width: 46px;
  height: 26px;
  border-radius: 999px;
  background: var(--fw-border-strong);
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}
.fw-root .fw-switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 20%);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.fw-root .fw-switch:checked {
  background: var(--fw-accent);
}
.fw-root .fw-switch:checked::after {
  transform: translateX(20px);
}
.fw-root .fw-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}
.fw-root .fw-actions-end { justify-content: flex-end; }
.fw-root .fw-actions-between { justify-content: space-between; }
.fw-root .fw-submit,
.fw-root .fw-action {
  font: inherit;
  font-weight: 600;
  font-size: 0.9375rem;
  border-radius: var(--fw-radius-sm);
  padding: 10px 18px;
  cursor: pointer;
  border: none;
  transition: transform 0.12s, box-shadow 0.15s, background 0.15s, opacity 0.15s;
}
.fw-root .fw-submit:active:not(:disabled),
.fw-root .fw-action:active:not(:disabled) {
  transform: translateY(1px);
}
.fw-root .fw-submit,
.fw-root .fw-action-primary {
  background: linear-gradient(180deg, color-mix(in srgb, var(--fw-accent) 92%, white), var(--fw-accent));
  color: var(--fw-accent-text);
  box-shadow: 0 1px 2px rgb(15 23 42 / 10%), 0 4px 12px color-mix(in srgb, var(--fw-accent) 35%, transparent);
}
.fw-root .fw-submit:hover:not(:disabled),
.fw-root .fw-action-primary:hover:not(:disabled) {
  background: linear-gradient(180deg, var(--fw-accent), var(--fw-accent-hover));
}
.fw-root .fw-action-secondary {
  background: var(--fw-surface);
  color: var(--fw-text);
  border: 1px solid var(--fw-border);
  box-shadow: var(--fw-shadow);
}
.fw-root .fw-action-secondary:hover:not(:disabled) {
  background: var(--fw-panel);
}
.fw-root .fw-action-danger {
  background: color-mix(in srgb, var(--fw-err) 10%, var(--fw-bg));
  color: var(--fw-err);
  border: 1px solid color-mix(in srgb, var(--fw-err) 30%, transparent);
}
.fw-root .fw-action-loading { opacity: 0.72; cursor: wait; }
.fw-root .fw-group,
.fw-root .fw-accordion {
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-radius);
  padding: 16px 18px;
  background: var(--fw-panel);
  box-shadow: var(--fw-shadow);
}
.fw-root .fw-legend,
.fw-root .fw-accordion-head {
  font-weight: 700;
  font-size: 0.9375rem;
  padding: 0;
  margin-bottom: 12px;
}
.fw-root .fw-alert,
.fw-root .fw-resume-banner,
.fw-root .fw-persist-consent {
  padding: 12px 14px;
  border-radius: var(--fw-radius-sm);
  border: 1px solid var(--fw-border);
  background: var(--fw-panel);
  font-size: 0.875rem;
  box-shadow: var(--fw-shadow);
}
.fw-root .fw-alert {
  border-color: color-mix(in srgb, var(--fw-err) 35%, transparent);
  background: color-mix(in srgb, var(--fw-err) 7%, var(--fw-bg));
}
.fw-root .fw-summary {
  flex: 0 0 min(300px, 100%);
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-radius);
  background: linear-gradient(180deg, var(--fw-surface), var(--fw-panel));
  padding: 18px 20px;
  position: sticky;
  top: 16px;
  box-shadow: var(--fw-shadow-lg);
}
.fw-root .fw-layout-bottom .fw-summary {
  position: static;
  flex: none;
  width: 100%;
}
.fw-root .fw-summary-title {
  margin: 0 0 14px;
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.fw-root .fw-summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fw-root .fw-summary-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--fw-border) 70%, transparent);
}
.fw-root .fw-summary-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.fw-root .fw-summary-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--fw-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.fw-root .fw-summary-value {
  font-size: 0.9375rem;
  font-weight: 500;
  word-break: break-word;
}
.fw-root .fw-summary-empty {
  margin: 0;
  color: var(--fw-muted);
  font-size: 0.875rem;
}
.fw-root .fw-steps-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.fw-root .fw-form-body-loading {
  pointer-events: none;
  opacity: 0.6;
}
@media (max-width: 720px) {
  .fw-root .fw-layout:not(.fw-layout-bottom) {
    flex-direction: column;
  }
  .fw-root .fw-summary {
    position: static;
    flex: none;
    width: 100%;
  }
  .fw-root .fw-phone {
    flex-direction: column;
  }
  .fw-root .fw-phone-country-menu {
    max-width: none;
    width: calc(100vw - 2rem);
    left: 0;
    right: auto;
  }
}
`;
