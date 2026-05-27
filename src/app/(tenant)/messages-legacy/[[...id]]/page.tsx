"use client";

import MessagesChat from "@/components/MessagesChat";

// Backward-compat alias of the legacy inbox (see social/messages-legacy).
export default function MessagesLegacyPage() {
  return (
    <MessagesChat
      key="messages-legacy"
      platforms={["facebook", "instagram", "whatsapp", "widget"]}
    />
  );
}
