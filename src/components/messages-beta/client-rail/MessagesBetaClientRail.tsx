"use client";

import Link from "next/link";
import { Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ClientDetailPanel } from "@/components/chat/client-detail-panel";
import { RailSection } from "@/components/chat/client-rail-sections";
import {
  canCreateTickets,
  useConversationTickets,
  useCreateConversationTicket,
  type ConversationKey,
} from "@/hooks/api/useConversationTickets";
import { useUserProfile } from "@/hooks/useUserProfile";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";

interface Props {
  conversation: ConversationRow;
}

export function conversationKeyOf(conversation: ConversationRow): ConversationKey {
  return {
    platform: conversation.platform,
    conversation_id: conversation.conversationKey,
    account_id: conversation.accountId,
  };
}

/** "Linked tickets" rail section + dashed "Create ticket" button. */
export function LinkedTicketsSection({ conversation }: Props) {
  const t = useTranslations("messagesBeta.rail");
  const { data: profile } = useUserProfile();
  const key = conversationKeyOf(conversation);
  const { data: tickets = [], isLoading } = useConversationTickets(key);
  const create = useCreateConversationTicket();
  const allowed = canCreateTickets(profile as never);

  const handleCreate = () => {
    create.mutate(key, {
      onSuccess: ({ ticket, created }) =>
        created === false
          ? toast.info(t("ticketAlreadyLinked", { id: ticket.id }))
          : toast.success(t("ticketCreated", { id: ticket.id })),
      onError: (err: unknown) => {
        const detail = (err as { response?: { data?: { error?: string; detail?: string } } })?.response?.data;
        toast.error(detail?.error || detail?.detail || t("ticketFailed"));
      },
    });
  };

  return (
    <RailSection title={t("linkedTickets")} testId="rail-tickets">
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : tickets.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noTickets")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-muted"
              >
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">#{ticket.id}</span>
                <span className="min-w-0 truncate">{ticket.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {allowed && (
        <button
          type="button"
          onClick={handleCreate}
          disabled={create.isPending}
          className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          data-testid="rail-create-ticket"
        >
          {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {t("createTicket")}
        </button>
      )}
    </RailSection>
  );
}

/**
 * Client profile rail (design): an inline third column on desktop, a full
 * overlay over the chat on mobile. Reuses the ClientDetailPanel logic (lookup,
 * link / create / edit client) in its inline variant and adds the linked
 * tickets section.
 */
export function MessagesBetaClientRail({ conversation }: Props) {
  const t = useTranslations("messagesBeta.rail");
  const showClientPanel = useMessagesBetaStore((s) => s.showClientPanel);
  const setShowClientPanel = useMessagesBetaStore((s) => s.setShowClientPanel);

  if (!showClientPanel) return null;

  return (
    <aside
      className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-background md:static md:z-auto md:w-[280px] md:shrink-0 md:border-l md:bg-muted/25"
      aria-label={t("title")}
      data-testid="messages-profile-rail"
    >
      <div className="flex h-10 shrink-0 items-center justify-end px-2 md:h-8">
        <button
          type="button"
          onClick={() => setShowClientPanel(false)}
          aria-label={t("close")}
          title={t("close")}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 pb-4">
        <ClientDetailPanel
          key={conversation.id}
          variant="inline"
          isOpen
          onClose={() => setShowClientPanel(false)}
          platform={conversation.platform}
          platformId={conversation.conversationKey}
          accountConnectionId={conversation.accountId}
          chatDisplayName={conversation.name}
          chatProfilePic={conversation.avatar}
          extraSections={<LinkedTicketsSection conversation={conversation} />}
        />
      </div>
    </aside>
  );
}
