"use client";

import MessagesChat from "@/components/MessagesChat";

// Legacy (pre-socket) Social Messages inbox. Kept reachable by direct URL as a
// fallback if the default socket inbox misbehaves — intentionally NOT in the
// navigation. Uses the parent /social layout (chat + socialClients namespaces).
export default function SocialMessagesLegacyPage() {
  return (
    <MessagesChat
      key="social-legacy"
      platforms={["facebook", "instagram", "whatsapp", "widget"]}
    />
  );
}
