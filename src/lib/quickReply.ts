import type { QuickReply } from "@/hooks/api/useSocial";

export interface QuickReplyVars {
  customerName?: string;
  agentName?: string;
  companyName?: string;
}

/**
 * Substitute the supported template variables in a quick-reply message.
 * Shared by the ⚡ picker (QuickReplySelector) and the inline typeahead
 * (QuickReplySuggestions) so both insert identical text.
 */
export function processQuickReplyMessage(message: string, vars: QuickReplyVars = {}): string {
  let processed = message;
  if (vars.customerName) processed = processed.replace(/\{\{customer_name\}\}/g, vars.customerName);
  if (vars.agentName) processed = processed.replace(/\{\{agent_name\}\}/g, vars.agentName);
  if (vars.companyName) processed = processed.replace(/\{\{company_name\}\}/g, vars.companyName);
  processed = processed.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString());
  processed = processed.replace(
    /\{\{current_time\}\}/g,
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  return processed;
}

/**
 * Rank quick replies against what the agent has typed, for the inline
 * "Saved reply · Click to insert" suggestion bar.
 *
 * - A bare "/" lists the saved replies; "/abc" matches shortcuts by prefix
 *   (falling back to titles when no shortcut matches).
 * - Otherwise the query (min 2 chars) must appear in the shortcut, title, or
 *   message; prefix hits rank above substring hits, and shortcut > title >
 *   message within the same kind.
 * - A reply whose message exactly equals the query is excluded — it's already
 *   fully typed, so there's nothing to complete.
 */
/** How many replies a bare "/" lists. */
const SLASH_MENU_LIMIT = 6;

export function matchQuickReplies(
  replies: QuickReply[] | undefined | null,
  query: string,
  limit = 3
): QuickReply[] {
  const list = Array.isArray(replies) ? replies : [];
  const raw = query.trim().toLowerCase();
  if (!raw) return [];

  // "/" opens the saved replies; "/shortcut" narrows them by shortcut prefix.
  if (raw.startsWith("/")) {
    const sc = raw.slice(1);
    // A shortcut may have been saved with or without its leading slash.
    const shortcutOf = (r: QuickReply) => (r.shortcut || "").toLowerCase().replace(/^\/+/, "");
    if (sc.length < 1) {
      // Just "/": list what's available (replies with a shortcut first), a
      // few more than usual since nothing has narrowed the list yet.
      return [...list]
        .sort((a, b) => Number(!!shortcutOf(b)) - Number(!!shortcutOf(a)))
        .slice(0, Math.max(limit, SLASH_MENU_LIMIT));
    }
    const byShortcut = list.filter((r) => shortcutOf(r).startsWith(sc));
    if (byShortcut.length > 0) return byShortcut.slice(0, limit);
    // No shortcut starts with it — fall back to titles, so "/price" still
    // finds a reply titled "Price list" that has no shortcut.
    return list.filter((r) => (r.title || "").toLowerCase().startsWith(sc)).slice(0, limit);
  }

  if (raw.length < 2) return [];

  const scored: { reply: QuickReply; score: number }[] = [];
  for (const r of list) {
    const shortcut = (r.shortcut || "").toLowerCase();
    const title = (r.title || "").toLowerCase();
    const message = (r.message || "").toLowerCase();

    // Already fully typed — don't suggest it back.
    if (message === raw) continue;

    let score = 0;
    if (shortcut && shortcut.startsWith(raw)) score = 5;
    else if (title.startsWith(raw)) score = 4;
    else if (message.startsWith(raw)) score = 3;
    else if (shortcut && shortcut.includes(raw)) score = 2;
    else if (title.includes(raw)) score = 2;
    else if (message.includes(raw)) score = 1;

    if (score > 0) scored.push({ reply: r, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.reply);
}
