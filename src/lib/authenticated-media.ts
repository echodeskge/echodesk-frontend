/**
 * Auth-proxied media (WhatsApp Cloud API attachments served through
 * `/api/social/whatsapp-media/<id>/?waba_id=…`) can't be loaded by a bare
 * <img>/<video>/<audio>: the request needs the Bearer token that the axios
 * interceptor adds. Every bubble used to fetch its own copy on mount, which
 * made opening a WhatsApp thread fire one request per attachment (the
 * "N+1 API call" Sentry issue on /social/messages/:id).
 *
 * This module is the single fetch path for those URLs:
 * - one in-flight/finished request per media id (the same attachment
 *   rendered in the thread, the lightbox and a reply quote shares it),
 * - blob URLs live for the page session (never revoked by consumers),
 * - `useAuthenticatedMedia` defers the request until the element scrolls
 *   near the viewport.
 */
import { useEffect, useRef, useState } from "react"
import axios from "@/api/axios"

const WHATSAPP_MEDIA_RE = /\/api\/social\/whatsapp-media\/([^/?#]+)/

/** True for URLs that must be fetched with the auth interceptor. */
export function needsAuthFetch(src: string | undefined | null): boolean {
  if (!src) return false
  return src.includes("/api/social/whatsapp-media/")
}

/**
 * Cache key for a media URL: the WhatsApp media id when present (the same
 * attachment can be referenced with different hosts / query strings), else
 * the URL itself.
 */
export function authenticatedMediaKey(src: string): string {
  const match = WHATSAPP_MEDIA_RE.exec(src)
  return match ? `whatsapp:${match[1]}` : src
}

const MAX_CACHED = 200

// key → blob URL (resolved) — insertion-ordered so we can evict the oldest.
const resolved = new Map<string, string>()
// key → in-flight request; removed on settle.
const inflight = new Map<string, Promise<string>>()

function remember(key: string, blobUrl: string) {
  if (resolved.size >= MAX_CACHED) {
    const oldest = resolved.keys().next().value
    if (oldest !== undefined) {
      const url = resolved.get(oldest)
      resolved.delete(oldest)
      if (url) URL.revokeObjectURL(url)
    }
  }
  resolved.set(key, blobUrl)
}

/** Resolved blob URL for `src` if it was already fetched, else null. */
export function peekAuthenticatedMedia(src: string): string | null {
  return resolved.get(authenticatedMediaKey(src)) ?? null
}

/**
 * Fetches `src` with the auth interceptor and resolves to a blob URL.
 * Concurrent and later callers for the same media id share one request and
 * one blob URL. A failed request is not cached, so the next caller retries.
 */
export function loadAuthenticatedMedia(src: string): Promise<string> {
  const key = authenticatedMediaKey(src)
  const hit = resolved.get(key)
  if (hit) return Promise.resolve(hit)
  const pending = inflight.get(key)
  if (pending) return pending

  const request = axios
    .get(src, { responseType: "blob" })
    .then((res) => {
      const blobUrl = URL.createObjectURL(res.data)
      remember(key, blobUrl)
      return blobUrl
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, request)
  return request
}

/** Test hook: drop every cached entry (revoking the blob URLs). */
export function clearAuthenticatedMediaCache() {
  for (const url of resolved.values()) URL.revokeObjectURL(url)
  resolved.clear()
  inflight.clear()
}

export interface AuthenticatedMediaState {
  /** Blob URL once loaded. */
  blobUrl: string | null
  /** The request failed (no retry until the component remounts). */
  error: boolean
  /** Attach to the placeholder/element so loading starts near the viewport. */
  ref: (node: Element | null) => void
}

// Start loading a bit before the tile is actually visible.
const VIEWPORT_MARGIN = "200px"

/**
 * Lazily loads an auth-proxied media URL: the request starts when the
 * element given to `ref` enters (or comes within 200px of) the viewport.
 * When IntersectionObserver is unavailable (old browsers, jsdom) it loads
 * immediately. Results are shared through the module cache above.
 */
export function useAuthenticatedMedia(src: string): AuthenticatedMediaState {
  const [blobUrl, setBlobUrl] = useState<string | null>(() => peekAuthenticatedMedia(src))
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [node, setNode] = useState<Element | null>(null)

  // A cache hit renders synchronously; reset when `src` changes.
  const lastSrc = useRef(src)
  if (lastSrc.current !== src) {
    lastSrc.current = src
    const cached = peekAuthenticatedMedia(src)
    setBlobUrl(cached)
    setError(false)
  }

  useEffect(() => {
    if (blobUrl || visible) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: VIEWPORT_MARGIN }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, blobUrl, visible])

  useEffect(() => {
    if (!visible || blobUrl) return
    let cancelled = false
    loadAuthenticatedMedia(src)
      .then((url) => {
        if (!cancelled) setBlobUrl(url)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [src, visible, blobUrl])

  return { blobUrl, error, ref: setNode }
}
