"use client"

import { memo, useState, useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Simple in-memory cache to track loaded image URLs across renders
const loadedImages = new Set<string>()

const ChatAvatar = memo(
  ({
    src,
    fallback,
    status,
    size = 2,
    className,
  }: {
    src?: string
    fallback: string
    status?: string
    size: number
    className?: string
  }) => {
    const alreadyCached = src ? loadedImages.has(src) : false
    const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
      alreadyCached ? 'loaded' : src ? 'loading' : 'error'
    )
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
      if (!src) {
        setImageState('error')
        return
      }

      if (loadedImages.has(src)) {
        setImageState('loaded')
        return
      }

      setImageState('loading')
      const img = new Image()
      img.src = src
      img.onload = () => {
        loadedImages.add(src)
        setImageState('loaded')
      }
      img.onerror = () => {
        setImageState('error')
      }

      return () => {
        img.onload = null
        img.onerror = null
      }
    }, [src])

    return (
      <div
        style={{
          height: size + "rem",
          width: size + "rem",
        }}
        className={cn(
          "relative bg-background ring-2 ring-background rounded-lg",
          className
        )}
      >
        <Avatar
          style={{
            height: size + "rem",
            width: size + "rem",
            fontSize: size / 2.5 + "rem",
          }}
        >
          {/* Skeleton loader while image is loading */}
          {imageState === 'loading' && (
            <div className="absolute inset-0 rounded-lg bg-muted animate-pulse" />
          )}

          {/* Actual image - hidden until loaded */}
          {src && imageState === 'loaded' && (
            <img
              ref={imgRef}
              src={src}
              alt="Avatar"
              className="aspect-square h-full w-full bg-muted rounded-lg object-cover"
              loading="eager"
              decoding="async"
            />
          )}

          {/* Fallback initials when no image or image failed */}
          {imageState === 'error' && (
            <AvatarFallback>{fallback}</AvatarFallback>
          )}
        </Avatar>
      </div>
    )
  }
)
ChatAvatar.displayName = "ChatAvatar"

export { ChatAvatar }
