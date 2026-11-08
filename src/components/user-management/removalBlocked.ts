/**
 * Helpers for the backend's leave guard on user deactivation / deletion
 * (400 `{detail, code: 'leave_removal_blocked', reasons: [...]}` and the
 * `blocked: {userId: [reasons]}` map in POST /api/users/bulk_action/).
 */

/** One machine-readable reason (`reason_codes` / `blocked_codes` items). */
export interface RemovalReasonCode {
  code: string
  count: number | null
}

/**
 * Turns a reason code into display text, or null to fall back to the English
 * reason the backend sent (e.g. an unknown code).
 */
export type RemovalReasonTranslator = (reason: RemovalReasonCode) => string | null

const isReasonCode = (r: unknown): r is RemovalReasonCode =>
  !!r && typeof r === "object" && typeof (r as RemovalReasonCode).code === "string"

/** Translated reasons where a code is known, else the backend's English text. */
function localise(reasons: string[], codes: unknown, translate?: RemovalReasonTranslator): string[] {
  if (!translate || !Array.isArray(codes) || codes.length !== reasons.length) return reasons
  return reasons.map((text, i) => (isReasonCode(codes[i]) ? translate(codes[i]) ?? text : text))
}

/** Reasons from a `leave_removal_blocked` API error, or null for any other error. */
export function removalBlockedReasons(error: unknown, translate?: RemovalReasonTranslator): string[] | null {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data as
    | { code?: unknown; reasons?: unknown; reason_codes?: unknown }
    | undefined
  if (!data || typeof data !== "object" || data.code !== "leave_removal_blocked") return null
  const reasons = Array.isArray(data.reasons) ? data.reasons.filter((r): r is string => typeof r === "string") : []
  return localise(reasons, data.reason_codes, translate)
}

/** "Heading\n• reason 1\n• reason 2" for a blocked removal, or null when not blocked. */
export function formatRemovalBlocked(
  error: unknown,
  heading: string,
  translate?: RemovalReasonTranslator
): string | null {
  const reasons = removalBlockedReasons(error, translate)
  if (reasons === null) return null
  return [heading, ...reasons.map((r) => `• ${r}`)].join("\n")
}

/**
 * Lines for users a bulk action skipped because of open leave work:
 * "Name: reason; reason". `nameFor` resolves a user id to a display name.
 */
export function formatBulkBlocked(
  blocked: Record<string, string[]> | null | undefined,
  nameFor: (id: number) => string,
  codes?: Record<string, RemovalReasonCode[]> | null,
  translate?: RemovalReasonTranslator
): string[] {
  if (!blocked) return []
  return Object.entries(blocked)
    .filter(([, reasons]) => Array.isArray(reasons) && reasons.length > 0)
    .map(([id, reasons]) => `• ${nameFor(Number(id))}: ${localise(reasons, codes?.[id], translate).join("; ")}`)
}
