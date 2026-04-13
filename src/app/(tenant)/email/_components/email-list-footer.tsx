"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useEmailMessages } from "@/hooks/api/useSocial";
import { useEmailContext } from "../_hooks/use-email-context";
import { buildQueryParams } from "./email-list-header";
import { PAGE_SIZE } from "../constants";
import { CardFooter } from "@/components/ui/card";

interface EmailListFooterProps {
  filter: string;
}

export function EmailListFooter({ filter }: EmailListFooterProps) {
  const { currentConnectionId } = useEmailContext();
  const searchParams = useSearchParams();
  const t = useTranslations("email.list");

  const page = parseInt(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? undefined;
  const queryParams = buildQueryParams(filter, currentConnectionId, page, search);
  const { data } = useEmailMessages(filter === "drafts" ? undefined : queryParams);

  const total = data?.count ?? 0;
  const start = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <CardFooter className="justify-center py-3 border-t border-border">
      <p className="text-muted-foreground" role="status" aria-live="polite">
        {total > 0
          ? `${start}-${end} of ${total.toLocaleString()}`
          : t("noEmails")}
      </p>
    </CardFooter>
  );
}
