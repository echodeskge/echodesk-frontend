"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Inbox, Loader2 } from "lucide-react";

import {
  useInfiniteEmailMessages,
  useEmailDrafts,
  type EmailMessage,
  type EmailThreadView,
} from "@/hooks/api/useSocial";
import type { EmailDraft } from "@/hooks/api/useSocial";
import type { PaginatedEmailMessageList } from "@/api/generated/interfaces";
import { useEmailContext } from "../_hooks/use-email-context";
import { EMAIL_VIEWS, isEmailViewRoute, isVirtualFolder } from "../constants";
import { EmailListContentHeader } from "./email-list-content-header";
import { EmailListRow } from "./email-list-row";
import { EmailDraftList } from "./email-draft-list";

interface EmailListContentProps {
  filter: string;
  openId?: number | null;
}

export interface EmailListQueryParams {
  folder?: string;
  starred?: boolean;
  view?: EmailThreadView;
  is_read?: boolean;
  connection_id?: number;
  search?: string;
}

function buildInfiniteQueryParams(
  filter: string,
  connectionId: number | null,
  search?: string,
  unreadOnly = false
): EmailListQueryParams {
  const params: EmailListQueryParams = {};

  if (filter === "starred") {
    params.starred = true;
  } else if (isEmailViewRoute(filter)) {
    params.view = EMAIL_VIEWS[filter];
  } else if (!isVirtualFolder(filter)) {
    params.folder = filter;
  }

  if (unreadOnly) params.is_read = false;
  if (connectionId) params.connection_id = connectionId;
  if (search) params.search = search;

  return params;
}

/** The list query for the current folder / view, search and Unread toggle. */
export function useEmailListQueryParams(filter: string): EmailListQueryParams {
  const { currentConnectionId } = useEmailContext();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? undefined;
  const unreadOnly = searchParams.get("unread") === "1";
  return buildInfiniteQueryParams(filter, currentConnectionId, search, unreadOnly);
}

export function EmailListContent({ filter, openId = null }: EmailListContentProps) {
  const { currentConnectionId, selectedEmailIds, setListOrder } = useEmailContext();
  const searchParams = useSearchParams();
  const t = useTranslations("email.list");
  const isDrafts = filter === "drafts";
  const queryParams = useEmailListQueryParams(filter);
  const searching = !!searchParams.get("search") || searchParams.get("unread") === "1";

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteEmailMessages(isDrafts ? undefined : queryParams);

  const {
    data: draftsData,
    isLoading: draftsLoading,
    error: draftsError,
  } = useEmailDrafts();

  const isLoading = isDrafts ? draftsLoading : messagesLoading;
  const error = isDrafts ? draftsError : messagesError;

  // Drafts are EmailDraft rows with their own ids — never map them onto
  // EmailMessage objects (their ids would hit unrelated messages).
  const drafts: EmailDraft[] = useMemo(() => {
    if (!isDrafts) return [];
    const rows = (draftsData?.results ?? []) as unknown as EmailDraft[];
    return currentConnectionId
      ? rows.filter((d) => d.connection === currentConnectionId)
      : rows;
  }, [isDrafts, draftsData, currentConnectionId]);

  const emails: EmailMessage[] = useMemo(() => {
    if (isDrafts) return [];
    return (
      messagesData?.pages?.flatMap(
        (page) => (page as PaginatedEmailMessageList).results ?? []
      ) ?? []
    ) as EmailMessage[];
  }, [isDrafts, messagesData]);

  const orderKey = emails.map((e) => e.id).join(",");
  useEffect(() => {
    setListOrder(emails.map((e) => e.id));
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, emails.length]);

  if (isLoading) {
    return (
      <>
        <EmailListContentHeader emails={[]} filter={filter} simple={isDrafts} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <EmailListContentHeader emails={[]} filter={filter} simple={isDrafts} />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-xs text-destructive">{t("loadFailed")}</p>
        </div>
      </>
    );
  }

  if (isDrafts) {
    return (
      <>
        <EmailListContentHeader emails={[]} filter={filter} simple />
        {drafts.length === 0 ? (
          <EmailListEmpty hint={t("emptyDrafts")} />
        ) : (
          <EmailDraftList drafts={drafts} />
        )}
      </>
    );
  }

  const selectedSet = new Set(selectedEmailIds);

  return (
    <>
      <EmailListContentHeader emails={emails} filter={filter} />
      {emails.length === 0 ? (
        <EmailListEmpty hint={searching ? t("emptySearch") : t("emptyFolder")} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto" data-testid="email-list">
          <ul>
            {emails.map((email) => (
              <EmailListRow
                key={email.id}
                email={email}
                filter={filter}
                isSelected={selectedSet.has(email.id)}
                isOpen={email.id === openId}
              />
            ))}
          </ul>
          <div ref={sentinelRef} className="h-1" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Design empty state: Inbox icon, "Nothing here" and a hint. */
export function EmailListEmpty({ hint }: { hint: string }) {
  const t = useTranslations("email.list");
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16 text-center" data-testid="email-list-empty">
      <Inbox className="mb-2 h-6 w-6 text-muted-foreground" />
      <p className="text-[13px] font-medium">{t("nothingHere")}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// Re-export for footer
export { buildInfiniteQueryParams };
export type { EmailListContentProps };
