import type { SkeletonNode } from "@formwright/core";
import { h } from "./internal.js";

function applyColSpan(el: HTMLElement, colSpan: number | undefined): void {
  if (typeof colSpan === "number") el.style.gridColumn = `span ${colSpan}`;
}

function renderFieldSkeleton(node: SkeletonNode): HTMLElement {
  const wrap = h("div", {
    class: `fw-skeleton-field fw-skeleton-${node.variant}`,
    "aria-hidden": "true",
  });
  applyColSpan(wrap, node.colSpan);

  if (node.variant === "separator") {
    wrap.appendChild(h("div", { class: "fw-skeleton-separator" }));
    return wrap;
  }
  if (node.variant === "heading") {
    wrap.appendChild(h("div", { class: "fw-skeleton-heading" }));
    return wrap;
  }
  if (node.variant === "paragraph") {
    wrap.appendChild(h("div", { class: "fw-skeleton-line fw-skeleton-line-full" }));
    wrap.appendChild(h("div", { class: "fw-skeleton-line fw-skeleton-line-medium" }));
    return wrap;
  }

  if (node.variant !== "toggle" && node.variant !== "checkbox") {
    wrap.appendChild(h("div", { class: "fw-skeleton-label" }));
  }

  if (node.variant === "textarea") {
    const lines = node.lines ?? 3;
    for (let i = 0; i < lines; i++) {
      wrap.appendChild(h("div", { class: "fw-skeleton-line fw-skeleton-line-full" }));
    }
    return wrap;
  }

  if (node.variant === "toggle" || node.variant === "checkbox") {
    const row = h("div", { class: "fw-skeleton-toggle-row" });
    row.appendChild(h("div", { class: "fw-skeleton-label fw-skeleton-label-inline" }));
    row.appendChild(h("div", { class: "fw-skeleton-switch" }));
    wrap.appendChild(row);
    return wrap;
  }

  if (node.variant === "radio") {
    wrap.appendChild(h("div", { class: "fw-skeleton-pill" }));
    wrap.appendChild(h("div", { class: "fw-skeleton-pill fw-skeleton-pill-short" }));
    return wrap;
  }

  if (node.variant === "file") {
    wrap.appendChild(h("div", { class: "fw-skeleton-dropzone" }));
    return wrap;
  }

  if (node.variant === "range") {
    wrap.appendChild(h("div", { class: "fw-skeleton-track" }));
    return wrap;
  }

  if (node.variant === "color") {
    const row = h("div", { class: "fw-skeleton-color-row" });
    row.appendChild(h("div", { class: "fw-skeleton-swatch" }));
    row.appendChild(h("div", { class: "fw-skeleton-control" }));
    wrap.appendChild(row);
    return wrap;
  }

  wrap.appendChild(h("div", { class: "fw-skeleton-control" }));
  return wrap;
}

function renderSkeletonNode(node: SkeletonNode): HTMLElement {
  if (node.kind === "group") {
    const wrap = h("div", { class: "fw-skeleton-group" });
    applyColSpan(wrap, node.colSpan);
    for (const child of node.children ?? []) wrap.appendChild(renderSkeletonNode(child));
    return wrap;
  }
  if (node.kind === "collection") {
    const wrap = h("div", { class: "fw-skeleton-collection" });
    applyColSpan(wrap, node.colSpan);
    const count = node.rows ?? 1;
    for (let i = 0; i < count; i++) {
      const item = h("div", { class: "fw-skeleton-collection-item" });
      for (const child of node.children ?? []) item.appendChild(renderSkeletonNode(child));
      wrap.appendChild(item);
    }
    return wrap;
  }
  return renderFieldSkeleton(node);
}

/** Turn a skeleton plan into DOM (unstyled hooks — apps supply shimmer CSS). */
export function renderSkeleton(plan: readonly SkeletonNode[]): HTMLElement {
  const host = h("div", {
    class: "fw-skeleton",
    role: "status",
    "aria-label": "Loading",
  });
  const grid = h("div", { class: "fw-skeleton-grid" });
  for (const node of plan) grid.appendChild(renderSkeletonNode(node));
  host.appendChild(grid);
  return host;
}
