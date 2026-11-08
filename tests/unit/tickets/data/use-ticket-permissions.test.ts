import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const profileState = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ data: profileState.data }),
}));

import {
  NO_TICKET_PERMISSIONS,
  computeTicketPermissions,
  useTicketPermissions,
} from "@/app/(tenant)/tickets/_hooks/use-ticket-permissions";

const ALL_TRUE = {
  canCreateTicket: true,
  canDeleteTickets: true,
  canCreateBoard: true,
  canEditBoard: true,
  canDeleteBoard: true,
  canSetDefaultBoard: true,
  canManageColumns: true,
  canManageTags: true,
};

describe("computeTicketPermissions", () => {
  it("staff pass every gate", () => {
    const p = computeTicketPermissions({ is_staff: true, permissions_list: [], feature_keys: [] });
    expect(p).toMatchObject({ ...ALL_TRUE, isStaff: true, hasSocialFeature: false });
  });

  it("superusers pass every gate", () => {
    const p = computeTicketPermissions({ is_superuser: true, feature_keys: ["social_integrations"] });
    expect(p).toMatchObject({ ...ALL_TRUE, isStaff: true, hasSocialFeature: true });
  });

  it("agent with create_boards can create boards but not set the default", () => {
    const p = computeTicketPermissions({
      is_staff: false,
      permissions_list: ["create_boards", "create_tickets"],
      feature_keys: ["ticket_management"],
    });
    expect(p).toEqual({
      ...NO_TICKET_PERMISSIONS,
      canCreateBoard: true,
      canCreateTicket: true,
    });
  });

  it("accepts legacy can_* names", () => {
    const p = computeTicketPermissions({ permissions_list: ["can_manage_columns", "can_delete_tickets"] });
    expect(p.canManageColumns).toBe(true);
    expect(p.canDeleteTickets).toBe(true);
    expect(p.canEditBoard).toBe(false);
  });

  it("plain agent gets nothing but tags", () => {
    expect(computeTicketPermissions({ permissions_list: [], feature_keys: ["ticket_management"] })).toEqual(
      NO_TICKET_PERMISSIONS,
    );
    expect(NO_TICKET_PERMISSIONS.canManageTags).toBe(true);
  });

  it("hasSocialFeature follows feature_keys (array or JSON string), never staff", () => {
    expect(computeTicketPermissions({ feature_keys: ["social_integrations"] }).hasSocialFeature).toBe(true);
    expect(computeTicketPermissions({ feature_keys: '["social_integrations"]' }).hasSocialFeature).toBe(true);
    expect(computeTicketPermissions({ feature_keys: "not json" }).hasSocialFeature).toBe(false);
    expect(computeTicketPermissions({ is_staff: true }).hasSocialFeature).toBe(false);
  });

  it("no profile means no permissions", () => {
    expect(computeTicketPermissions(null)).toEqual(NO_TICKET_PERMISSIONS);
  });
});

describe("useTicketPermissions", () => {
  it("reads the cached profile", () => {
    profileState.data = { is_staff: false, permissions_list: ["edit_boards"], feature_keys: [] };
    const { result } = renderHook(() => useTicketPermissions());
    expect(result.current.canEditBoard).toBe(true);
    expect(result.current.canDeleteBoard).toBe(false);
  });

  it("is all-false (except tags) while the profile loads", () => {
    profileState.data = undefined;
    const { result } = renderHook(() => useTicketPermissions());
    expect(result.current).toEqual(NO_TICKET_PERMISSIONS);
  });
});
