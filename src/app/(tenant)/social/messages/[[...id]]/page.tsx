"use client";

import MessagesChat from "@/components/MessagesChat";

export default function SocialMessagesPage() {
  return <MessagesChat key="social" platforms={["facebook", "instagram", "whatsapp"]} />;
}
