"use client";

import { MessagesChatBeta } from "@/components/messages-beta/MessagesChatBeta";

// Backward-compat route — now serves the default socket-based inbox too.
export default function MessagesPage() {
  return (
    <MessagesChatBeta
      key="messages"
      platforms={["facebook", "instagram", "whatsapp", "widget"]}
    />
  );
}
