"use client"

import { memo, useState, useCallback } from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// In-memory cache to track loaded image URLs — survives re-renders and tab switches
const loadedImages = new Set<string>()

const ChatAvatar = memo(
  ({
    src,
    fallback,
    status,
    size = 2,
    className,
    fallbackClassName,
    fallbackFontSize,
    round = false,
  }: {
    src?: string
    fallback: string
    status?: string
    size: number
    className?: string
    /** Classes for the initials fallback (e.g. the redesign's primary tint). */
    fallbackClassName?: string
    /** Initials font size in rem; defaults to size / 2.5. */
    fallbackFontSize?: number
    /** Circle instead of the default rounded square. */
    round?: boolean
  }) => {
    const isCached = !!src && loadedImages.has(src)
    const [loaded, setLoaded] = useState(isCached)
    const [errored, setErrored] = useState(false)

    const handleLoad = useCallback(() => {
      if (src) loadedImages.add(src)
      setLoaded(true)
    }, [src])

    const handleError = useCallback(() => {
      setErrored(true)
    }, [])

    const showImage = !!src && !errored
    const showSkeleton = showImage && !loaded
    const showFallback = !src || errored

    return (
      <div
        style={{
          height: size + "rem",
          width: size + "rem",
        }}
        className={cn(
          "relative bg-background ring-2 ring-background",
          round ? "rounded-full" : "rounded-lg",
          className
        )}
      >
        <Avatar
          style={{
            height: size + "rem",
            width: size + "rem",
            fontSize: (fallbackFontSize ?? size / 2.5) + "rem",
          }}
        >
          {/* Always render img if src exists — browser cache keeps it decoded */}
          {showImage && (
            <Image
              src={src}
              alt="Avatar"
              width={Math.round(size * 16)}
              height={Math.round(size * 16)}
              className={cn(
                "aspect-square h-full w-full object-cover",
                round ? "rounded-full" : "rounded-lg",
                loaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              onLoad={handleLoad}
              onError={handleError}
            />
          )}

          {/* Skeleton pulse overlay while loading */}
          {showSkeleton && (
            <div className={cn("absolute inset-0 bg-muted animate-pulse", round ? "rounded-full" : "rounded-lg")} />
          )}

          {/* Initials fallback when no src or image failed */}
          {showFallback && (
            <AvatarFallback className={cn(round && "rounded-full", fallbackClassName)}>{fallback}</AvatarFallback>
          )}
        </Avatar>
      </div>
    )
  }
)
ChatAvatar.displayName = "ChatAvatar"

export { ChatAvatar }
