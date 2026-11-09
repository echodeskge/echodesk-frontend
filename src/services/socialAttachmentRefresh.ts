/**
 * Lazy refresh of expired Facebook / Instagram attachment URLs.
 *
 * Meta's CDN links expire a few weeks after a message arrives (HTTP 403
 * "URL signature expired"). When an attachment fails to load, the chat asks
 * the backend to copy it into EchoDesk storage — `POST
 * /api/social/attachments/refresh/` with the Meta message id (mid) — and
 * swaps in the returned permanent URL.
 *
 * Called at most once per message per page session: concurrent callers (a
 * message with several broken images) share one request, and the outcome —
 * success or failure — is remembered so re-renders / re-mounts never call
 * again. The endpoint isn't in the generated client yet, so it goes through
 * the shared axios instance.
 */
import axios from "@/api/axios";

export type RefreshablePlatform = "facebook" | "instagram";

export interface RefreshedAttachment {
  type?: string;
  url?: string;
  source_url?: string;
  [key: string]: unknown;
}

export interface AttachmentRefreshResult {
  id: number;
  message_id: string;
  platform: RefreshablePlatform;
  mirrored: number;
  attachments: RefreshedAttachment[];
  attachment_url: string | null;
  attachment_type: string;
}

const results = new Map<string, Promise<AttachmentRefreshResult | null>>();

export function isRefreshablePlatform(platform: string | undefined | null): platform is RefreshablePlatform {
  return platform === "facebook" || platform === "instagram";
}

/** Resolves to the refreshed attachments, or null if the attachment can't be recovered. */
export function refreshSocialAttachments(
  platform: RefreshablePlatform,
  messageId: string
): Promise<AttachmentRefreshResult | null> {
  const key = `${platform}:${messageId}`;
  let pending = results.get(key);
  if (!pending) {
    pending = axios
      .post<AttachmentRefreshResult>("/api/social/attachments/refresh/", {
        platform,
        message_id: messageId,
      })
      .then((res) => res.data ?? null)
      .catch(() => null);
    results.set(key, pending);
  }
  return pending;
}

/**
 * Map each originally-rendered URL to its refreshed replacement. Attachments
 * carry the old link in `source_url`; anything without one falls back to
 * position among the media attachments (and `attachment_url` for a single
 * legacy attachment).
 */
export function buildUrlReplacements(
  originalUrls: string[],
  result: AttachmentRefreshResult
): Record<string, string> {
  const out: Record<string, string> = {};
  const bySource = new Map<string, string>();
  for (const att of result.attachments || []) {
    if (att?.source_url && att.url) bySource.set(att.source_url, att.url);
  }
  const claimed = new Set(originalUrls.filter((url) => bySource.has(url)).map((url) => bySource.get(url)));
  // Media attachments not already matched by source_url, in order.
  const unclaimed = (result.attachments || []).filter(
    (att) => att?.url && att.type !== "location" && att.type !== "fallback" && !claimed.has(att.url)
  );
  let next = 0;
  originalUrls.forEach((url) => {
    let replacement = bySource.get(url);
    if (!replacement) {
      replacement = unclaimed[next]?.url;
      next += 1;
    }
    if (!replacement && originalUrls.length === 1) replacement = result.attachment_url ?? undefined;
    if (replacement && replacement !== url) out[url] = replacement;
  });
  return out;
}

/** Test hook: forget remembered outcomes. */
export function __resetAttachmentRefreshCache(): void {
  results.clear();
}
