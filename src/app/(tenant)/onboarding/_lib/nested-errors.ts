/**
 * Field errors of nested answers. DRF nested serializers return
 * `{defaults: {invoice_prefix: ["..."]}}` and list serializers
 * `{leave_types: [{}, {code: ["..."]}]}`; some backends flatten the path to
 * `"defaults.invoice_prefix"`. `errorAt(errors, "leave_types[1].code")` reads
 * both shapes.
 */
import type { FieldErrors } from "./onboarding-api"

function tokens(path: string): Array<string | number> {
  const out: Array<string | number> = []
  for (const part of path.split(".")) {
    const m = part.match(/^([^[\]]*)((?:\[\d+\])*)$/)
    if (!m) {
      out.push(part)
      continue
    }
    if (m[1]) out.push(m[1])
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) out.push(Number(idx[1]))
  }
  return out
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value || null
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = firstString(item)
      if (s) return s
    }
    return null
  }
  if (value && typeof value === "object") {
    for (const inner of Object.values(value as Record<string, unknown>)) {
      const s = firstString(inner)
      if (s) return s
    }
  }
  return null
}

/** The raw error value at a nested path, or `undefined`. */
export function valueAt(errors: FieldErrors | null | undefined, path: string): unknown {
  if (!errors) return undefined
  if (path in errors) return errors[path]
  let cur: unknown = errors
  for (const tok of tokens(path)) {
    if (cur === null || cur === undefined) return undefined
    if (typeof tok === "number") {
      if (!Array.isArray(cur)) return undefined
      cur = cur[tok]
    } else if (typeof cur === "object" && !Array.isArray(cur)) {
      cur = (cur as Record<string, unknown>)[tok]
    } else {
      return undefined
    }
  }
  return cur
}

/** First message at a nested path (`defaults.invoice_prefix`, `leave_types[1].code`), else null. */
export function errorAt(errors: FieldErrors | null | undefined, path: string): string | null {
  return firstString(valueAt(errors, path))
}

/** Row errors of a nested list (`delivery.methods`), aligned with the rows. */
export function rowErrorsAt(errors: FieldErrors | null | undefined, path: string): Array<Record<string, unknown>> {
  const value = valueAt(errors, path)
  if (!Array.isArray(value)) return []
  return value.map((row) => (row && typeof row === "object" && !Array.isArray(row) ? (row as Record<string, unknown>) : {}))
}

/** The list-level message of a nested list field (a string or `["msg"]`, not the per-row objects). */
export function listErrorAt(errors: FieldErrors | null | undefined, path: string): string | null {
  const value = valueAt(errors, path)
  if (typeof value === "string") return value || null
  if (Array.isArray(value) && typeof value[0] === "string") return value[0]
  return null
}
