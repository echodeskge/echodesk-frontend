"use client"

import Image from "next/image"
import { useState } from "react"
import type { ComponentProps, MouseEvent } from "react"
import { X, Play } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

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

// Check if URL is from an external CDN or storage that requires unoptimized images
function isExternalUrl(src: string): boolean {
  const externalPatterns = [
    'fbcdn.net',
    'cdninstagram.com',
    'whatsapp.net',
    'fbsbx.com',
    'digitaloceanspaces.com', // Email attachments storage
  ];
  return externalPatterns.some(pattern => src.includes(pattern));
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

  if (data.length === 0) return null

  const displayedMedia = data.slice(0, limit - 1)
  const remainingCount = data.length - displayedMedia.length - 1
  const hasMoreMedia = data.length >= limit
  const lastMedia = hasMoreMedia ? data[limit - 1] : null

  const handleMediaClick = (item: MediaType, e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setLightboxMedia(item)
    setLightboxOpen(true)
    onMediaClick?.(e)
  }

  const renderImage = (item: MediaType, inLightbox = false) => {
    const isExternal = isExternalUrl(item.src);

    if (isExternal) {
      // Use regular img tag for external social media URLs to avoid domain issues
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt={item.alt}
          className={cn(
            "object-cover rounded-lg",
            inLightbox ? "max-h-[80vh] max-w-full w-auto h-auto" : "absolute inset-0 w-full h-full"
          )}
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
  const isSingleMedia = data.length === 1

  return (
    <>
      <ul
        className={cn(
          "grid gap-2 rounded-lg",
          !isSingleMedia && data.length > 1 && "grid-cols-2",
          className
        )}
        {...props}
      >
        {(isSingleMedia ? data : displayedMedia).map((item) => (
          <li key={`${item.alt}-${item.src}`}>
            {item.type === "VIDEO" ? (
              // Videos are playable inline - no need for click handler
              <div className={cn(
                "relative rounded-lg overflow-hidden",
                isSingleMedia ? "w-full max-w-[280px]" : "aspect-square"
              )}>
                {renderVideo(item)}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => handleMediaClick(item, e)}
                className={cn(
                  "cursor-pointer relative rounded-lg overflow-hidden hover:opacity-90 transition-opacity",
                  isSingleMedia
                    ? "w-full max-w-[280px] aspect-[4/3]"
                    : "size-full aspect-square"
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
                className="cursor-pointer relative size-full aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
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
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">
            {lightboxMedia?.type === "VIDEO" ? "Video" : "Image"} viewer
          </DialogTitle>
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {lightboxMedia && (
              lightboxMedia.type === "VIDEO" ? (
                renderVideo(lightboxMedia, true)
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lightboxMedia.src}
                  alt={lightboxMedia.alt}
                  className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
