"use client";

import { notFound } from "next/navigation";

import { MessagesChatBeta } from "@/components/messages-beta/MessagesChatBeta";
import { useMessagesBetaEnabled } from "@/hooks/useMessagesBetaEnabled";

export default function MessagesBetaPage() {
  const enabled = useMessagesBetaEnabled();

  if (!enabled) {
    // 404 keeps the route invisible to anyone without the feature key. We
    // deliberately don't redirect to /messages — accidental redirects from
    // a half-rolled-out feature are noisy to debug.
    notFound();
  }

  return <MessagesChatBeta key="messages-beta" platforms={["facebook", "instagram", "whatsapp", "widget"]} />;
}
