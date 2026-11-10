"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "@/api/axios";
import { callLogsPartialUpdate, clientsLookupByPhoneRetrieve } from "@/api/generated/api";
import type { CallLog, ClientPhoneLookupResult, PaginatedCallLogList } from "@/api/generated/interfaces";
import { useClientTickets } from "@/hooks/api/useConversationTickets";
import { digitsOnly } from "../call-format";

export type CallerClientSource = "crm" | "social";

export interface CallerClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  /** `crm` = crm.Client, `social` = social_integrations client (ticket customer, Clients screen). */
  source: CallerClientSource;
}

export const RECENT_CALLS_PAGE_SIZE = 6;

export function toCallerClient(result: ClientPhoneLookupResult | undefined): CallerClient | null {
  if (!result) return null;
  return {
    id: result.id,
    name: result.name,
    email: result.email,
    phone: result.phone,
    company: result.company,
    source: result.source === "social" ? "social" : "crm",
  };
}

/**
 * Everything the caller-context section shows for one call:
 * - the client behind the number (`clientsLookupByPhoneRetrieve`, last-7-digit match on the backend)
 * - that client's tickets by id (social clients only; CRM contacts have no linked tickets)
 * - the last calls with this number (`search=number`, page_size 6, the current log excluded)
 * - a notes mutation on the call log
 */
export function useCallerContext(number: string, logId: number | null) {
  const digits = digitsOnly(number);

  const lookup = useQuery({
    queryKey: ["calls", "caller-lookup", digits],
    queryFn: () => clientsLookupByPhoneRetrieve(number),
    enabled: digits.length > 0,
    staleTime: 60_000,
    retry: 1,
  });
  const client = useMemo(() => toCallerClient(lookup.data?.results?.[0]), [lookup.data]);

  const tickets = useClientTickets(client?.source === "social" ? client.id : null);

  const recentCalls = useQuery({
    queryKey: ["calls", "caller-recent", digits, logId ?? 0],
    queryFn: async () => {
      // Named params: the generated callLogsList takes positional arguments
      // whose order shifts whenever a filter is added.
      const { data } = await axios.get<PaginatedCallLogList>("/api/call-logs/", {
        params: { ordering: "-started_at", page: 1, page_size: RECENT_CALLS_PAGE_SIZE, search: number },
      });
      return (data.results ?? []).filter((c: CallLog) => c.id !== logId).slice(0, RECENT_CALLS_PAGE_SIZE - 1);
    },
    enabled: digits.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  const saveNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => callLogsPartialUpdate(id, { notes }),
  });

  return { lookup, client, tickets, recentCalls, saveNotes };
}
