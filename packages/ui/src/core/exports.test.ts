import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("package entry points", () => {
  it("list every component folder", () => {
    // Fails when a component was added without regenerating exports, which
    // would otherwise publish a component nobody can import.
    const script = join(dirname(fileURLToPath(import.meta.url)), "../../scripts/sync-exports.mjs");
    expect(() =>
      execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" }),
    ).not.toThrow();
  });
});
