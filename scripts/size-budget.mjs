#!/usr/bin/env node
/**
 * Gzipped size budget for every published entry point.
 *
 * The suite's pitch is that it is small. That claim rots the moment nobody
 * is measuring it, and it rots quietly — no test fails when a package
 * gains 4 KB. So: every entry declared in a package's `exports` gets
 * gzipped and checked against a ceiling in size-budget.json, and CI fails
 * when one is crossed.
 *
 * The ceilings are deliberately checked in rather than computed. A budget
 * you can regenerate on demand is not a budget; the point is that raising
 * one is a visible diff someone has to justify.
 *
 * Usage:
 *   node scripts/size-budget.mjs            check, exit 1 if over
 *   node scripts/size-budget.mjs --update   rewrite ceilings from actuals
 *   node scripts/size-budget.mjs --json     machine-readable, for the docs site
 *
 * Plain .mjs on purpose: this runs in CI before anything is built, and a
 * size checker that needs a TypeScript loader to tell you how big things
 * are has missed its own point.
 */
import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUDGET_FILE = join(ROOT, "size-budget.json");
const PACKAGES = join(ROOT, "packages");

/** How far under budget an entry may sit before we say the ceiling is stale. */
const SLACK = 0.1;

/**
 * Below this, "the ceiling is stale" is noise rather than signal: ceilings
 * round up to the next 0.1 KB, which on a 150-byte shim is a third of its
 * size. Only entries big enough for the rounding to be a rounding error
 * get nagged about.
 */
const STALE_FLOOR = 1024;

/**
 * Entries that exist for tests and never reach a production bundle. They
 * still get a ceiling — a leak harness can bloat too — but they are kept
 * out of the shipped total, which is the number the README quotes.
 */
const DEV_ENTRIES = new Set(["testing"]);

function isDevEntry(name) {
  const slash = name.lastIndexOf("/");
  return slash > name.indexOf("/") && DEV_ENTRIES.has(name.slice(slash + 1));
}

const args = new Set(process.argv.slice(2));
const update = args.has("--update");
const asJson = args.has("--json");

/**
 * Every ESM entry a consumer can import, as `name` → absolute file.
 *
 * Read from `exports` rather than by globbing dist, because dist also holds
 * chunks that no one imports directly; counting those would double-count
 * shared code and make the totals meaningless.
 */
function entriesFor(pkgDir, pkg) {
  const found = [];
  const exp = pkg.exports ?? { ".": { import: pkg.module ?? pkg.main } };
  for (const [subpath, target] of Object.entries(exp)) {
    const file = typeof target === "string" ? target : target?.import;
    if (typeof file !== "string") continue;
    const abs = join(pkgDir, file);
    if (!existsSync(abs)) continue;
    const name = subpath === "." ? pkg.name : `${pkg.name}${subpath.slice(1)}`;
    found.push({ name, file: abs });
  }
  return found;
}

function measure() {
  const rows = [];
  for (const dir of readdirSync(PACKAGES)) {
    const pkgDir = join(PACKAGES, dir);
    const manifest = join(pkgDir, "package.json");
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    if (pkg.private) continue;
    for (const entry of entriesFor(pkgDir, pkg)) {
      const raw = readFileSync(entry.file);
      rows.push({
        name: entry.name,
        raw: raw.byteLength,
        gzip: gzipSync(raw, { level: 9 }).byteLength,
        dev: isDevEntry(entry.name),
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function loadBudget() {
  if (!existsSync(BUDGET_FILE)) return { total: null, entries: {} };
  return JSON.parse(readFileSync(BUDGET_FILE, "utf8"));
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

const rows = measure();
if (rows.length === 0) {
  console.error("✗ No built entry points found. Run `pnpm build` first.");
  process.exit(1);
}

const total = rows.reduce((sum, r) => (r.dev ? sum : sum + r.gzip), 0);

if (asJson) {
  console.log(JSON.stringify({ total, entries: rows }, null, 2));
  process.exit(0);
}

const budget = loadBudget();

if (update) {
  const entries = {};
  for (const row of rows) {
    // Round the new ceiling up to the next 0.1 KB so a one-byte change
    // does not churn the file on every commit.
    const ceiling = Math.ceil((row.gzip * (1 + SLACK)) / 102.4) * 102.4;
    entries[row.name] = Math.round(ceiling);
  }
  const next = {
    $comment:
      "Gzipped ceilings per entry point, in bytes. Raising one should be a " +
      "deliberate, reviewable diff — regenerate with `pnpm size --update` " +
      "only when the growth is understood and intended.",
    total: Math.round(Math.ceil((total * (1 + SLACK)) / 102.4) * 102.4),
    entries,
  };
  writeFileSync(BUDGET_FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`✓ Wrote ${BUDGET_FILE} — total ceiling ${kb(next.total)}`);
  process.exit(0);
}

const over = [];
const stale = [];
const missing = [];

const width = Math.max(...rows.map((r) => r.name.length));
console.log("");
console.log(`${"entry".padEnd(width)}      gzip      budget   `);
console.log("-".repeat(width + 26));

for (const row of rows) {
  const ceiling = budget.entries?.[row.name];
  let flag = "";
  if (ceiling === undefined) {
    missing.push(row.name);
    flag = "  ← no budget";
  } else if (row.gzip > ceiling) {
    over.push({ ...row, ceiling });
    flag = `  ← OVER by ${kb(row.gzip - ceiling)}`;
  } else if (row.gzip >= STALE_FLOOR && row.gzip < ceiling * (1 - SLACK * 2)) {
    stale.push({ ...row, ceiling });
    flag = "  ← ceiling is stale";
  }
  console.log(
    `${row.name.padEnd(width)}  ${kb(row.gzip).padStart(9)}  ${(ceiling === undefined ? "—" : kb(ceiling)).padStart(9)}${row.dev ? "  (dev)" : ""}${flag}`,
  );
}

console.log("-".repeat(width + 26));
console.log(
  `${"TOTAL (shipped)".padEnd(width)}  ${kb(total).padStart(9)}  ${(budget.total ? kb(budget.total) : "—").padStart(9)}`,
);
console.log("");

if (budget.total && total > budget.total) {
  over.push({ name: "TOTAL", gzip: total, ceiling: budget.total });
}

if (missing.length > 0) {
  console.error(
    `✗ ${missing.length} entry point(s) have no budget: ${missing.join(", ")}`,
  );
  console.error("  Run `pnpm size --update` and commit the result.");
}

if (over.length > 0) {
  console.error(`✗ ${over.length} entry point(s) over budget:`);
  for (const row of over) {
    console.error(
      `    ${row.name}  ${kb(row.gzip)} > ${kb(row.ceiling)}  (+${kb(row.gzip - row.ceiling)})`,
    );
  }
  console.error("");
  console.error("  Either make it smaller, or raise the ceiling deliberately");
  console.error("  with `pnpm size --update` and say why in the commit.");
}

if (stale.length > 0) {
  console.log(
    `· ${stale.length} ceiling(s) now well above actual — worth tightening:`,
  );
  for (const row of stale) {
    console.log(`    ${row.name}  ${kb(row.gzip)} vs ${kb(row.ceiling)}`);
  }
  console.log("");
}

process.exit(over.length > 0 || missing.length > 0 ? 1 : 0);
