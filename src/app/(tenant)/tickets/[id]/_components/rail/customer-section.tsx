"use client";

/**
 * Customer section (FE-12, E23, DC36; design D190–D192).
 *
 * Rendered only when the ticket has a customer and `can_view_customer`.
 * Identity (36px initials avatar, name, "email · phone"), then link rows:
 * - one per chat-capable social account → `/social/messages/{chat_id}`,
 *   with the platform name as meta (from `useSocialClient`);
 * - email → `mailto:`, phone → `tel:`;
 * - "Open client" → `/social/clients?client={id}` (the Clients deep link).
 * No Calls row: there is no phone-filtered calls route (plan §12).
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Mail, MessageSquare, Phone, UserRound, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSocialClient } from "@/hooks/api/useSocialClients";
import { CLIENT_PLATFORM_BRAND, clientInitials, isClientPlatform } from "@/app/(tenant)/social/clients/_components/clients-utils";
import type { TicketCustomer, ViewerPermissions } from "../../../_lib/types";
import { chatTargets, type ClientAccountLike } from "./chat-links";
import { RailSection } from "./rail-shared";

const ROW =
  "flex h-[30px] items-center gap-2 rounded-md px-2 text-left text-xs outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

function LinkBody({ icon: Icon, label, meta }: { icon: LucideIcon; label: ReactNode; meta?: ReactNode }) {
  return (
    <>
      <span className="flex shrink-0 text-muted-foreground">
        <Icon aria-hidden="true" size={14} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta && <span className="shrink-0 text-[11px] text-muted-foreground">{meta}</span>}
      <ChevronRight aria-hidden="true" size={12} className="shrink-0 text-muted-foreground" />
    </>
  );
}

export function CustomerSection({ customer, perms }: { customer: TicketCustomer | null; perms: ViewerPermissions }) {
  const t = useTranslations("ticketsScreen.customer");
  const visible = !!customer && perms.can_view_customer;
  const { data: client } = useSocialClient(customer?.id ?? 0, { enabled: visible });

  if (!visible || !customer) return null;

  const accounts = ((client as unknown as { social_accounts?: ClientAccountLike[] } | undefined)?.social_accounts ?? []) as ClientAccountLike[];
  const chats = chatTargets(accounts);
  const email = customer.email || null;
  const phone = customer.phone || null;
  const sub = [email, phone].filter(Boolean).join(" · ");
  const platformName = (p: string) => (isClientPlatform(p) ? CLIENT_PLATFORM_BRAND[p] : null) ?? t("widget");

  return (
    <RailSection label={t("title")} gap={10} data-testid="customer-section">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          data-slot="customer-avatar"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
        >
          {clientInitials(customer.name)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span data-slot="customer-name" className="truncate text-[13px] font-semibold leading-5">
            {customer.name}
          </span>
          {sub ? (
            <span className="truncate text-[11px] leading-4 text-muted-foreground">{sub}</span>
          ) : (
            <span className="text-[11px] leading-4 text-muted-foreground">{t("noContact")}</span>
          )}
        </span>
      </div>
      <nav aria-label={t("title")} className="flex flex-col gap-0.5" data-testid="customer-links">
        {chats.map((c) => {
          const platform = platformName(c.platform);
          return (
            <Link
              key={c.chatId}
              href={`/social/messages/${c.chatId}`}
              className={ROW}
              data-slot="customer-link"
              data-kind="chat"
              title={c.displayName ?? undefined}
            >
              <LinkBody icon={MessageSquare} label={t("conversation", { platform })} meta={platform} />
            </Link>
          );
        })}
        {email && (
          <a href={`mailto:${email}`} className={ROW} data-slot="customer-link" data-kind="email">
            <LinkBody icon={Mail} label={email} meta={t("email")} />
          </a>
        )}
        {phone && (
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className={ROW} data-slot="customer-link" data-kind="phone">
            <LinkBody icon={Phone} label={phone} meta={t("phone")} />
          </a>
        )}
        <Link
          href={`/social/clients?client=${customer.id}`}
          className={ROW}
          data-slot="customer-link"
          data-kind="client"
          data-testid="open-client"
        >
          <LinkBody icon={UserRound} label={t("openClient")} />
        </Link>
      </nav>
    </RailSection>
  );
}
