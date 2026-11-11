"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { extensionsStatusRetrieve, phoneAssignmentsList } from "@/api/generated/api";
import type { ExtensionStatusResponse, PaginatedUserPhoneAssignmentList, UserPhoneAssignment } from "@/api/generated/interfaces";
import { useAuth } from "@/contexts/AuthContext";
import { useCallState } from "@/contexts/CallContext";

export interface TransferAgent {
  id: number;
  userId: number;
  name: string;
  extension: string;
  phone: string;
  online: boolean;
}

/**
 * Poll period for the online dots while the transfer panel is mounted. The
 * status call is an AMI `PJSIPShowContacts` per poll on a PbxServer tenant,
 * so keep it modest; the panel unmounts when closed, which stops it.
 */
export const TRANSFER_AGENTS_REFRESH_MS = 30_000;
export const TRANSFER_AGENTS_QUERY_KEY = ["calls", "transfer-agents"] as const;

interface RawAgents {
  assignments: UserPhoneAssignment[];
  onlineExtensions: string[];
}

/**
 * `GET /api/phone-assignments/?is_active=true` + `GET /api/extensions/status/`
 * (the status call is optional: a failure just marks everyone offline).
 */
async function fetchTransferAgents(): Promise<RawAgents> {
  const [assignments, status] = await Promise.all([
    phoneAssignmentsList(true),
    extensionsStatusRetrieve().catch((): ExtensionStatusResponse => ({ extensions: [] })),
  ]);
  // Older backends answered with a bare array instead of a page.
  const list = Array.isArray(assignments)
    ? (assignments as UserPhoneAssignment[])
    : ((assignments as PaginatedUserPhoneAssignmentList).results ?? []);
  return {
    assignments: list,
    onlineExtensions: (status.extensions ?? []).filter((e) => e.status === "online").map((e) => e.extension),
  };
}

/**
 * Agents with an active phone assignment plus their live online state.
 *
 * Only assignments of the softphone's own SIP configuration are offered
 * (`sipConfigurationId`; every configuration when unknown): a tenant can keep
 * a legacy configuration next to its PbxServer one, and an extension on
 * another PBX cannot be reached by a transfer. One row per extension, the
 * first assignment wins, so a duplicated extension never shows twice.
 */
export function buildTransferAgents(
  raw: RawAgents,
  ownUserId: number | undefined,
  extLabel: (ext: string) => string,
  sipConfigurationId?: number | null
): TransferAgent[] {
  const online = new Set(raw.onlineExtensions);
  const seen = new Set<string>();
  const agents: TransferAgent[] = [];
  for (const a of raw.assignments) {
    if (a.user === ownUserId) continue;
    if (sipConfigurationId != null && a.sip_configuration != null && a.sip_configuration !== sipConfigurationId) continue;
    if (seen.has(a.extension)) continue;
    seen.add(a.extension);
    agents.push({
      id: a.id,
      userId: a.user,
      name: a.user_name || extLabel(a.extension),
      extension: a.extension,
      phone: a.phone_number,
      online: online.has(a.extension),
    });
  }
  return agents;
}

/**
 * The agents of the transfer panel. Fresh for 30 s and refetched every 30 s
 * only while the panel is open (the observer goes away with the panel, so
 * nothing polls once it is closed); `staleTime` matches the interval, so a
 * reopen within 30 s shows the cache and the poll refreshes it (U6).
 */
export function useTransferAgents(open: boolean) {
  const t = useTranslations("calls.rail");
  const { user } = useAuth();
  const { activeSipConfig } = useCallState();
  const ownUserId = user?.id;
  const sipConfigurationId = activeSipConfig?.id ?? null;

  const select = useCallback(
    (raw: RawAgents) => buildTransferAgents(raw, ownUserId, (ext) => t("ext", { ext }), sipConfigurationId),
    [ownUserId, sipConfigurationId, t]
  );

  return useQuery({
    queryKey: TRANSFER_AGENTS_QUERY_KEY,
    queryFn: fetchTransferAgents,
    select,
    enabled: open,
    staleTime: TRANSFER_AGENTS_REFRESH_MS,
    refetchInterval: open ? TRANSFER_AGENTS_REFRESH_MS : false,
  });
}

/**
 * Display name of the agent whose phone assignment belongs to `userId`
 * ("Answered by {agent}"), read from the same cache the transfer panel
 * fills; fetched once when the cache is cold. `undefined` when unknown.
 */
export function useAgentName(userId: number | null | undefined): string | undefined {
  const select = useCallback(
    (raw: RawAgents) => raw.assignments.find((a) => a.user === userId)?.user_name || undefined,
    [userId]
  );
  const { data } = useQuery({
    queryKey: TRANSFER_AGENTS_QUERY_KEY,
    queryFn: fetchTransferAgents,
    select,
    enabled: userId !== null && userId !== undefined,
    staleTime: TRANSFER_AGENTS_REFRESH_MS,
  });
  return data;
}
