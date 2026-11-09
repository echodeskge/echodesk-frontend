import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import type { MessageType } from "@/components/chat/types"

import { MediaGrid } from "@/components/ui/media-grid"
import type { MediaType } from "@/components/ui/media-grid"
import {
  buildUrlReplacements,
  isRefreshablePlatform,
  refreshSocialAttachments,
} from "@/services/socialAttachmentRefresh"

/**
 * Inline images / videos of a chat bubble.
 *
 * Facebook / Instagram media links expire after a few weeks. When one fails
 * to load we ask the backend to re-mirror the message's attachments (once per
 * message) and swap in the permanent URL; if that's not possible — or the new
 * URL fails too — the tile shows an "Image no longer available" placeholder
 * instead of a broken-image icon.
 */
export function MessageBubbleContentImages({
  images,
  message,
  platform,
}: {
  images: MessageType["images"]
  /** Enables the expired-link refresh for Facebook / Instagram messages. */
  message?: Pick<MessageType, "platformMessageId" | "platform">
  platform?: string
}) {
  const t = useTranslations("chat")
  // original src → refreshed src
  const [replacements, setReplacements] = useState<Record<string, string>>({})
  // original srcs that can't be recovered
  const [unavailable, setUnavailable] = useState<ReadonlySet<string>>(() => new Set())

  const replacementsRef = useRef(replacements)
  replacementsRef.current = replacements
  const failed = useRef(new Set<string>())
  const refreshState = useRef<"idle" | "pending" | "done">("idle")
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  if (!images || !images.length) return null // Return null if the images are empty

  const originals = images.map((image) => image.url)
  const effectivePlatform = platform ?? message?.platform
  const messageId = message?.platformMessageId

  const markUnavailable = (srcs: string[]) => {
    if (!mounted.current || srcs.length === 0) return
    setUnavailable((prev) => new Set([...prev, ...srcs]))
  }

  const onMediaError = (item: MediaType) => {
    const current = replacementsRef.current
    const original =
      originals.find((src) => src === item.src) ??
      Object.keys(current).find((src) => current[src] === item.src)
    if (!original) return
    // Already refreshed and the new copy failed too → give up.
    if (current[original] && current[original] === item.src) {
      markUnavailable([original])
      return
    }
    failed.current.add(original)
    if (!isRefreshablePlatform(effectivePlatform) || !messageId || refreshState.current === "done") {
      markUnavailable([original])
      return
    }
    if (refreshState.current === "pending") return // resolution handles it
    refreshState.current = "pending"
    void refreshSocialAttachments(effectivePlatform, messageId).then((result) => {
      refreshState.current = "done"
      if (!mounted.current) return
      const swaps = result ? buildUrlReplacements(originals, result) : {}
      if (Object.keys(swaps).length) setReplacements((prev) => ({ ...prev, ...swaps }))
      markUnavailable([...failed.current].filter((src) => !swaps[src]))
    })
  }

  const imagesData: MediaType[] = images.map((image) => ({
    src: replacements[image.url] ?? image.url,
    alt: image.name,
    type: (image.type === "video" ? "VIDEO" : "IMAGE") as "IMAGE" | "VIDEO",
    unavailable: unavailable.has(image.url),
  }))

  return (
    <MediaGrid
      data={imagesData}
      onMediaError={onMediaError}
      unavailableLabel={t("imageUnavailable")}
    />
  )
}
