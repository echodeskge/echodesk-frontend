"use client";

/**
 * Assignees row (FE-12, W78, W79, E5).
 *
 * - Options: the users who can work on this board (`useTicketPickers`,
 *   every page, filtered by board access), plus anyone already assigned.
 * - Value: the users in `assignments` plus a legacy-only `assigned_to`
 *   (set on old tickets without an assignment row).
 * - Toggling sends `assigned_user_ids` (the server diffs it, E5). Removing
 *   the legacy-only chip sends `assigned_to_id: 0`, which clears it (the
 *   serializer reads `null` as "unchanged", so `null` would not fix W79);
 *   that needs `can_assign` (the server keeps `assigned_to_id` staff-only).
 * - Each pill carries its role (badge icon, title and `data-role`). The
 *   popover footer lists the assignees with a role select, which sends
 *   `assigned_user_ids` plus `assignment_roles`.
 * - Editing needs `can_assign` or `can_edit`.
 */
import { useMemo, useState, type ReactNode } from "react";
import { ClipboardCheck, Eye, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TicketAssignmentRoleEnum, UserMinimal } from "@/api/generated/interfaces";
import { PropertyPicker, type PickerOption } from "../../../_components/primitives/property-picker";
import { PropertyRow } from "../../../_components/primitives/property-row";
import { initials } from "../../../_components/primitives/initials";
import { useTicketPickers } from "../../../_hooks/use-ticket-pickers";
import type { TicketDetail, TicketDetailAssignment, ViewerPermissions } from "../../../_lib/types";
import { useEditingPresence, useRailPatch, userName } from "./rail-shared";

export const ROLES: TicketAssignmentRoleEnum[] = ["primary", "collaborator", "reviewer", "observer"];

const ROLE_ICON: Partial<Record<TicketAssignmentRoleEnum, typeof Star>> = {
  primary: Star,
  reviewer: ClipboardCheck,
  observer: Eye,
};

/** "Levan Maisuradze" → "Levan M." for the 20px pills (design B); the options keep full names. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2 || name.includes("@")) return name;
  return `${parts[0]} ${Array.from(parts[parts.length - 1])[0]}.`;
}

/** Value used by the assigned_to_id write to clear the legacy assignee. */
export const CLEAR_ASSIGNED_TO = 0;

interface AssigneeState {
  /** Users with an assignment row, in assignment order. */
  assigned: { user: UserMinimal; role: TicketAssignmentRoleEnum }[];
  /** `assigned_to` without an assignment row (old tickets), if any. */
  legacy: UserMinimal | null;
}

export function assigneeState(ticket: Pick<TicketDetail, "assignments" | "assigned_users" | "assigned_to">): AssigneeState {
  const rows = ticket.assignments ?? [];
  const assigned: AssigneeState["assigned"] = rows.map((a) => ({ user: a.user, role: a.role ?? "collaborator" }));
  // Older payloads may carry assigned_users without assignment rows.
  for (const u of ticket.assigned_users ?? []) {
    if (!assigned.some((a) => a.user.id === u.id)) assigned.push({ user: u, role: "collaborator" });
  }
  const legacy =
    ticket.assigned_to && !assigned.some((a) => a.user.id === ticket.assigned_to!.id) ? ticket.assigned_to : null;
  return { assigned, legacy };
}

function withAssignments(prev: TicketDetail, assigned: AssigneeState["assigned"]): TicketDetail {
  const now = new Date().toISOString();
  const byUser = new Map(prev.assignments.map((a) => [a.user.id, a]));
  const assignments: TicketDetailAssignment[] = assigned.map(({ user, role }) => {
    const old = byUser.get(user.id);
    return old ? { ...old, role } : { id: -user.id, user, role, assigned_at: now, assigned_by: null };
  });
  return { ...prev, assignments, assigned_users: assigned.map((a) => a.user) };
}

