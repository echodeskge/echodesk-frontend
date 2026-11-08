"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarCheck, Loader2, Mail, MessageSquare, Pencil, Phone, Ticket, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ClientNotesEditor, ClientTagsEditor, RailSection } from "@/components/chat/client-rail-sections";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  canCreateTickets,
  useClientTickets,
  useCreateConversationTicket,
} from "@/hooks/api/useConversationTickets";
import { useDeleteSocialClient, useSocialClient } from "@/hooks/api/useSocialClients";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn, getApiErrorMessage } from "@/lib/utils";

import {
  CLIENT_PLATFORM_BG,
  CLIENT_PLATFORM_BRAND,
  CLIENT_PLATFORM_ICON,
  clientInitials,
  clientTags,
  isClientPlatform,
  shortDate,
  type ClientPlatform,
} from "./clients-utils";
import type { EditableClient } from "./client-form-dialog";

/** A linked social account as the detail endpoint returns it. */
interface DetailAccount {
  id: number;
  platform: string;
  platform_id?: string | null;
  account_connection_id?: string | null;
  display_name?: string | null;
  username?: string | null;
  last_message_at?: string | null;
}

/** "Open chat" target from the list row (`social_accounts[].chat_id`). */
export interface ChatLink {
  id: number;
  platform: string;
  display_name?: string | null;
  chat_id: string | null;
}

interface Props {
  clientId: number;
  /** Chat links from the list row (the detail endpoint has no chat ids). */
  chatLinks: ChatLink[];
  bookingCount?: number | null;
  canDelete: boolean;
  customFieldLabels: Record<string, string>;
  onClose: () => void;
  onEdit: (client: EditableClient) => void;
  onDeleted: () => void;
  className?: string;
}

function platformLabel(platform: string, widgetLabel: string): string {
  if (!isClientPlatform(platform)) return platform;
  return CLIENT_PLATFORM_BRAND[platform] ?? widgetLabel;
}

function PlatformDot({ platform, size = 18 }: { platform: string; size?: 18 | 24 }) {
  const p: ClientPlatform = isClientPlatform(platform) ? platform : "widget";
  const Icon = CLIENT_PLATFORM_ICON[p];
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-white",
        size === 18 ? "h-[18px] w-[18px]" : "h-6 w-6",
        CLIENT_PLATFORM_BG[p]
      )}
      aria-hidden
    >
      <Icon className={size === 18 ? "h-[9px] w-[9px]" : "h-3 w-3"} strokeWidth={2.5} />
    </span>
  );
}

const actionButton =
  "inline-flex h-[30px] items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-50";

