"use client"

import { useState } from "react"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"

const SIZES = {
  24: "size-6 rounded",
  32: "size-8 rounded-md",
  40: "size-10 rounded-md",
  56: "size-14 rounded-lg",
} as const

/**
 * Square product image (object-cover, 1px border, muted fill) with a package
 * icon when there is no image or it fails to load. 32px in table rows, 24px
 * in compact lists (order items on mobile, top products), 40/56px in cards.
 * A plain <img>: product images come from any tenant CDN, which next/image
 * would need configured hosts for.
 */
export function ProductThumb({
  src,
  alt,
  size = 32,
  className,
}: {
  src?: string | null
  /** Product name (empty string for decorative thumbs next to the name). */
  alt: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const show = !!src && !failed
  return (
    <span
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden border bg-muted text-muted-foreground", SIZES[size], className)}
      data-testid="ec-product-thumb"
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Package aria-hidden className={size <= 32 ? "h-3.5 w-3.5" : "h-5 w-5"} />
      )}
    </span>
  )
}
