/**
 * S1: the "Quick setup" button shipped a real SIP password and the legacy
 * PBX IP in the client bundle. This scan keeps them out of `src` for good.
 * The literals are assembled at runtime so this file never contains them.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(__dirname, "../../../src");
const SCANNED = /\.(tsx?|jsx?|mjs|json|md|css)$/;

/** Legacy PBX host, assembled so the literal is not in this file. */
const LEGACY_PBX_IP = [165, 227, 166, 42].join(".");

/**
 * Files owned by another work package that still carry the IP on this
 * branch. CL-01 rewrites SipService (drops the provider allow / deny lists);
 * the integrator removes this entry once that lands.
 */
const PENDING_OTHER_PACKAGE = new Set(["services/SipService.ts"]);

function walk(dir: string, match: (name: string) => boolean = (n) => SCANNED.test(n), out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "generated") continue;
      walk(full, match, out);
    } else if (match(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("no hard-coded secrets under src", () => {
  it("settings/calls/page.tsx has no password literal", () => {
    const page = fs.readFileSync(path.join(SRC, "app/(tenant)/settings/calls/page.tsx"), "utf8");
    expect(page).not.toMatch(/password:\s*["'][^"']{6,}["']/);
    expect(page).not.toContain("setupAsteriskServer");
    expect(page).not.toContain("sip-quick-setup");
  });

  it("no source file names the legacy PBX IP", () => {
    const offenders = walk(SRC)
      .filter((f) => fs.readFileSync(f, "utf8").includes(LEGACY_PBX_IP))
      .map((f) => path.relative(SRC, f))
      .filter((f) => !PENDING_OTHER_PACKAGE.has(f));
    expect(offenders).toEqual([]);
  });

  it("the dead SIP manager and the page backups are gone", () => {
    expect(fs.existsSync(path.join(SRC, "components/SipConfigManager.tsx"))).toBe(false);
    const backups = walk(SRC, (n) => n.endsWith(".backup"));
    expect(backups).toEqual([]);
    expect(fs.existsSync(path.join(SRC, "app/(tenant)/calls/settings/page_old.tsx.backup"))).toBe(false);
  });
});
