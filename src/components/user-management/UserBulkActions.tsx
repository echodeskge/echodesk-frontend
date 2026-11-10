"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useMyAccess, TENANT_ROLE_RANK, type TenantRole } from "@/hooks/useMyAccess";
import { rdButton } from "@/components/redesign/buttons";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Crown,
  Eye,
  Headset,
  KeyRound,
  Trash2,
  UserCheck,
  UserCog,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";

// One action of the bulk menu (30px row, icon + label).
function ActionItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-start text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-50",
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", danger ? "text-destructive" : "text-muted-foreground")} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Section({ title, danger, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b px-1.5 py-2 last:border-b-0">
      <h5
        className={cn(
          "px-2 pb-1 text-[11px] font-medium uppercase tracking-[.03em]",
          danger ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {title}
      </h5>
      {children}
    </div>
  );
}

interface UserBulkActionsProps {
  selectedCount: number;
  selectedUsers: number[];
  onBulkAction: (
    action: string,
    userIds: number[],
    additionalData?: any
  ) => Promise<void>;
}

export default function UserBulkActions({
  selectedCount,
  selectedUsers,
  onBulkAction,
}: UserBulkActionsProps) {
  const t = useTranslations("users");
  const [showActions, setShowActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isSuperuser, isStaff, roleRank } = useMyAccess();
  // Backend role guard: only a superuser grants admin, and non-staff callers
  // cannot hand out a role above their own.
  const canGrantRole = (role: TenantRole) =>
    isSuperuser ||
    (role !== "admin" && (isStaff || TENANT_ROLE_RANK[role] <= roleRank));

  const handleBulkAction = async (action: string, additionalData?: any) => {
    if (
      !confirm(t("ui.bulk.confirm", { count: selectedCount }))
    ) {
      return;
    }

    setIsLoading(true);
    try {
      await onBulkAction(action, selectedUsers, additionalData);
    } catch (error) {
      console.error("Bulk action failed:", error);
    } finally {
      setIsLoading(false);
      setShowActions(false);
    }
  };

  return (
    <div
      className="relative flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-primary/30 bg-primary/5 px-3.5 py-2"
      data-testid="users-bulk-actions"
    >
      <span className="text-[13px] font-medium text-primary">
        {t("ui.bulk.selected", { count: selectedCount })}
      </span>

      <button
        type="button"
        className={rdButton.primary}
        onClick={() => setShowActions(!showActions)}
        disabled={isLoading}
        aria-expanded={showActions}
      >
        {isLoading ? t("ui.bulk.processing") : t("ui.bulk.title")}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>

      {showActions && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-[10px] border bg-popover text-popover-foreground shadow-lg sm:left-auto sm:right-0 sm:w-[300px]">
          <div className="flex items-center justify-between border-b px-3.5 py-2.5">
            <h4 className="text-[13px] font-semibold">{t("ui.bulk.title")}</h4>
            <button
              type="button"
              className={rdButton.ghostIconSm}
              onClick={() => setShowActions(false)}
              aria-label={t("ui.agents.close")}
              title={t("ui.agents.close")}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <Section title={t("ui.bulk.userStatus")}>
              <ActionItem icon={UserCheck} label={t("ui.bulk.activate")} onClick={() => handleBulkAction("activate")} disabled={isLoading} />
              <ActionItem icon={UserX} label={t("ui.bulk.deactivate")} onClick={() => handleBulkAction("deactivate")} disabled={isLoading} />
            </Section>

            <Section title={t("ui.bulk.security")}>
              <ActionItem
                icon={KeyRound}
                label={t("ui.bulk.resetPasswords")}
                onClick={() => handleBulkAction("reset_password")}
                disabled={isLoading}
              />
            </Section>

            <Section title={t("ui.bulk.roleChanges")}>
              {canGrantRole("admin") && (
                <ActionItem
                  icon={Crown}
                  label={t("ui.bulk.makeRole", { role: t("ui.roles.admin") })}
                  onClick={() => handleBulkAction("change_role", { role: "admin" })}
                  disabled={isLoading}
                />
              )}
              {canGrantRole("manager") && (
                <ActionItem
                  icon={UserCog}
                  label={t("ui.bulk.makeRole", { role: t("ui.roles.manager") })}
                  onClick={() => handleBulkAction("change_role", { role: "manager" })}
                  disabled={isLoading}
                />
              )}
              {canGrantRole("agent") && (
                <ActionItem
                  icon={Headset}
                  label={t("ui.bulk.makeRole", { role: t("ui.roles.agent") })}
                  onClick={() => handleBulkAction("change_role", { role: "agent" })}
                  disabled={isLoading}
                />
              )}
              {canGrantRole("viewer") && (
                <ActionItem
                  icon={Eye}
                  label={t("ui.bulk.makeRole", { role: t("ui.roles.viewer") })}
                  onClick={() => handleBulkAction("change_role", { role: "viewer" })}
                  disabled={isLoading}
                />
              )}
            </Section>

            <Section title={t("ui.bulk.danger")} danger>
              <ActionItem icon={Trash2} label={t("ui.bulk.delete")} onClick={() => handleBulkAction("delete")} disabled={isLoading} danger />
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
