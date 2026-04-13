"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  useInfiniteEmailMessages,
} from "@/hooks/api/useSocial";
import type { PaginatedEmailMessageList } from "@/api/generated/interfaces";
import { useEmailContext } from "../_hooks/use-email-context";
import { buildInfiniteQueryParams } from "./email-list-content";
import { CardFooter } from "@/components/ui/card";

interface EmailListFooterProps {
  filter: string;
}

export function EmailListFooter({ filter }: EmailListFooterProps) {
  const { currentConnectionId } = useEmailContext();
  const searchParams = useSearchParams();
  const t = useTranslations("email.list");

  const search = searchParams.get("search") ?? undefined;
  const isDrafts = filter === "drafts";

  const queryParams = buildInfiniteQueryParams(
    filter,
    currentConnectionId,
    search
  );
  const { data } = useInfiniteEmailMessages(isDrafts ? undefined : queryParams);

  const firstPage = data?.pages?.[0] as PaginatedEmailMessageList | undefined;
  const total = firstPage?.count ?? 0;
  const loaded =
    data?.pages?.reduce(
      (sum, page) =>
        sum + ((page as PaginatedEmailMessageList).results?.length ?? 0),
      0
    ) ?? 0;

  return (
    <CardFooter className="justify-center py-3 border-t border-border">
      <p className="text-muted-foreground" role="status" aria-live="polite">
        {total > 0
          ? `${loaded} / ${total.toLocaleString()}`
          : t("noEmails")}
      </p>
    </CardFooter>
  );
}
