"use client"

import { useEffect, useState } from "react"
import { parseIdParam } from "./substitutes-utils"

/**
 * `?id=<n>` of the current URL (notification deep links), read once on mount.
 * Reads window.location instead of useSearchParams so pages need no Suspense.
 */
export function useDeepLinkId(): [number | null, () => void] {
  const [id, setId] = useState<number | null>(null)
  useEffect(() => {
    setId(parseIdParam(window.location.search))
  }, [])
  const clear = () => {
    setId(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has("id")) {
      url.searchParams.delete("id")
      window.history.replaceState(window.history.state, "", url.toString())
    }
  }
  return [id, clear]
}
