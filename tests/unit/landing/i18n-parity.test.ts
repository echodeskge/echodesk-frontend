/**
 * en/ka parity for the `landing` namespace: identical key sets, no empty
 * strings, matching ICU arguments, real Georgian in ka (Latin only for
 * brand names / identifiers), and the copy rules (30-day trial, no
 * "14-day", Germany/Hetzner hosting).
 */
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

type Tree = { [k: string]: string | Tree };

function flatten(obj: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === "object") Object.assign(out, flatten(v, `${prefix}${k}.`));
    else out[`${prefix}${k}`] = v as string;
  }
  return out;
}

function icuArgs(message: string): string[] {
  const names = new Set<string>();
  const re = /\{\s*([A-Za-z_][\w]*)\s*(?=[,}])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(message))) names.add(m[1]);
  return [...names].sort();
}

const enFlat = flatten((en as unknown as Tree).landing as Tree);
const kaFlat = flatten((ka as unknown as Tree).landing as Tree);

/** ka strings that are legitimately Latin: identifiers, brand names, numbers. */
const LATIN_OK = new Set([
  "hero.mock.workspace",
  "hero.mock.url",
  "hero.mock.ticket",
  "hero.mock.channelLine",
]);

describe("landing i18n", () => {
  it("has identical key sets in en and ka", () => {
    expect(Object.keys(kaFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it("has no empty strings and matching ICU arguments", () => {
    for (const [key, value] of Object.entries(enFlat)) {
      expect(value.trim(), key).not.toBe("");
      expect(kaFlat[key].trim(), key).not.toBe("");
      // Plural/select branches are language-specific (ka has no plural forms here).
      if (!/,\s*(plural|select)\s*,/.test(value)) {
        expect(icuArgs(kaFlat[key]), key).toEqual(icuArgs(value));
      }
    }
  });

  it("ka strings contain Georgian letters unless they are identifiers or brand names", () => {
    const offenders = Object.entries(kaFlat)
      .filter(([key, value]) => !LATIN_OK.has(key) && !/[ა-ჿ]/.test(value))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("follows the copy rules in both locales", () => {
    for (const flat of [enFlat, kaFlat]) {
      const all = Object.values(flat).join("\n");
      expect(all).not.toMatch(/14[- ]?day/i);
      expect(all).not.toMatch(/14[- ]?დღ/);
      expect(all).not.toMatch(/hundreds of businesses/i);
      expect(all).not.toMatch(/Frankfurt|DigitalOcean/);
      expect(all).toContain("Hetzner");
    }
    expect(enFlat["cta.noCreditCard"]).toBe("30 days free • no card needed");
    expect(kaFlat["cta.noCreditCard"]).toContain("30 დღე");
    expect(kaFlat["pricing.stepper.value"]).toContain("თანამშრომელ");
    expect(kaFlat["features.inboxNote"]).toBe("უკავშირდება პარამეტრებიდან → არხები");
  });
});
