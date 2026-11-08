"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Phone, Settings } from "lucide-react";
import { useHeaderActions } from "@/contexts/HeaderActionsContext";
import { SipStatusIndicator } from "@/components/calls/SipStatusIndicator";

interface CallsHeaderBridgeProps {
  sipRegistered: boolean;
  sipConnecting: boolean;
  extension?: string;
  /** Shows the SIP pill (only when a softphone config exists). */
  showSip: boolean;
  /** Admins get the "SIP settings" link. */
  isAdmin: boolean;
  onNewCall: () => void;
}

/**
 * Fills the app header for Calls: the SIP registration pill after the
 * title, the "New call" primary button and (admins) "SIP settings".
 */
export function CallsHeaderBridge({ sipRegistered, sipConnecting, extension, showSip, isAdmin, onNewCall }: CallsHeaderBridgeProps) {
  const t = useTranslations("calls.page");
  const newCall = t("newCall");
  const sipSettings = t("sipSettings");

  useHeaderActions(
    {
      meta: showSip ? (
        <SipStatusIndicator isRegistered={sipRegistered} isConnecting={sipConnecting} extension={extension} compact />
      ) : undefined,
      primary: (
        <button
          type="button"
          onClick={onNewCall}
          aria-label={newCall}
          data-testid="calls-new-call"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Phone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{newCall}</span>
        </button>
      ),
      icons: isAdmin ? (
        <Link
          href="/settings/calls"
          aria-label={sipSettings}
          title={sipSettings}
          data-testid="calls-sip-settings"
          className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings className="h-[15px] w-[15px]" />
          <span className="hidden sm:inline">{sipSettings}</span>
        </Link>
      ) : undefined,
    },
    [showSip, sipRegistered, sipConnecting, extension, isAdmin, newCall, sipSettings, onNewCall]
  );

  return null;
}
