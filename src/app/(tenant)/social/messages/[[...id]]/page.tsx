"use client";

import { MessagesChatBeta } from "@/components/messages-beta/MessagesChatBeta";

// The socket-based inbox is now the default Social Messages experience. The
// old React-Query inbox (MessagesChat) is preserved at /social/messages-legacy.
export default function SocialMessagesPage() {
  return (
    <MessagesChatBeta
      key="social-messages"
      platforms={["facebook", "instagram", "whatsapp", "widget"]}
    />
  );
}
