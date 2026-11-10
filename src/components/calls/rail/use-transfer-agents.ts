"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { extensionsStatusRetrieve, phoneAssignmentsList } from "@/api/generated/api";
import type { ExtensionStatusResponse, PaginatedUserPhoneAssignmentList, UserPhoneAssignment } from "@/api/generated/interfaces";
import { useAuth } from "@/contexts/AuthContext";

export interface TransferAgent {
  id: number;
  userId: number;
  name: string;
  extension: string;
  phone: string;
  online: boolean;
}

export const TRANSFER_AGENTS_REFRESH_MS = 15_000;

interface RawAgents {
  assignments: UserPhoneAssignment[];
  onlineExtensions: string[];
}

/** Agents with an active phone assignment plus their live online state. */
export function buildTransferAgents(raw: RawAgents, ownUserId: number | undefined, extLabel: (ext: string) => string): TransferAgent[] {
  const online = new Set(raw.onlineExtensions);
  return raw.assignments
    .filter((a) => a.user !== ownUserId)
    .map((a) => ({
      id: a.id,
      userId: a.user,
      name: a.user_name || extLabel(a.extension),
      extension: a.extension,
      phone: a.phone_number,
      online: online.has(a.extension),
    }));
}

/**
 * `GET /api/phone-assignments/?is_active=true` + `GET /api/extensions/status/`
 * (the status call is optional: a failure just marks everyone offline).
 * Fresh for 15 s and refetched every 15 s while the transfer panel is open,
 * so the online dots can't go stale (U6).
 */
export function useTransferAgents(open: boolean) {
  const t = useTranslations("calls.rail");
  const { user } = useAuth();
  const ownUserId = user?.id;

  const select = useCallback(
    (raw: RawAgents) => buildTransferAgents(raw, ownUserId, (ext) => t("ext", { ext })),
    [ownUserId, t]
  );

  return useQuery({
    queryKey: ["calls", "transfer-agents"],
    queryFn: async (): Promise<RawAgents> => {
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
    },
    select,
    enabled: open,
    staleTime: TRANSFER_AGENTS_REFRESH_MS,
    refetchInterval: open ? TRANSFER_AGENTS_REFRESH_MS : false,
  });
}
