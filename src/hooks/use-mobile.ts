import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Whether the viewport is below the `md` breakpoint, or `undefined` until
 * the media query has been read (first client render; always on the
 * server). Use this when painting the wrong layout for one frame matters,
 * e.g. a full-screen sheet vs a desktop column.
 */
export function useViewportIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

/** `useViewportIsMobile()` collapsed to a boolean (`false` while unknown). */
export function useIsMobile() {
  return !!useViewportIsMobile()
}
