"use client"

import Image from "next/image"

import type { ComponentProps, MouseEvent } from "react"

import { cn } from "@/lib/utils"

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

// Check if URL is from an external social media CDN that requires unoptimized images
function isExternalSocialMediaUrl(src: string): boolean {
  const externalPatterns = [
    'fbcdn.net',
    'cdninstagram.com',
    'whatsapp.net',
    'fbsbx.com',
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
  if (data.length === 0) return null

  const displayedMedia = data.slice(0, limit - 1)
  const remainingCount = data.length - displayedMedia.length - 1
  const hasMoreMedia = data.length >= limit
  const lastMedia = hasMoreMedia ? data[limit - 1] : null

  const renderImage = (item: MediaType) => {
    const isExternal = isExternalSocialMediaUrl(item.src);

    if (isExternal) {
      // Use regular img tag for external social media URLs to avoid domain issues
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt={item.alt}
          className="object-cover rounded-lg absolute inset-0 w-full h-full"
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

  return (
    <ul
      className={cn(
        "grid gap-2 rounded-lg",
        data.length > 1 && "grid-cols-2",
        className
      )}
      {...props}
    >
      {displayedMedia.map((item) => (
        <li key={`${item.alt}-${item.src}`}>
          <button
            type="button"
            onClick={onMediaClick}
            className="cursor-pointer relative size-full aspect-square before:absolute before:inset-0 before:rounded-lg before:z-10 hover:before:bg-black/5"
            aria-label="Media"
          >
            {item.type === "VIDEO" ? (
              <video
                src={item.src}
                className="object-cover size-full rounded-lg"
                controls
                muted
              />
            ) : (
              renderImage(item)
            )}
          </button>
        </li>
      ))}

      {lastMedia && (
        <li>
          <button
            type="button"
            onClick={(e) =>
              remainingCount > 0 ? onMoreButtonClick?.(e) : onMediaClick?.(e)
            }
            className="cursor-pointer relative size-full aspect-square before:absolute before:inset-0 before:rounded-lg before:z-10 hover:before:bg-black/5"
            aria-label={remainingCount > 0 ? "More media" : "Media"}
          >
            {lastMedia.type === "VIDEO" ? (
              <video
                src={lastMedia.src}
                className="object-cover rounded-lg size-full"
                controls
                muted
              />
            ) : (
              renderImage(lastMedia)
            )}
            {remainingCount > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-3xl text-white font-semibold rounded-lg">
                <span>+{remainingCount}</span>
              </div>
            )}
          </button>
        </li>
      )}
    </ul>
  )
}
