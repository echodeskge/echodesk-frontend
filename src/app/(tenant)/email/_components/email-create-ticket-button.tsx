"use client";

import { useRouter } from "next/navigation";
import { Loader2, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { isAxiosError } from "axios";

import { useCreateTicketFromEmail, type EmailMessage } from "@/hooks/api/useSocial";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { EmailTicketChip } from "./email-ticket-chip";

const tool =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50";

/** Profile feature keys (string JSON or array). */
export function hasFeatureKey(featureKeys: unknown, key: string): boolean {
  let keys: unknown = featureKeys;
  if (typeof keys === "string") {
    try {
      keys = JSON.parse(keys);
    } catch {
      return false;
    }
  }
  return Array.isArray(keys) && keys.includes(key);
}

/** Design "Create ticket" (or the linked ticket's chip). Needs ticket_management. */
export function EmailCreateTicketButton({ email }: { email: EmailMessage }) {
  const t = useTranslations("email.view");
  const router = useRouter();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const create = useCreateTicketFromEmail();

  if (email.ticket) {
    return <EmailTicketChip ticket={email.ticket} size="md" link className="mx-1" />;
  }
  if (!hasFeatureKey(profile?.feature_keys, "ticket_management")) return null;

  function handleCreate() {
    if (!email.thread_id) return;
    create.mutate(
      { connection_id: email.connection_id, thread_id: email.thread_id },
      {
        onSuccess: ({ ticket }) =>
          sonnerToast.success(t("ticketCreated", { id: ticket.id }), {
            action: { label: t("openTicket"), onClick: () => router.push(`/tickets/${ticket.id}`) },
          }),
        onError: (error) => {
          const detail = isAxiosError(error)
            ? (error.response?.data as { error?: string; detail?: string } | undefined)
            : undefined;
          toast({ title: t("ticketFailed"), description: detail?.error || detail?.detail, variant: "destructive" });
        },
      }
    );
  }

  return (
    <button type="button" className={tool} onClick={handleCreate} disabled={!email.thread_id || create.isPending} data-testid="email-create-ticket">
      {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{t("createTicket")}</span>
    </button>
  );
}