export function AssigneesRow({ ticket, perms }: { ticket: TicketDetail; perms: ViewerPermissions }) {
  const t = useTranslations("ticketsScreen.rail");
  const canEdit = perms.can_assign || perms.can_edit;
  const { patch } = useRailPatch(ticket.id);
  const presence = useEditingPresence(ticket.id, "assignees");
  const [open, setOpen] = useState(false);
  const { users } = useTicketPickers(ticket.board?.id ?? null, { enabled: canEdit && open });
  const state = useMemo(() => assigneeState(ticket), [ticket]);
  const roleOf = useMemo(() => new Map(state.assigned.map((a) => [a.user.id, a.role])), [state]);

  const options: PickerOption<number>[] = useMemo(() => {
    const seen = new Set<number>();
    const out: PickerOption<number>[] = [];
    const push = (u: { id: number; email?: string | null; first_name?: string | null; last_name?: string | null; full_name?: string | null }, disabled = false) => {
      if (seen.has(u.id)) return;
      seen.add(u.id);
      const name = (u.full_name && u.full_name.trim()) || userName(u);
      out.push({ value: u.id, label: name, avatarName: name, keywords: u.email ? [u.email] : [], disabled });
    };
    for (const a of state.assigned) push(a.user);
    if (state.legacy) push(state.legacy, !perms.can_assign);
    for (const u of users) push(u);
    return out;
  }, [state, users, perms.can_assign]);

  const value = useMemo(
    () => [...state.assigned.map((a) => a.user.id), ...(state.legacy ? [state.legacy.id] : [])],
    [state],
  );

  const userById = (id: number): UserMinimal | null => {
    const fromState = state.assigned.find((a) => a.user.id === id)?.user ?? (state.legacy?.id === id ? state.legacy : null);
    if (fromState) return fromState;
    const u = users.find((x) => x.id === id);
    return u ? { id: u.id, email: u.email, first_name: u.first_name ?? "", last_name: u.last_name ?? "" } : null;
  };

  const onChange = (next: number[]) => {
    const legacyId = state.legacy?.id ?? null;
    if (legacyId !== null && !next.includes(legacyId)) {
      if (!perms.can_assign) return;
      patch({ assigned_to_id: CLEAR_ASSIGNED_TO }, (prev) => ({ ...prev, assigned_to: null }));
      return;
    }
    const ids = next.filter((id) => id !== legacyId);
    const assigned = ids
      .map((id) => {
        const user = userById(id);
        return user ? { user, role: roleOf.get(id) ?? ("collaborator" as TicketAssignmentRoleEnum) } : null;
      })
      .filter((x): x is AssigneeState["assigned"][number] => x !== null);
    const body: Parameters<typeof patch>[0] = { assigned_user_ids: ids };
    // Removing the user who is also `assigned_to` clears it too, or the chip
    // would come back as a legacy assignee (staff-only on the server).
    const owner = ticket.assigned_to?.id;
    const clearsOwner = perms.can_assign && owner != null && owner !== legacyId && !ids.includes(owner);
    if (clearsOwner) body.assigned_to_id = CLEAR_ASSIGNED_TO;
    patch(body, (prev) => ({ ...withAssignments(prev, assigned), ...(clearsOwner ? { assigned_to: null } : {}) }));
  };

  const setRole = (userId: number, role: TicketAssignmentRoleEnum) => {
    const assigned = state.assigned.map((a) => (a.user.id === userId ? { ...a, role } : a));
    patch(
      { assigned_user_ids: state.assigned.map((a) => a.user.id), assignment_roles: { [String(userId)]: role } },
      (prev) => withAssignments(prev, assigned),
    );
  };

  const renderPill = (o: PickerOption<number>): ReactNode => {
    const role = roleOf.get(o.value);
    const Icon = role ? ROLE_ICON[role] : undefined;
    const roleLabel = role ? t(`role.${role}`) : null;
    return (
      <span
        data-slot="property-pill"
        data-user-id={o.value}
        data-role={role ?? "legacy"}
        title={roleLabel ? t("roleOf", { name: o.label, role: roleLabel }) : o.label}
        className="inline-flex h-5 max-w-full items-center gap-[5px] rounded-full bg-muted px-1.5 text-xs font-medium"
      >
        <span
          aria-hidden="true"
          data-slot="property-pill-avatar"
          className="-ml-[3px] flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[6px] font-bold leading-none text-primary"
        >
          {initials(o.avatarName ?? o.label)}
        </span>
        <span className="truncate">{shortName(o.label)}</span>
        {Icon && (
          <span role="img" aria-label={roleLabel ?? undefined} data-slot="assignee-role-badge" className="inline-flex shrink-0 text-muted-foreground">
            <Icon aria-hidden="true" size={10} />
          </span>
        )}
      </span>
    );
  };

  const footer =
    state.assigned.length > 0 ? (
      <div
        className="flex flex-col gap-0.5 px-1 pb-1"
        data-testid="assignee-roles"
        // cmdk handles arrow keys on the Command root; keep them in the selects.
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span className="px-1 pt-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
          {t("roles")}
        </span>
        {state.assigned.map(({ user, role }) => {
          const name = userName(user);
          return (
            <label key={user.id} className="flex h-[30px] items-center gap-2 rounded-md px-1 text-[13px]">
              <span
                aria-hidden="true"
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[7px] font-semibold leading-none text-primary"
              >
                {initials(name)}
              </span>
              <span className="min-w-0 flex-1 truncate">{name}</span>
              <span className="sr-only">{t("role.label")}</span>
              <select
                data-testid={`assignee-role-${user.id}`}
                value={role}
                disabled={!canEdit}
                onChange={(e) => setRole(user.id, e.target.value as TicketAssignmentRoleEnum)}
                className="h-6 max-w-[110px] shrink-0 rounded-md border bg-background px-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`)}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    ) : undefined;

  return (
    <PropertyRow label={t("assignees")}>
      <PropertyPicker<number>
        multi
        options={options}
        value={value}
        onChange={onChange}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          presence(o);
        }}
        placeholder={t("unassigned")}
        disabled={!canEdit}
        searchable
        searchPlaceholder={t("search")}
        emptyText={t("noResults")}
        selectedLabel={t("selected")}
        renderPill={renderPill}
        footer={footer}
      />
    </PropertyRow>
  );
}
