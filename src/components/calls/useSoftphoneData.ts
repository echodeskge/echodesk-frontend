"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/api/axios";
import type { RecentContact } from "./DialPad";
import { digitsOnly } from "./call-format";

interface RecentLog {
  id: number;
  direction: "inbound" | "outbound";
  caller_number: string;
  recipient_number: string;
  client_name: string | null;
}

/** The three most recent unique numbers that belong to a named contact. */
export function recentNamedContacts(logs: RecentLog[], limit = 3): RecentContact[] {
  const seen = new Set<string>();
  const out: RecentContact[] = [];
  for (const log of logs) {
    const name = (log.client_name ?? "").trim();
    const number = log.direction === "inbound" ? log.caller_number : log.recipient_number;
    const key = digitsOnly(number);
    if (!name || !key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, number });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Data the idle softphone shows next to the keypad: recent named contacts
 * (from the call log) and the name matching the dialled number (recents
 * first, then the backend phone lookup). Only runs while `enabled`.
 */
export function useSoftphoneData(dialNumber: string, refreshKey: number, enabled: boolean) {
  const { data: recentLogs } = useQuery({
    queryKey: ["calls", "softphone-recents", refreshKey],
    queryFn: async () => {
      const { data } = await axios.get<{ results?: RecentLog[] }>("/api/call-logs/", {
        params: { ordering: "-started_at", page: 1, page_size: 30 },
      });
      return data.results ?? [];
    },
    enabled,
    staleTime: 60_000,
  });

  const recents = useMemo(() => recentNamedContacts(recentLogs ?? []), [recentLogs]);

  const digits = digitsOnly(dialNumber);
  const [lookupDigits, setLookupDigits] = useState("");
  useEffect(() => {
    if (digits.length < 6) {
      setLookupDigits("");
      return;
    }
    const timer = setTimeout(() => setLookupDigits(digits), 350);
    return () => clearTimeout(timer);
  }, [digits]);

  const localMatch = useMemo(() => {
    if (digits.length < 6) return null;
    return recents.find((r) => digitsOnly(r.number).endsWith(digits) || digits.endsWith(digitsOnly(r.number)))?.name ?? null;
  }, [digits, recents]);

  const { data: remoteMatch } = useQuery({
    queryKey: ["calls", "phone-lookup", lookupDigits],
    queryFn: async () => {
      const { data } = await axios.get<{ results?: Array<{ name?: string }> }>("/api/clients/lookup-by-phone/", {
        params: { phone: lookupDigits },
      });
      return data.results?.[0]?.name?.trim() || null;
    },
    enabled: enabled && !localMatch && lookupDigits.length >= 6,
    staleTime: 5 * 60_000,
  });

  const matchedName = digits.length >= 6 ? localMatch ?? (lookupDigits === digits ? remoteMatch ?? null : null) : null;
  return { recents, matchedName };
}