/** Design "client detail rail": header, identity + quick actions, contact, linked accounts, activity, tags, notes, delete. */
export function ClientDetailRail({
  clientId,
  chatLinks,
  bookingCount,
  canDelete,
  customFieldLabels,
  onClose,
  onEdit,
  onDeleted,
  className,
}: Props) {
  const t = useTranslations("socialClients.screen.rail");
  const tScreen = useTranslations("socialClients.screen");
  const tRail = useTranslations("messagesBeta.rail");
  const router = useRouter();
  const { data: client, isLoading } = useSocialClient(clientId);
  const { data: profile } = useUserProfile();
  const { data: tickets = [], isLoading: ticketsLoading } = useClientTickets(clientId);
  const createTicket = useCreateConversationTicket();
  const deleteClient = useDeleteSocialClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accounts = ((client as unknown as { social_accounts?: DetailAccount[] })?.social_accounts ?? []) as DetailAccount[];
  const customFields = ((client as unknown as { custom_fields?: Record<string, unknown> })?.custom_fields ?? {}) as Record<
    string,
    unknown
  >;
  const notes = (client as unknown as { notes?: string | null })?.notes;
  const ticketAccount = accounts.find((a) => a.platform !== "email" && a.platform_id && a.account_connection_id);
  const allowTicket = canCreateTickets(profile as never) && !!ticketAccount;
  const openable = chatLinks.filter((c) => !!c.chat_id);
  const widgetLabel = tScreen("widget");

  const handleTicket = () => {
    if (!ticketAccount) return;
    createTicket.mutate(
      {
        platform: ticketAccount.platform,
        conversation_id: ticketAccount.platform_id as string,
        account_id: ticketAccount.account_connection_id as string,
      },
      {
        onSuccess: ({ ticket, created }) =>
          created === false
            ? toast.info(tRail("ticketAlreadyLinked", { id: ticket.id }))
            : toast.success(tRail("ticketCreated", { id: ticket.id })),
        onError: (err: unknown) => {
          const detail = (err as { response?: { data?: { error?: string; detail?: string } } })?.response?.data;
          toast.error(detail?.error || detail?.detail || tRail("ticketFailed"));
        },
      }
    );
  };

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(clientId);
      toast.success(tScreen("toasts.deleted"));
      setConfirmDelete(false);
      onDeleted();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, tScreen("toasts.deleteFailed")));
    }
  };

  const customEntries = Object.entries(customFields).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
  );

  return (
    <aside
      className={cn("flex flex-col overflow-y-auto border-l bg-background", className)}
      data-testid="client-detail-rail"
      aria-label={t("title")}
    >
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b pl-4 pr-2">
        <span className="flex-1 text-[13px] font-semibold">{t("title")}</span>
        <button
          type="button"
          disabled={!client}
          onClick={() =>
            client &&
            onEdit({ id: client.id, name: client.name, email: client.email, phone: client.phone, notes: notes ?? null })
          }
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Pencil className="h-[13px] w-[13px]" />
          {t("edit")}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading || !client ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {/* identity + quick actions */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            {client.profile_picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.profile_picture} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-[17px] font-semibold text-primary">
                {clientInitials(client.name)}
              </span>
            )}
            <span className="text-[15px] font-semibold">{client.name}</span>
            <span className="text-xs text-muted-foreground">
              {t("createdOn", { date: shortDate(client.created_at as unknown as string) })}
            </span>
            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
              {client.phone && (
                <a href={`tel:${client.phone}`} className={actionButton}>
                  <Phone className="h-[13px] w-[13px]" />
                  {t("call")}
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className={actionButton}>
                  <Mail className="h-[13px] w-[13px]" />
                  {t("email")}
                </a>
              )}
              {allowTicket && (
                <button type="button" onClick={handleTicket} disabled={createTicket.isPending} className={actionButton}>
                  {createTicket.isPending ? (
                    <Loader2 className="h-[13px] w-[13px] animate-spin" />
                  ) : (
                    <Ticket className="h-[13px] w-[13px]" />
                  )}
                  {t("ticket")}
                </button>
              )}
            </div>
          </div>

          <RailSection title={t("contact")} testId="client-rail-contact">
            <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-2 text-xs">
              <span className="text-muted-foreground">{t("emailLabel")}</span>
              <span className="truncate">{client.email || "—"}</span>
              <span className="text-muted-foreground">{t("phoneLabel")}</span>
              <span className="truncate tabular-nums">{client.phone || "—"}</span>
              {customEntries.map(([key, value]) => (
                <div key={key} className="contents">
                  <span className="truncate text-muted-foreground" title={customFieldLabels[key] ?? key}>
                    {customFieldLabels[key] ?? key}
                  </span>
                  <span className="truncate" title={String(value)}>
                    {typeof value === "boolean" ? (value ? t("yes") : t("no")) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </RailSection>

          <RailSection title={t("linkedAccounts")} testId="client-rail-accounts">
            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noLinkedAccounts")}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {accounts.map((account) => (
                  <div key={account.id} className="flex h-[34px] items-center gap-2 rounded-md border px-2.5 text-xs">
                    <PlatformDot platform={account.platform} />
                    <span className="min-w-0 flex-1 truncate">
                      {account.display_name || account.username || account.platform_id}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {platformLabel(account.platform, widgetLabel)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">{t("linkHint")}</p>
          </RailSection>

          <RailSection title={t("activity")} testId="client-rail-activity">
            <div className="flex flex-col">
              {openable.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => router.push(`/social/messages/${link.chat_id}`)}
                  className="flex h-[30px] items-center gap-2 rounded-md px-2 text-left text-xs hover:bg-accent"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1">{t("openChat")}</span>
                  <span className="max-w-[45%] truncate text-[11px] text-muted-foreground">
                    {platformLabel(link.platform, widgetLabel)}
                    {link.display_name ? ` · ${link.display_name}` : ""}
                  </span>
                </button>
              ))}
              {client.is_booking_enabled && (
                <div className="flex h-[30px] items-center gap-2 px-2 text-xs">
                  <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1">{t("bookings")}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{bookingCount ?? 0}</span>
                </div>
              )}
              {ticketsLoading ? (
                <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/tickets/${ticket.id}`}
                    className="flex h-[30px] items-center gap-2 rounded-md px-2 text-xs hover:bg-accent"
                  >
                    <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{ticket.title || t("ticketNumber", { id: ticket.id })}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">#{ticket.id}</span>
                  </Link>
                ))
              )}
              {!openable.length && !client.is_booking_enabled && !ticketsLoading && tickets.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("noActivity")}</p>
              )}
            </div>
          </RailSection>

          <RailSection title={t("tags")} testId="client-rail-tags">
            <ClientTagsEditor clientId={client.id} tags={clientTags((client as unknown as { tags?: unknown }).tags)} />
          </RailSection>

          <RailSection title={t("notes")} testId="client-rail-notes">
            <ClientNotesEditor clientId={client.id} notes={notes} />
          </RailSection>

          {canDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-[30px] items-center justify-center gap-1.5 rounded-md text-xs text-red-600 hover:bg-destructive/10 dark:text-red-400"
            >
              <Trash2 className="h-[13px] w-[13px]" />
              {t("delete")}
            </button>
          )}
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteBody", { name: client?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleteClient.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
