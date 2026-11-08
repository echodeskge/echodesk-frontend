/**
 * en/ka parity for the tickets namespaces (plan §5.1 i18n rule, RM5).
 *
 * - `tickets`, `ticketsScreen` and `timeTracking` have identical key sets in
 *   en and ka, no empty strings, matching ICU arguments, and valid ICU.
 * - Every src/i18n/pending/*.json work-package file has en/ka parity.
 * - The pending directory must be empty only in the integration gate
 *   (CI_INTEGRATION=1); work packages may leave files there.
 * - format.ts' month and relative-time tables equal the catalog strings.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import { MONTHS_SHORT, RELATIVE_LABELS } from "@/app/(tenant)/tickets/_lib/format";

type Tree = { [k: string]: string | Tree };
const NAMESPACES = ["tickets", "ticketsScreen", "timeTracking"] as const;
const PENDING_DIR = path.resolve(__dirname, "../../../src/i18n/pending");

function flatten(obj: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === "object") Object.assign(out, flatten(v, `${prefix}${k}.`));
    else out[`${prefix}${k}`] = v as string;
  }
  return out;
}

/** ICU argument names, including ones nested inside plural/select branches. */
function icuArgs(message: string): string[] {
  const names = new Set<string>();
  const re = /\{\s*([A-Za-z_][\w]*)\s*(?=[,}])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(message))) names.add(m[1]);
  return [...names].sort();
}

/** Dummy values for every argument so the formatter exercises the whole message. */
function dummyValues(message: string): Record<string, string | number> {
  return Object.fromEntries(icuArgs(message).map((a) => [a, /count|total|done|index|max/.test(a) ? 2 : "x"]));
}

const enAll = en as unknown as Tree;
const kaAll = ka as unknown as Tree;

describe.each(NAMESPACES)("namespace %s", (ns) => {
  const enFlat = flatten((enAll[ns] ?? {}) as Tree);
  const kaFlat = flatten((kaAll[ns] ?? {}) as Tree);

  it("exists in both locales", () => {
    expect(enAll[ns]).toBeTypeOf("object");
    expect(kaAll[ns]).toBeTypeOf("object");
  });

  it("has identical key sets in en and ka", () => {
    const enKeys = Object.keys(enFlat).sort();
    const kaKeys = Object.keys(kaFlat).sort();
    expect(enKeys.filter((k) => !(k in kaFlat))).toEqual([]);
    expect(kaKeys.filter((k) => !(k in enFlat))).toEqual([]);
  });

  it("has no empty strings", () => {
    const empty = [...Object.entries(enFlat), ...Object.entries(kaFlat)]
      .filter(([, v]) => typeof v !== "string" || v.trim() === "")
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it("uses the same ICU arguments in both locales", () => {
    const mismatched = Object.keys(enFlat)
      .filter((k) => k in kaFlat)
      .filter((k) => icuArgs(enFlat[k]).join(",") !== icuArgs(kaFlat[k]).join(","))
      .map((k) => `${k}: en(${icuArgs(enFlat[k])}) ka(${icuArgs(kaFlat[k])})`);
    expect(mismatched).toEqual([]);
  });

  it("parses as valid ICU in both locales", () => {
    const errors: string[] = [];
    for (const [locale, messages, flat] of [
      ["en", enAll, enFlat],
      ["ka", kaAll, kaFlat],
    ] as const) {
      const t = createTranslator({
        locale,
        messages: { [ns]: messages[ns] } as never,
        onError: (e) => errors.push(`${locale}: ${e.message}`),
      });
      for (const [key, msg] of Object.entries(flat)) {
        (t as unknown as (k: string, v: object) => string)(`${ns}.${key}`, dummyValues(msg));
      }
    }
    expect(errors).toEqual([]);
  });
});

describe("pending work-package files", () => {
  const pendingFiles = fs.existsSync(PENDING_DIR)
    ? fs.readdirSync(PENDING_DIR).filter((f) => f.endsWith(".json"))
    : [];

  it.each(pendingFiles.length ? pendingFiles : ["(none)"])("%s has en/ka parity", (file) => {
    if (file === "(none)") return;
    const data = JSON.parse(fs.readFileSync(path.join(PENDING_DIR, file), "utf8"));
    expect(Object.keys(data).sort()).toEqual(["en", "ka"]);
    const enFlat = flatten(data.en);
    const kaFlat = flatten(data.ka);
    expect(Object.keys(enFlat).sort()).toEqual(Object.keys(kaFlat).sort());
    for (const k of Object.keys(enFlat)) {
      expect(enFlat[k].trim(), `${file} en ${k}`).not.toBe("");
      expect(kaFlat[k].trim(), `${file} ka ${k}`).not.toBe("");
      expect(icuArgs(kaFlat[k]), `${file} ${k}`).toEqual(icuArgs(enFlat[k]));
    }
  });

  it("is empty in the integration gate (CI_INTEGRATION=1)", () => {
    if (process.env.CI_INTEGRATION !== "1") return;
    expect(pendingFiles).toEqual([]);
  });
});

describe("format.ts tables match the catalog", () => {
  it.each(["en", "ka"] as const)("months.short (%s)", (locale) => {
    const months = ((locale === "en" ? enAll : kaAll).ticketsScreen as Tree).months as Tree;
    const short = months.short as Record<string, string>;
    expect(Array.from({ length: 12 }, (_, i) => short[String(i + 1)])).toEqual([...MONTHS_SHORT[locale]]);
  });

  it.each(["en", "ka"] as const)("relative.* (%s)", (locale) => {
    const relative = ((locale === "en" ? enAll : kaAll).ticketsScreen as Tree).relative as Record<string, string>;
    expect(relative).toEqual(RELATIVE_LABELS[locale]);
  });
});
