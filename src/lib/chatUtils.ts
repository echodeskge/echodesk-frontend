import type { ChatAssignmentPlatform } from "@/hooks/api/useSocial";

export interface ParsedChatId {
  platform: ChatAssignmentPlatform;
  accountId: string;
  conversationId: string;
}

/**
 * Parses a composite chat ID into its platform, account_id, and conversation_id components.
 *
 * Format: prefix_{account_id}_{conversation_id}
 * - Facebook: fb_{page_id}_{sender_id}
 * - Instagram: ig_{account_id}_{sender_id}
 * - WhatsApp: wa_{waba_id}_{from_number}
 * - Email: email_{connection_id}_{thread_id}
 */
export function parseChatId(chatId: string, platform?: string): ParsedChatId | null {
  const parts = chatId.split('_');
  const prefix = parts[0];

  // All platforms use the same format: prefix_{account_id}_{conversation_id}
  if (parts.length < 3) return null;

  const accountId = parts[1];
  const conversationId = parts.slice(2).join('_');

  let parsedPlatform: ChatAssignmentPlatform;
  if (platform) {
    parsedPlatform = platform as ChatAssignmentPlatform;
  } else if (prefix === 'fb') {
    parsedPlatform = 'facebook';
  } else if (prefix === 'ig') {
    parsedPlatform = 'instagram';
  } else if (prefix === 'wa') {
    parsedPlatform = 'whatsapp';
  } else if (prefix === 'email') {
    parsedPlatform = 'email';
  } else {
    return null;
  }

  return { platform: parsedPlatform, accountId, conversationId };
}
