"use client";

import { ClientDetailPanel } from "@/components/chat/client-detail-panel";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";

interface Props {
  conversation: ConversationRow;
}

/**
 * Thin wrapper that mounts the legacy `ClientDetailPanel` inside the
 * /messages-beta chat box. The panel is fully self-contained — it owns
 * its own React Query state (useSocialClientByAccount + friends) and
 * mutations — so this wrapper only needs to:
 *
 *   • read the open/close flag from the beta store
 *   • map the beta ConversationRow into the panel's prop shape
 *
 * The panel's `platformId` (FB sender, WA phone, …) is the third+ segment
 * of the platform-prefixed chat id. Each platform follows the same
 * `<prefix>_<account>_<rest>` layout already used everywhere else in the
 * beta module.
 *
 * No edits to the legacy panel component itself — it ports cleanly because
 * it doesn't read ChatContext or any other legacy-only state.
 */
export function MessagesBetaClientRail({ conversation }: Props) {
  const showClientPanel = useMessagesBetaStore((s) => s.showClientPanel);
  const setShowClientPanel = useMessagesBetaStore((s) => s.setShowClientPanel);

  return (
    <ClientDetailPanel
      isOpen={showClientPanel}
      onClose={() => setShowClientPanel(false)}
      platform={conversation.platform}
      platformId={conversation.conversationKey}
      accountConnectionId={conversation.accountId}
      chatDisplayName={conversation.name}
      chatProfilePic={conversation.avatar}
    />
  );
}
