"use client";

import type { ReactNode } from "react";
import { User } from "@/api/generated/interfaces";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TonePill } from "@/components/redesign/pill";
import type { Tone } from "@/components/redesign/tones";
import { rdButton } from "@/components/redesign/buttons";
import { initials } from "@/app/(tenant)/tickets/_components/primitives/initials";
import { cn } from "@/lib/utils";
import { Pencil, RotateCw, Trash2, UserCheck, UserX } from "lucide-react";

const ROLE_TONE: Record<string, Tone> = { admin: "danger", manager: "warning", agent: "info", viewer: "success" };
const STATUS_TONE: Record<string, Tone> = { active: "success", inactive: "danger", pending: "warning", suspended: "danger" };

// Label over value (12px uppercase muted label, 13px value).
function InfoItem({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground">{label}</span>
      <span className={cn("break-words text-[13px] font-medium text-foreground", className)}>{children}</span>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[10px] border">
      <h3 className="border-b bg-muted/35 px-4 py-2.5 text-[13px] font-semibold">{title}</h3>
      <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
  onChangeStatus: (userId: number, status: string) => void;
  onSendNewPassword: (user: User) => void;
}

export default function UserDetailsModal({
  user,
  onClose,
  onEdit,
  onDelete,
  onChangeStatus,
  onSendNewPassword,
}: UserDetailsModalProps) {
  const t = useTranslations("users");
  const locale = useLocale();
  const statusLabel = (status: string) =>
    ["active", "inactive", "pending", "suspended"].includes(status.toLowerCase())
      ? t(`ui.status.${status.toLowerCase()}`)
      : status;
  const roleLabel = (role: string) =>
    ["admin", "manager", "agent", "viewer"].includes(role.toLowerCase()) ? t(`ui.roles.${role.toLowerCase()}`) : role;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === "ka" ? "ka-GE" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const roleTone: Tone = ROLE_TONE[user.role?.toString().toLowerCase() ?? ""] ?? "neutral";
  const statusTone: Tone = !user.is_active
    ? "danger"
    : STATUS_TONE[user.status?.toString().toLowerCase() ?? ""] ?? "neutral";
  const roleText = user.role ? roleLabel(user.role.toString()) : t("ui.details.user");
  const statusText = statusLabel(user.is_active ? user.status?.toString() || "active" : "inactive");
  const name = user.full_name || `${user.first_name} ${user.last_name}`;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[700px] gap-0 overflow-y-auto p-0" data-testid="user-details">
        <DialogHeader className="flex-row items-start gap-3.5 space-y-0 border-b p-5 text-start">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary"
          >
            {initials(name) || user.email[0]?.toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 pe-6">
            <DialogTitle className="truncate text-[17px] font-semibold leading-6">{name}</DialogTitle>
            <DialogDescription className="truncate text-[13px]">{user.email}</DialogDescription>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <TonePill tone={roleTone}>{roleText}</TonePill>
              <TonePill tone={statusTone} dot>
                {statusText}
              </TonePill>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-5">
          <InfoSection title={t("ui.details.contact")}>
            <InfoItem label={t("ui.table.email")}>{user.email}</InfoItem>
            <InfoItem label={t("ui.details.phone")}>{user.phone_number || t("ui.details.notProvided")}</InfoItem>
            <InfoItem label={t("ui.details.jobTitle")}>{user.job_title || t("ui.details.notSpecified")}</InfoItem>
          </InfoSection>

          <InfoSection title={t("ui.details.account")}>
            <InfoItem label={t("role")}>{roleText}</InfoItem>
            <InfoItem label={t("ui.table.status")}>{statusText}</InfoItem>
            <InfoItem label={t("ui.details.staffMember")}>{user.is_staff ? t("ui.yes") : t("ui.no")}</InfoItem>
            <InfoItem label={t("ui.details.dateJoined")}>{formatDate(user.date_joined)}</InfoItem>
            <InfoItem label={t("ui.details.lastLogin")}>
              {user.last_login ? formatDate(user.last_login) : t("ui.details.never")}
            </InfoItem>
          </InfoSection>

          {user.permissions && (Array.isArray(user.permissions) ? user.permissions.length > 0 : true) && (
            <section className="overflow-hidden rounded-[10px] border">
              <h3 className="border-b bg-muted/35 px-4 py-2.5 text-[13px] font-semibold">{t("ui.details.permissions")}</h3>
              <div className="whitespace-pre-wrap break-words p-4 font-mono text-xs text-muted-foreground">
                {/* The API sends a list; rendered as-is the codes ran together ("create_ticketsedit_own_tickets…"). */}
                {Array.isArray(user.permissions) ? user.permissions.join("\n") : user.permissions}
              </div>
            </section>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/30 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={rdButton.primary} onClick={() => handleAction(() => onEdit(user))}>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {t("ui.table.edit")}
            </button>
            <button type="button" className={rdButton.outline} onClick={() => handleAction(() => onSendNewPassword(user))}>
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              {t("sendNewPassword")}
            </button>
            <button
              type="button"
              className={rdButton.outline}
              onClick={() => handleAction(() => onChangeStatus(user.id, user.is_active ? "inactive" : "active"))}
            >
              {user.is_active ? <UserX className="h-3.5 w-3.5" aria-hidden /> : <UserCheck className="h-3.5 w-3.5" aria-hidden />}
              {user.is_active ? t("ui.table.deactivate") : t("ui.table.activate")}
            </button>
          </div>
          <button
            type="button"
            className={cn(rdButton.outline, "border-destructive/50 text-destructive hover:bg-destructive/10")}
            onClick={() => handleAction(() => onDelete(user.id))}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t("ui.table.delete")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
