import { toCsv, type CsvOptions, type Grid } from "@gridwright/core";

/** Trigger a browser download of the grid's rows as a CSV file. */
export function downloadCsv(grid: Grid, filename = "export.csv", options?: CsvOptions): void {
  const csv = toCsv(grid, options);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
