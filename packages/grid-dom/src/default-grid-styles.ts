/** Built-in Gridwright theme — scoped to `.gw-root`. */
export const GRID_DEFAULT_CSS = `
.gw-root {
  --gw-bg: #ffffff;
  --gw-surface: #ffffff;
  --gw-panel: #f8fafc;
  --gw-panel-2: #f1f5f9;
  --gw-border: #e2e8f0;
  --gw-border-strong: #cbd5e1;
  --gw-text: #0f172a;
  --gw-muted: #64748b;
  --gw-accent: #6366f1;
  --gw-accent-soft: color-mix(in srgb, var(--gw-accent) 12%, transparent);
  --gw-ok: #059669;
  --gw-err: #e11d48;
  --gw-radius: 12px;
  --gw-shadow: 0 1px 2px rgb(15 23 42 / 6%), 0 8px 24px rgb(15 23 42 / 6%);
  color: var(--gw-text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  height: 100%;
  border: 1px solid var(--gw-border);
  border-radius: var(--gw-radius);
  overflow: hidden;
  background: var(--gw-bg);
  box-shadow: var(--gw-shadow);
  -webkit-font-smoothing: antialiased;
}
.gw-root .gw-grid {
  position: relative;
  height: 100%;
}
.gw-root .gw-grid-flow {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.gw-root .gw-grid-flow .gw-viewport {
  flex: 1;
}
.gw-root .gw-viewport {
  height: 100%;
  overflow: auto;
}
.gw-root .gw-header {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  background: linear-gradient(180deg, var(--gw-panel), var(--gw-panel-2));
  border-bottom: 1px solid var(--gw-border);
  box-shadow: 0 2px 8px rgb(15 23 42 / 4%);
}
.gw-root .gw-hcell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gw-muted);
  white-space: nowrap;
  overflow: hidden;
  border-right: 1px solid var(--gw-border);
  user-select: none;
}
.gw-root .gw-hcell.gw-sortable {
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.gw-root .gw-hcell.gw-sortable:hover {
  color: var(--gw-text);
  background: var(--gw-accent-soft);
}
.gw-root .gw-sort {
  font-size: 10px;
  color: var(--gw-accent);
}
.gw-root .gw-resize {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 7px;
  cursor: col-resize;
}
.gw-root .gw-resize:hover {
  background: var(--gw-accent);
}
.gw-root .gw-filterrow {
  display: flex;
  background: var(--gw-panel);
  border-bottom: 1px solid var(--gw-border);
}
.gw-root .gw-fcell {
  padding: 6px 10px;
  border-right: 1px solid var(--gw-border);
}
.gw-root .gw-finput {
  width: 100%;
  font: inherit;
  font-size: 12px;
  border: 1px solid var(--gw-border);
  border-radius: 8px;
  padding: 5px 8px;
  background: var(--gw-surface);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.gw-root .gw-finput:focus {
  outline: none;
  border-color: var(--gw-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--gw-accent) 22%, transparent);
}
.gw-root .gw-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid color-mix(in srgb, var(--gw-border) 65%, transparent);
  transition: background 0.12s;
}
.gw-root .gw-row.gw-row-odd {
  background: color-mix(in srgb, var(--gw-panel-2) 50%, transparent);
}
.gw-root .gw-row:hover {
  background: var(--gw-accent-soft);
}
.gw-root .gw-cell {
  display: flex;
  align-items: center;
  padding: 0 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-right: 1px solid color-mix(in srgb, var(--gw-border) 45%, transparent);
}
.gw-root .gw-cell-editable {
  cursor: text;
}
.gw-root .gw-cell-editable:hover {
  box-shadow: inset 0 0 0 1px var(--gw-border-strong);
}
.gw-root .gw-editor {
  width: 100%;
  height: 100%;
  font: inherit;
  border: 1px solid var(--gw-accent);
  padding: 0 13px;
  background: var(--gw-surface);
  border-radius: 4px;
}
.gw-root .gw-pager {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-top: 1px solid var(--gw-border);
  background: var(--gw-panel);
  font-size: 12px;
  color: var(--gw-muted);
}
.gw-root .gw-pager button {
  font: inherit;
  font-weight: 600;
  border: 1px solid var(--gw-border);
  background: var(--gw-surface);
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.gw-root .gw-pager button:hover:not(:disabled) {
  background: var(--gw-panel-2);
  border-color: var(--gw-border-strong);
}
.gw-root .gw-pager button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.gw-root .gw-empty,
.gw-root .gw-loading {
  padding: 32px;
  text-align: center;
  color: var(--gw-muted);
  font-size: 0.9375rem;
}
`;
