#!/usr/bin/env node
/**
 * Merge work-package i18n keys into the message catalogs.
 *
 * While the tickets redesign runs, only the integration owner edits
 * src/i18n/messages/{en,ka}.json. A work package that needs new strings adds
 * src/i18n/pending/<wp>.json shaped {"en": {...}, "ka": {...}} with the same
 * nesting as the catalogs. This script deep-merges every pending file into
 * en.json and ka.json and deletes the merged pending files.
 *
 * Usage:
 *   node scripts/merge-i18n-pending.mjs            merge all pending files
 *   node scripts/merge-i18n-pending.mjs fe-07      merge only pending/fe-07.json
 *   node scripts/merge-i18n-pending.mjs --dry-run  report, write nothing
 *   node scripts/merge-i18n-pending.mjs --keep     merge but keep the pending files
 *   node scripts/merge-i18n-pending.mjs --force    let pending values replace different existing ones
 *
 * The merge refuses (exit 1, nothing written) when:
 *   - a pending file is not {"en": {...}, "ka": {...}};
 *   - its en and ka key sets differ;
 *   - a key would replace an existing different value (unless --force), or a
 *     string would replace an object or the other way round (always).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCALES = ["en", "ka"];

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function flattenKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    isObject(v) ? flattenKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

/**
 * Deep-merge `src` into `dst` (mutates dst). Returns {added, replaced, conflicts}.
 */
export function deepMerge(dst, src, { force = false } = {}, prefix = "") {
  const out = { added: [], replaced: [], conflicts: [] };
  for (const [k, v] of Object.entries(src)) {
    const key = `${prefix}${k}`;
    if (!(k in dst)) {
      dst[k] = v;
      out.added.push(...(isObject(v) ? flattenKeys(v, `${key}.`) : [key]));
      continue;
    }
    const cur = dst[k];
    if (isObject(cur) && isObject(v)) {
      const sub = deepMerge(cur, v, { force }, `${key}.`);
      out.added.push(...sub.added);
      out.replaced.push(...sub.replaced);
      out.conflicts.push(...sub.conflicts);
    } else if (isObject(cur) !== isObject(v)) {
      out.conflicts.push(`${key} (object vs string)`);
    } else if (cur !== v) {
      if (force) {
        dst[k] = v;
        out.replaced.push(key);
      } else {
        out.conflicts.push(`${key}: ${JSON.stringify(cur)} -> ${JSON.stringify(v)}`);
      }
    }
  }
  return out;
}

export function validatePending(name, data) {
  const errors = [];
  if (!isObject(data) || !LOCALES.every((l) => isObject(data[l]))) {
    errors.push(`${name}: must be {"en": {...}, "ka": {...}}`);
    return errors;
  }
  const extra = Object.keys(data).filter((k) => !LOCALES.includes(k));
  if (extra.length) errors.push(`${name}: unexpected top-level keys ${extra.join(", ")}`);
  const en = new Set(flattenKeys(data.en));
  const ka = new Set(flattenKeys(data.ka));
  const onlyEn = [...en].filter((k) => !ka.has(k));
  const onlyKa = [...ka].filter((k) => !en.has(k));
  if (onlyEn.length) errors.push(`${name}: missing in ka: ${onlyEn.join(", ")}`);
  if (onlyKa.length) errors.push(`${name}: missing in en: ${onlyKa.join(", ")}`);
  return errors;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const pendingDir = path.join(root, "src/i18n/pending");
  const messagesDir = path.join(root, "src/i18n/messages");
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const keep = args.includes("--keep");
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--")).map((a) => a.replace(/\.json$/, ""));

  if (!fs.existsSync(pendingDir)) {
    console.log("No src/i18n/pending directory; nothing to merge.");
    return 0;
  }
  let files = fs.readdirSync(pendingDir).filter((f) => f.endsWith(".json")).sort();
  if (only.length) files = files.filter((f) => only.includes(f.replace(/\.json$/, "")));
  if (!files.length) {
    console.log("No pending i18n files.");
    return 0;
  }

  const catalogs = Object.fromEntries(
    LOCALES.map((l) => [l, JSON.parse(fs.readFileSync(path.join(messagesDir, `${l}.json`), "utf8"))]),
  );
  const errors = [];
  const report = [];
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(pendingDir, f), "utf8"));
    } catch (e) {
      errors.push(`${f}: invalid JSON (${e.message})`);
      continue;
    }
    const v = validatePending(f, data);
    if (v.length) {
      errors.push(...v);
      continue;
    }
    for (const l of LOCALES) {
      const r = deepMerge(catalogs[l], data[l], { force });
      errors.push(...r.conflicts.map((c) => `${f} [${l}] conflict: ${c}`));
      report.push(`${f} [${l}]: +${r.added.length} added, ${r.replaced.length} replaced`);
    }
  }
  report.forEach((r) => console.log(r));
  if (errors.length) {
    console.error(`\nNot merged:\n  ${errors.join("\n  ")}`);
    return 1;
  }
  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    return 0;
  }
  for (const l of LOCALES) {
    fs.writeFileSync(path.join(messagesDir, `${l}.json`), `${JSON.stringify(catalogs[l], null, 2)}\n`);
  }
  if (!keep) files.forEach((f) => fs.unlinkSync(path.join(pendingDir, f)));
  console.log(`\nMerged ${files.length} file(s)${keep ? " (kept)" : " and removed them"}.`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
