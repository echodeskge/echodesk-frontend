"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import type { ComponentProps, MouseEvent } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
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
  if (!src) return false;
  const externalPatterns = [
    'fbcdn.net',
    'cdninstagram.com',
    'whatsapp.net',
    'fbsbx.com',
    'digitaloceanspaces.com',
    '/api/social/whatsapp-media/',
    'blob:',
  ];
  return externalPatterns.some(pattern => src.includes(pattern));
}

// Check if URL requires authenticated fetch (e.g. WhatsApp media proxy)
function needsAuthFetch(src: string | undefined | null): boolean {
  if (!src) return false;
  return src.includes('/api/social/whatsapp-media/');
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

    axios.get(src, { responseType: 'blob' })
      .then(res => {
        if (!cancelled) {
          setBlobUrl(URL.createObjectURL(res.data))
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => { cancelled = true }
  }, [src])

  // Cleanup blob URL on unmount or change
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  if (error) {
    return (
      <div className={cn("bg-muted flex items-center justify-center text-xs text-muted-foreground rounded-lg", className)}
        style={{ minHeight: 60 }}>
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
  const [lightboxMedia, setLightboxMedia] = useState<MediaType | null>(null)

  // Filter out items with no src (e.g. sent attachments with no URL yet)
  const validData = data.filter(item => item.src)
  if (validData.length === 0) return null

  const displayedMedia = validData.slice(0, limit - 1)
  const remainingCount = validData.length - displayedMedia.length - 1
  const hasMoreMedia = validData.length >= limit
  const lastMedia = hasMoreMedia ? validData[limit - 1] : null

  const handleMediaClick = (item: MediaType, e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setLightboxMedia(item)
    setLightboxOpen(true)
    onMediaClick?.(e)
  }

  const renderImage = (item: MediaType, inLightbox = false) => {
    const isAuth = needsAuthFetch(item.src);

    if (isAuth) {
      return (
        <AuthenticatedImage
          src={item.src}
          alt={item.alt}
          className={inLightbox
            ? "max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-lg"
            : "w-full h-full object-cover rounded-lg"
          }
        />
      );
    }

    const isExternal = isExternalUrl(item.src);

    if (inLightbox) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt={item.alt}
          className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-lg"
        />
      );
    }

    if (isExternal) {
      // Use regular img tag for external social media URLs to avoid domain issues
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt={item.alt}
          className="w-full h-full object-cover rounded-lg"
        />
      );
    }

    return (
      <Image
        src={item.src}
        alt={item.alt}
        className="object-cover rounded-lg"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        fill
      />
    );
  };

  const renderVideo = (item: MediaType, inLightbox = false) => {
    return (
      <video
        src={item.src}
        className={cn(
          "rounded-lg",
          inLightbox
            ? "max-h-[80vh] max-w-full w-auto h-auto"
            : "object-cover w-full h-full"
        )}
        controls
        playsInline
        preload="metadata"
      />
    );
  };

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
        {(isSingleMedia ? validData : displayedMedia).map((item) => (
          <li key={`${item.alt}-${item.src}`} className={isSingleMedia ? "max-w-[280px]" : ""}>
            {item.type === "VIDEO" ? (
              // Videos are playable inline - no need for click handler
              <div className="rounded-lg overflow-hidden">
                {renderVideo(item)}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => handleMediaClick(item, e)}
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
            {lastMedia.type === "VIDEO" ? (
              <div className="relative aspect-square rounded-lg overflow-hidden">
                {renderVideo(lastMedia)}
                {remainingCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-3xl text-white font-semibold rounded-lg pointer-events-none">
                    <span>+{remainingCount}</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) =>
                  remainingCount > 0 ? onMoreButtonClick?.(e) : handleMediaClick(lastMedia, e)
                }
                className="cursor-pointer relative block w-full aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                aria-label={remainingCount > 0 ? "More media" : "View image"}
              >
                {renderImage(lastMedia)}
                {remainingCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-3xl text-white font-semibold rounded-lg">
                    <span>+{remainingCount}</span>
                  </div>
                )}
              </button>
            )}
          </li>
        )}
      </ul>

      {/* Lightbox Dialog for full-size image view */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="flex items-center justify-center w-auto max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none translate-x-0 translate-y-0 top-0 left-0 right-0 bottom-0 m-auto [&>button[aria-label='Close']]:hidden">
          <DialogTitle className="sr-only">
            {lightboxMedia?.type === "VIDEO" ? "Video" : "Image"} viewer
          </DialogTitle>
          <div className="relative">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-3 -right-3 z-50 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </button>
            {lightboxMedia && (
              lightboxMedia.type === "VIDEO" ? (
                renderVideo(lightboxMedia, true)
              ) : (
                renderImage(lightboxMedia, true)
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
