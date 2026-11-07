/**
 * Helpers for the backend's leave guard on user deactivation / deletion
 * (400 `{detail, code: 'leave_removal_blocked', reasons: [...]}` and the
 * `blocked: {userId: [reasons]}` map in POST /api/users/bulk_action/).
 */

/** Reasons from a `leave_removal_blocked` API error, or null for any other error. */
export function removalBlockedReasons(error: unknown): string[] | null {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data as
    | { code?: unknown; reasons?: unknown }
    | undefined
  if (!data || typeof data !== "object" || data.code !== "leave_removal_blocked") return null
  return Array.isArray(data.reasons) ? data.reasons.filter((r): r is string => typeof r === "string") : []
}

/** "Heading\n• reason 1\n• reason 2" for a blocked removal, or null when not blocked. */
export function formatRemovalBlocked(error: unknown, heading: string): string | null {
  const reasons = removalBlockedReasons(error)
  if (reasons === null) return null
  return [heading, ...reasons.map((r) => `• ${r}`)].join("\n")
}

/**
 * Lines for users a bulk action skipped because of open leave work:
 * "Name: reason; reason". `nameFor` resolves a user id to a display name.
 */
export function formatBulkBlocked(
  blocked: Record<string, string[]> | null | undefined,
  nameFor: (id: number) => string
): string[] {
  if (!blocked) return []
  return Object.entries(blocked)
    .filter(([, reasons]) => Array.isArray(reasons) && reasons.length > 0)
    .map(([id, reasons]) => `• ${nameFor(Number(id))}: ${reasons.join("; ")}`)
}
