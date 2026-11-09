/**
 * Chat ids for a client's social accounts (FE-12 customer section, E23).
 *
 * The client detail endpoint (`useSocialClient`) returns `platform`,
 * `platform_id` and `account_connection_id` but no `chat_id` (only the list
 * serializer adds it). This mirrors the backend's
 * `_build_chat_id_for_account` for the platforms it can resolve without a
 * lookup; widget chats need the visitor's latest session, so they (and
 * platforms the backend can't open either) get no link.
 *
 *   facebook  → fb_<connection>_<platform_id>
 *   instagram → ig_<connection>_<platform_id>
 *   whatsapp  → wa_<connection>_<platform_id without a leading +>
 *   email     → email_<connection>_<platform_id>
 */
export interface ClientAccountLike {
  id: number;
  platform: string;
  platform_id?: string | null;
  account_connection_id?: string | null;
  display_name?: string | null;
  username?: string | null;
  /** Present on list rows (SocialAccountChatLinkSerializer); wins when set. */
  chat_id?: string | null;
}

export function chatIdForAccount(account: ClientAccountLike): string | null {
  if (account.chat_id) return account.chat_id;
  const pid = account.platform_id?.trim();
  const conn = account.account_connection_id?.trim();
  if (!pid || !conn) return null;
  switch (account.platform) {
    case "facebook":
      return `fb_${conn}_${pid}`;
    case "instagram":
      return `ig_${conn}_${pid}`;
    case "whatsapp":
      return `wa_${conn}_${pid.replace(/^\++/, "")}`;
    case "email":
      return `email_${conn}_${pid}`;
    default:
      return null;
  }
}

export interface ChatTarget {
  accountId: number;
  platform: string;
  chatId: string;
  displayName: string | null;
}

/** One link per account the Messages screen can open. */
export function chatTargets(accounts: ClientAccountLike[] | null | undefined): ChatTarget[] {
  const out: ChatTarget[] = [];
  const seen = new Set<string>();
  for (const a of accounts ?? []) {
    const chatId = chatIdForAccount(a);
    if (!chatId || seen.has(chatId)) continue;
    seen.add(chatId);
    out.push({ accountId: a.id, platform: a.platform, chatId, displayName: a.display_name || a.username || null });
  }
  return out;
}
