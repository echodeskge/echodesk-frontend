"use client";

import { useState } from "react";
import { SquarePen } from "lucide-react";
import { useTranslations } from "next-intl";

import { useHeaderActions } from "@/contexts/HeaderActionsContext";
import { useWhatsAppStatus } from "@/hooks/api/useSocial";
import { cn } from "@/lib/utils";

import { NewWhatsAppMessageDialog } from "./sidebar/NewWhatsAppMessageDialog";
import type { BetaPlatform, WsState } from "./store/types";
import { useMessagesBetaStore } from "./store/useMessagesBetaStore";

/** Which "Live" pill state a socket state maps to. */
export function liveState(ws: WsState): "live" | "reconnecting" | "offline" {
  if (ws === "open") return "live";
  if (ws === "connecting" || ws === "reconnecting") return "reconnecting";
  return "offline";
}

/**
 * Fills the app header for the Messages screen (design: "Messages" title, the
 * green "Live" pill bound to the socket, and the "New WhatsApp" primary CTA).
 * The header renders outside this route's providers, so the slot only gets
 * translated text; the compose dialog itself is rendered here, in the page.
 */
export function MessagesHeaderBridge({ platforms }: { platforms: BetaPlatform[] }) {
  const t = useTranslations("messagesBeta.page");
  const wsState = useMessagesBetaStore((s) => s.wsState);
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: waStatusData } = useWhatsAppStatus();
  const waStatus = waStatusData as { accounts?: Array<{ is_active: boolean }> } | undefined;
  const showCompose = platforms.includes("whatsapp") && !!waStatus?.accounts?.some((a) => a.is_active);

  const state = liveState(wsState);
  const liveLabel = t(state);
  const composeLabel = t("newWhatsApp");

  useHeaderActions(
    {
      breadcrumb: (
        <span
          className="ml-1 inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-xs text-muted-foreground"
          role="status"
          data-testid="messages-live-pill"
          data-state={state}
        >
          <span
            className={cn(
              "h-[7px] w-[7px] rounded-full",
              state === "live" && "bg-[hsl(142.1_76.2%_36.3%)]",
              state === "reconnecting" && "animate-pulse bg-amber-500",
              state === "offline" && "bg-rose-500"
            )}
          />
          {liveLabel}
        </span>
      ),
      primary: showCompose ? (
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          aria-label={composeLabel}
          data-testid="messages-new-whatsapp"
        >
          <SquarePen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{composeLabel}</span>
        </button>
      ) : undefined,
    },
    [state, liveLabel, showCompose, composeLabel]
  );

  return showCompose ? <NewWhatsAppMessageDialog open={composeOpen} onOpenChange={setComposeOpen} /> : null;
}
