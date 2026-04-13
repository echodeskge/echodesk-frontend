"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { useEmailMessages, useSyncEmail } from "@/hooks/api/useSocial";
import { useEmailContext } from "../_hooks/use-email-context";
import { PAGE_SIZE, isVirtualFolder } from "../constants";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { EmailListSearchForm } from "./email-list-search-form";
import { EmailMenuButton } from "./email-menu-button";

interface EmailListHeaderProps {
  filter: string;
}

export function EmailListHeader({ filter }: EmailListHeaderProps) {
  const { currentConnectionId } = useEmailContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const syncEmail = useSyncEmail();
  const t = useTranslations("email.list");

  const page = parseInt(searchParams.get("page") ?? "1");

  const queryParams = buildQueryParams(filter, currentConnectionId, page);
  const { data } = useEmailMessages(queryParams);

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  function handleSync() {
    syncEmail.mutate(currentConnectionId ?? undefined);
  }

  return (
    <CardHeader className="flex-row justify-between items-center gap-x-1.5 space-y-0 px-3 pb-0">
      <EmailMenuButton isIcon />
      <EmailListSearchForm />
      <Button
        variant="ghost"
        size="icon"
        className="ms-auto"
        onClick={handleSync}
        disabled={syncEmail.isPending}
        aria-label={t("syncEmails")}
      >
        <RefreshCw
          className={`h-4 w-4 ${syncEmail.isPending ? "animate-spin" : ""}`}
        />
      </Button>
      <Pagination className="w-fit mx-0">
        <PaginationContent>
          <PaginationItem>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`${pathname}?page=${page - 1}`)}
              aria-label={t("previousPage")}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`${pathname}?page=${page + 1}`)}
              aria-label={t("nextPage")}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </CardHeader>
  );
}

export function buildQueryParams(
  filter: string,
  connectionId: number | null,
  page: number,
  search?: string
) {
  const params: {
    page?: number;
    folder?: string;
    starred?: boolean;
    connection_id?: number;
    search?: string;
  } = { page };

  if (filter === "starred") {
    params.starred = true;
  } else if (!isVirtualFolder(filter)) {
    params.folder = filter;
  }

  if (connectionId) {
    params.connection_id = connectionId;
  }

  if (search) {
    params.search = search;
  }

  return params;
}
