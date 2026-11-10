/**
 * Catalogs for the CL-03 tests: en/ka plus `src/i18n/pending/cl-03.json`
 * while it waits for the integrator (`node scripts/merge-i18n-pending.mjs`
 * deletes the pending file once its keys live in the catalogs, after which
 * this is the plain catalog).
 */
import fs from "node:fs";
import path from "node:path";
import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

type Json = Record<string, unknown>;

function deepMerge(base: Json, extra: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const cur = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object"
        ? deepMerge(cur as Json, v as Json)
        : v;
  }
  return out;
}

const PENDING = path.resolve(__dirname, "../../../src/i18n/pending/cl-03.json");
const pending: { en: Json; ka: Json } = fs.existsSync(PENDING)
  ? (JSON.parse(fs.readFileSync(PENDING, "utf8")) as { en: Json; ka: Json })
  : { en: {}, ka: {} };

export const cl03Messages = {
  en: deepMerge(en as Json, pending.en),
  ka: deepMerge(ka as Json, pending.ka),
};

/** `a.b.c` lookup (undefined when missing). */
export function lookup(cat: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Json)[k] : undefined), cat);
}
