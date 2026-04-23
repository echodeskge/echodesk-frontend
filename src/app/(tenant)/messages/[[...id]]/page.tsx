"use client";

import MessagesChat from "@/components/MessagesChat";

export default function MessagesPage() {
  // Only show social messages (facebook, instagram, whatsapp, widget) - email has its own page
  return <MessagesChat key="messages" platforms={["facebook", "instagram", "whatsapp", "widget"]} />;
}
