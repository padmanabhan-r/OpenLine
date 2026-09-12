import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { maskPhone } from "./normalize";

/**
 * Phone numbers never reach a screen. The console shows names and whether a
 * number resolved; the only strings a number could ride into are error
 * messages, and those go through maskPhone. This test keeps both true.
 */

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

describe("maskPhone", () => {
  it("keeps only the last four digits", () => {
    expect(maskPhone("+14155550114")).toBe("••• 0114");
    expect(maskPhone("415-555-0114")).toBe("••• 0114");
    expect(maskPhone("12")).toBe("•••");
  });
});

describe("no page or component renders a phone number", () => {
  const root = join(__dirname, "..", "..");
  const files = [...tsxFiles(join(root, "app")), ...tsxFiles(join(root, "components"))];

  it.each(files.map((f) => [f.replace(root, "")]))("%s", (rel) => {
    const source = readFileSync(join(root, rel), "utf8");
    // A bare interpolation of the stored number is the only way it could be
    // rendered. Boolean checks like `candidate.phoneE164 ?` are fine.
    expect(source).not.toMatch(/\{\s*[\w.]*\b(phoneE164|rawPhone)\s*\}/);
  });
});
