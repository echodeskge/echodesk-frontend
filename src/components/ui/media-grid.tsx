"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import type { ComponentProps, MouseEvent } from "react"
import Lightbox from "yet-another-react-lightbox"
import Captions from "yet-another-react-lightbox/plugins/captions"
import Counter from "yet-another-react-lightbox/plugins/counter"
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen"
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"
import Video from "yet-another-react-lightbox/plugins/video"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import type { SlideImage, RenderSlideProps } from "yet-another-react-lightbox"
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/captions.css"
import "yet-another-react-lightbox/plugins/counter.css"
import "yet-another-react-lightbox/plugins/thumbnails.css"

import { cn } from "@/lib/utils"
import axios from "@/api/axios"

export interface MediaType {
  src: string
  alt: string
  type?: "IMAGE" | "VIDEO"
}

export interface MediaGridProps extends ComponentProps<"ul"> {
  data: Array<MediaType>
  limit?: number
  onMoreButtonClick?: (event: MouseEvent<HTMLButtonElement>) => void
  onMediaClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

// Check if URL should bypass Next.js Image optimization (external CDNs, proxy URLs, blob URLs)
function isExternalUrl(src: string | undefined | null): boolean {
  if (!src) return false
  const externalPatterns = [
    "fbcdn.net",
    "cdninstagram.com",
    "whatsapp.net",
    "fbsbx.com",
    "digitaloceanspaces.com",
    "/api/social/whatsapp-media/",
    "blob:",
  ]
  return externalPatterns.some((pattern) => src.includes(pattern))
}

// Check if URL requires authenticated fetch (e.g. WhatsApp media proxy)
function needsAuthFetch(src: string | undefined | null): boolean {
  if (!src) return false
  return src.includes("/api/social/whatsapp-media/")
}

/**
 * Component that fetches an image via authenticated axios request
 * and renders it using a blob URL. Used for WhatsApp media proxy.
 */
function AuthenticatedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setBlobUrl(null)
    setError(false)

    axios
      .get(src, { responseType: "blob" })
      .then((res) => {
        if (!cancelled) {
          setBlobUrl(URL.createObjectURL(res.data))
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [src])

  // Cleanup blob URL on unmount or change
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  if (error) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center text-xs text-muted-foreground rounded-lg",
          className
        )}
        style={{ minHeight: 60 }}
      >
        Failed to load image
      </div>
    )
  }

  if (!blobUrl) {
    return <div className={cn("animate-pulse bg-muted rounded-lg", className)} style={{ minHeight: 100 }} />
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={blobUrl} alt={alt} className={className} />
}

