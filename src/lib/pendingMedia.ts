/**
 * Module-level store for pending media blob URLs.
 * When sending files, blob URLs are queued here before the API call.
 * The WebSocket handler consumes them to display images immediately
 * instead of showing placeholder text while waiting for CDN URLs.
 */

// chatId -> queue of { blobUrl, isImage } entries (FIFO)
const pendingMediaQueue = new Map<string, Array<{ blobUrl: string; isImage: boolean; fileName: string }>>()

/** Add a pending media entry for a chat. */
export function addPendingMedia(chatId: string, blobUrl: string, isImage: boolean, fileName: string) {
  const queue = pendingMediaQueue.get(chatId) || []
  queue.push({ blobUrl, isImage, fileName })
  pendingMediaQueue.set(chatId, queue)

  // Auto-cleanup after 60 seconds to prevent memory leaks
  setTimeout(() => {
    const q = pendingMediaQueue.get(chatId)
    if (q) {
      const idx = q.findIndex(e => e.blobUrl === blobUrl)
      if (idx !== -1) {
        URL.revokeObjectURL(blobUrl)
        q.splice(idx, 1)
      }
      if (q.length === 0) pendingMediaQueue.delete(chatId)
    }
  }, 60000)
}

/** Consume the next pending media entry for a chat (FIFO). Returns undefined if queue is empty. */
export function consumePendingMedia(chatId: string): { blobUrl: string; isImage: boolean; fileName: string } | undefined {
  const queue = pendingMediaQueue.get(chatId)
  if (queue && queue.length > 0) {
    const entry = queue.shift()
    if (queue.length === 0) pendingMediaQueue.delete(chatId)
    return entry
  }
  return undefined
}
