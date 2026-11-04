"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useMedia } from "react-use";

import {
  useInfiniteEmailMessages,
  useEmailDrafts,
  type EmailMessage,
} from "@/hooks/api/useSocial";
import type { EmailDraft } from "@/hooks/api/useSocial";
import type { PaginatedEmailMessageList } from "@/api/generated/interfaces";
import { useEmailContext } from "../_hooks/use-email-context";
import { isVirtualFolder } from "../constants";
import { CardContent } from "@/components/ui/card";
import { EmailListContentHeader } from "./email-list-content-header";
import { EmailListContentDesktop } from "./email-list-content-desktop";
import { EmailListContentMobile } from "./email-list-content-mobile";
import { EmailNotFound } from "./email-not-found";
import { EmailDraftList } from "./email-draft-list";
import { Loader2 } from "lucide-react";

interface EmailListContentProps {
  filter: string;
}

function buildInfiniteQueryParams(
  filter: string,
  connectionId: number | null,
  search?: string
) {
  const params: {
    folder?: string;
    starred?: boolean;
    connection_id?: number;
    search?: string;
  } = {};

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

export function EmailListContent({ filter }: EmailListContentProps) {
  const { currentConnectionId } = useEmailContext();
  const searchParams = useSearchParams();
  const isMediumOrSmaller = useMedia("(max-width: 767px)");

  const search = searchParams.get("search") ?? undefined;
  const isDrafts = filter === "drafts";

  const queryParams = buildInfiniteQueryParams(
    filter,
    currentConnectionId,
    search
  );

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

  // Flatten infinite query pages into a single array
  const totalCount = useMemo(() => {
    if (isDrafts) return draftsData?.count ?? 0;
    const firstPage = messagesData?.pages?.[0] as
      | PaginatedEmailMessageList
      | undefined;
    return firstPage?.count ?? 0;
  }, [isDrafts, draftsData, messagesData]);

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

  if (isLoading) {
    return (
      <CardContent className="flex-1 h-full flex items-center justify-center p-0">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    );
  }

  if (error) {
    return (
      <CardContent className="flex-1 h-full flex items-center justify-center p-0">
        <p className="text-destructive">Failed to load emails</p>
      </CardContent>
    );
  }

  if (isDrafts) {
    return (
      <CardContent className="flex-1 h-full flex flex-col p-0">
        {drafts.length === 0 ? (
          <EmailNotFound inline />
        ) : (
          <EmailDraftList drafts={drafts} />
        )}
      </CardContent>
    );
  }

  if (emails.length === 0) {
    return (
      <CardContent className="flex-1 h-full flex flex-col p-0">
        <EmailListContentHeader emails={emails} filter={filter} />
        <EmailNotFound inline />
      </CardContent>
    );
  }

  return (
    <CardContent className="flex-1 h-full flex flex-col p-0">
      <EmailListContentHeader emails={emails} filter={filter} />
      {isMediumOrSmaller ? (
        <EmailListContentMobile
          emails={emails}
          filter={filter}
          fetchNextPage={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      ) : (
        <EmailListContentDesktop
          emails={emails}
          filter={filter}
          fetchNextPage={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      )}
    </CardContent>
  );
}

// Re-export for footer
export { buildInfiniteQueryParams };
export type { EmailListContentProps };
