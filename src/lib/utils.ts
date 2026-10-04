import { clsx, type ClassValue } from "clsx"
import { format } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  const names = name.trim().split(" ")
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase()
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

export function wait(ms: number = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function formatDate(value: string | number | Date) {
  return format(value, "PP")
}

export function formatDateShort(value: string | number | Date) {
  return format(value, "MMM dd")
}

export function formatDateTime(value: string | number | Date) {
  return format(value, "dd/MM/yyyy, HH:mm") // e.g. "19/06/2026, 14:30"
}

export function ensureWithSuffix(value: string, suffix: string) {
  return value.endsWith(suffix) ? value : `${value}${suffix}`
}

export function formatUnreadCount(unreadCount: number) {
  return unreadCount >= 100 ? "+99" : unreadCount
}

export function formatFileSize(bytes: number, decimals: number = 2) {
  if (bytes === 0) return "0 Bytes"

  const k = 1000 // Use 1024 for binary
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

/**
 * Pull a human-readable reason out of a failed API call. DRF returns
 * `{detail}` / `{error}` or a map of field → messages (possibly nested, e.g.
 * `line_items: [{quantity: ["…"]}]`); axios' own message is only
 * "Request failed with status code 400", which tells the user nothing.
 */
export function getApiErrorMessage(error: unknown, fallback = ""): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data

  const firstMessage = (value: unknown, label?: string): string | null => {
    if (typeof value === "string") {
      // Skip HTML error pages (e.g. a proxy 502).
      if (!value.trim() || value.trim().startsWith("<")) return null
      return label ? `${label}: ${value}` : value
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = firstMessage(item, label)
        if (found) return found
      }
      return null
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>
      for (const key of ["detail", "error", "message", "non_field_errors"]) {
        const found = firstMessage(record[key], label)
        if (found) return found
      }
      for (const [key, inner] of Object.entries(record)) {
        const found = firstMessage(inner, key)
        if (found) return found
      }
    }
    return null
  }

  return firstMessage(data) || fallback || (error instanceof Error ? error.message : "")
}

/** Pick the name for the active locale from an API `{en, ka}` name object, falling back to the other language. */
export function localizedName(
  name: { en?: string; ka?: string } | null | undefined,
  locale: string
): string {
  if (!name) return ""
  return (locale === "ka" ? name.ka || name.en : name.en || name.ka) || ""
}