export function MediaGrid({
  data,
  limit = 4,
  onMoreButtonClick,
  onMediaClick,
  className,
  ...props
}: MediaGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Filter out items with no src (e.g. sent attachments with no URL yet)
  const validData = data.filter((item) => item.src)
  if (validData.length === 0) return null

  const displayedMedia = validData.slice(0, limit - 1)
  const remainingCount = validData.length - displayedMedia.length - 1
  const hasMoreMedia = validData.length >= limit
  const lastMedia = hasMoreMedia ? validData[limit - 1] : null

  // Build slides for the lightbox. Authenticated images get a sentinel src
  // (preserved as-is) and are rendered through render.slide below so the
  // library doesn't try to load them as a plain <img>.
  const slides = validData.map((item) => {
    if (item.type === "VIDEO") {
      return {
        type: "video" as const,
        sources: [{ src: item.src, type: guessVideoMime(item.src) }],
        title: item.alt,
      }
    }
    return {
      src: item.src,
      alt: item.alt,
      // Captions plugin reads `title` / `description`. We don't have a
      // description, but a per-image title helps when there are many.
      title: item.alt,
    } satisfies SlideImage
  })

  const openLightboxAt = (index: number, e?: MouseEvent<HTMLButtonElement>) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
    if (e) onMediaClick?.(e)
  }

  const handleMoreClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Default behaviour: open the lightbox at the +N slide so the user
    // can navigate through every remaining image. Callers can still
    // override via onMoreButtonClick if they want something custom.
    if (onMoreButtonClick) {
      onMoreButtonClick(e)
      return
    }
    openLightboxAt(limit - 1, e)
  }

  const renderImage = (item: MediaType) => {
    const isAuth = needsAuthFetch(item.src)
    if (isAuth) {
      return <AuthenticatedImage src={item.src} alt={item.alt} className="w-full h-full object-cover rounded-lg" />
    }
    const isExternal = isExternalUrl(item.src)
    if (isExternal) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={item.src} alt={item.alt} className="w-full h-full object-cover rounded-lg" />
    }
    return (
      <Image
        src={item.src}
        alt={item.alt}
        className="object-cover rounded-lg"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        fill
      />
    )
  }

  const renderVideoInline = (item: MediaType) => (
    <video
      src={item.src}
      className="rounded-lg object-cover w-full h-full"
      controls
      playsInline
      preload="metadata"
    />
  )

  // For single media item, use larger display
  const isSingleMedia = validData.length === 1

  return (
    <>
      <ul
        className={cn(
          "grid gap-2 rounded-lg",
          !isSingleMedia && validData.length > 1 && "grid-cols-2",
          className
        )}
        {...props}
      >
        {(isSingleMedia ? validData : displayedMedia).map((item, idx) => (
          <li key={`${item.alt}-${item.src}`} className={isSingleMedia ? "max-w-[280px]" : ""}>
            {item.type === "VIDEO" ? (
              // Videos are playable inline — clicking the tile opens the
              // lightbox so users can also see them full-screen / next to
              // the rest of the gallery.
              <button
                type="button"
                onClick={(e) => openLightboxAt(idx, e)}
                className={cn(
                  "cursor-pointer block rounded-lg overflow-hidden hover:opacity-90 transition-opacity",
                  isSingleMedia ? "w-full" : "w-full aspect-square"
                )}
                aria-label="View video"
              >
                {renderVideoInline(item)}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => openLightboxAt(idx, e)}
                className={cn(
                  "cursor-pointer block rounded-lg overflow-hidden hover:opacity-90 transition-opacity",
                  isSingleMedia ? "w-full" : "w-full aspect-square"
                )}
                aria-label="View image"
              >
                {renderImage(item)}
              </button>
            )}
          </li>
        ))}

        {lastMedia && !isSingleMedia && (
          <li>
            <button
              type="button"
              onClick={(e) =>
                remainingCount > 0 ? handleMoreClick(e) : openLightboxAt(limit - 1, e)
              }
              className="cursor-pointer relative block w-full aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
              aria-label={remainingCount > 0 ? `Show ${remainingCount + 1} more` : "View image"}
            >
              {lastMedia.type === "VIDEO" ? renderVideoInline(lastMedia) : renderImage(lastMedia)}
              {remainingCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-3xl text-white font-semibold rounded-lg pointer-events-none">
                  <span>+{remainingCount}</span>
                </div>
              )}
            </button>
          </li>
        )}
      </ul>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides}
        on={{ view: ({ index }) => setLightboxIndex(index) }}
        plugins={[Captions, Counter, Fullscreen, Thumbnails, Video, Zoom]}
        // Auth-protected URLs (WhatsApp media proxy) can't load as plain
        // <img>; we render those through AuthenticatedImage which fetches
        // them via axios and presents a blob URL.
        render={{
          slide: ({ slide }: RenderSlideProps) => {
            if ((slide as { type?: string }).type === "video") return undefined
            const src = (slide as SlideImage).src
            if (!needsAuthFetch(src)) return undefined
            return (
              <div className="flex items-center justify-center h-full w-full">
                <AuthenticatedImage
                  src={src}
                  alt={(slide as SlideImage).alt || "image"}
                  className="max-h-[90vh] max-w-[90vw] object-contain"
                />
              </div>
            )
          },
        }}
        carousel={{ finite: true }}
        thumbnails={{ position: "bottom", width: 80, height: 60 }}
        zoom={{ maxZoomPixelRatio: 3 }}
        counter={{ container: { style: { top: 0 } } }}
      />
    </>
  )
}

function guessVideoMime(src: string): string {
  const lower = src.toLowerCase()
  if (lower.endsWith(".webm")) return "video/webm"
  if (lower.endsWith(".ogg")) return "video/ogg"
  if (lower.endsWith(".mov")) return "video/quicktime"
  return "video/mp4"
}
