"use client";

import { useTranslations } from "next-intl";

import { useInfiniteEmailMessages } from "@/hooks/api/useSocial";
import type { PaginatedEmailMessageList } from "@/api/generated/interfaces";
import { useEmailListQueryParams } from "./email-list-content";

interface EmailListFooterProps {
  filter: string;
}

/** Design 32px list footer: "12 of 240 conversations". */
export function EmailListFooter({ filter }: EmailListFooterProps) {
  const t = useTranslations("email.list");
  const isDrafts = filter === "drafts";
  const queryParams = useEmailListQueryParams(filter);
  const { data } = useInfiniteEmailMessages(isDrafts ? undefined : queryParams);

  if (isDrafts) return null;

  const firstPage = data?.pages?.[0] as PaginatedEmailMessageList | undefined;
  const total = firstPage?.count ?? 0;
  const loaded =
    data?.pages?.reduce(
      (sum, page) => sum + ((page as PaginatedEmailMessageList).results?.length ?? 0),
      0
    ) ?? 0;

  return (
    <div
      className="flex h-8 shrink-0 items-center border-t border-border px-3 text-[11px] text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {total > 0 ? t("footerCount", { loaded, total }) : t("noEmails")}
    </div>
  );
}
