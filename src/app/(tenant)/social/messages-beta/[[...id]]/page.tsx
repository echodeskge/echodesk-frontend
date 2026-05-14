"use client";

import { notFound } from "next/navigation";

import { MessagesChatBeta } from "@/components/messages-beta/MessagesChatBeta";
import { useMessagesBetaEnabled } from "@/hooks/useMessagesBetaEnabled";

export default function SocialMessagesBetaPage() {
  const enabled = useMessagesBetaEnabled();

  if (!enabled) {
    notFound();
  }

  return <MessagesChatBeta key="social-messages-beta" platforms={["facebook", "instagram", "whatsapp", "widget"]} />;
}
