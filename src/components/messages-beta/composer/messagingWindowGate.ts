import type { MessagingWindowStatus } from "@/hooks/api/useSocial";

/**
 * Messenger / Instagram reply window, as the composer shows it.
 *
 * Mirrors the mobile app's `windowBanner` (echodesk-mobile
 * src/features/social/thread/gating.ts):
 *
 * - within 24h of the customer's last message → `none` (normal composer);
 * - 24h–7d on a workspace approved for Meta's Human Agent feature
 *   (`human_agent_window_open`) → `humanAgent`: info banner, sending stays
 *   enabled and the backend adds the HUMAN_AGENT tag;
 * - otherwise past 24h (after 7 days, or no Human Agent) → `closed`: the
 *   composer is disabled, Meta would refuse the reply.
 *
 * Unknown / loading / errored window, or a thread with no customer message
 * on record, never blocks — the backend still refuses a disallowed send with
 * `outside_messaging_window`, which the composer turns into the same copy.
 */
export type WindowBanner =
  | { kind: "none" }
  | { kind: "humanAgent"; hoursRemaining: number | null }
  | { kind: "closed" };

export type WindowInput = Pick<
  MessagingWindowStatus,
  "window_open" | "human_agent_window_open" | "human_agent_hours_remaining" | "last_user_message_at"
>;

export function isMetaMessagingPlatform(platform: string): platform is "facebook" | "instagram" {
  return platform === "facebook" || platform === "instagram";
}

export function windowBanner(platform: string, window: WindowInput | null | undefined): WindowBanner {
  if (!isMetaMessagingPlatform(platform)) return { kind: "none" };
  if (!window || window.window_open !== false) return { kind: "none" };
  if (window.human_agent_window_open) {
    const hours = window.human_agent_hours_remaining;
    return {
      kind: "humanAgent",
      hoursRemaining:
        typeof hours === "number" && Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : null,
    };
  }
  // No customer message on record → nothing to measure the window from.
  if (!window.last_user_message_at) return { kind: "none" };
  return { kind: "closed" };
}

/**
 * True when a send failed because Meta's reply window is closed: the
 * backend's structured `outside_messaging_window` code, or Meta's raw
 * "(#10) … outside of allowed window" text from older backends.
 */
export function isOutsideWindowError(err: unknown): boolean {
  const data = (err as { response?: { data?: { code?: unknown; error?: unknown } } })?.response?.data;
  if (data?.code === "outside_messaging_window") return true;
  const raw =
    (typeof data?.error === "string" ? data.error : "") ||
    (err as { message?: unknown })?.message;
  return typeof raw === "string" && /outside of allowed window|\(#10\)/i.test(raw);
}
