"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Pencil } from "lucide-react";
import axios from "@/api/axios";
import { rdButton } from "@/components/redesign/buttons";
import { TonePill } from "@/components/redesign/pill";
import {
  FieldRow,
  ListActionButton,
  SecretInput,
  SettingsNote,
  SettingsSection,
  SettingsToggle,
  settingsFieldWidth,
  settingsInputClass,
} from "@/components/redesign/settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initials } from "@/app/(tenant)/tickets/_components/primitives/initials";
import { cn } from "@/lib/utils";

interface PhoneAssignment {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  sip_configuration: number;
  extension: string;
  // Always "" from the API (write-only secret); see has_extension_password.
  extension_password: string;
  has_extension_password?: boolean;
  phone_number: string;
  display_name: string;
  is_primary: boolean;
  is_active: boolean;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

interface UserPhoneAssignmentsProps {
  sipConfigId: number;
  sipConfigName: string;
}

interface AssignmentForm {
  user: string;
  extension: string;
  extension_password: string;
  phone_number: string;
  display_name: string;
  is_primary: boolean;
  is_active: boolean;
}

const EMPTY_FORM: AssignmentForm = {
  user: "",
  extension: "",
  extension_password: "",
  phone_number: "",
  display_name: "",
  is_primary: true,
  is_active: true,
};

const inputClass = cn(settingsInputClass, settingsFieldWidth);

function apiErrorDetail(err: unknown): string | null {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" ? detail : null;
}

/** Extensions of one SIP configuration: list + assign / edit dialog on the settings kit. */
export function UserPhoneAssignments({ sipConfigId, sipConfigName }: UserPhoneAssignmentsProps) {
  const t = useTranslations("calls.settings");
  const tCommon = useTranslations("common");
  const tSecret = useTranslations("pbxSettings.secret");
  const [assignments, setAssignments] = useState<PhoneAssignment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PhoneAssignment | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentForm>(EMPTY_FORM);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await axios.get(`/api/phone-assignments/?sip_configuration=${sipConfigId}`);
      setAssignments(res.data.results || res.data || []);
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
    } finally {
      setLoading(false);
    }
  }, [sipConfigId]);

  const fetchUsers = useCallback(async () => {
    try {
      // Every user in one page: the picker needs them all.
      const res = await axios.get("/api/users/?page_size=200");
      const data = res.data.results || res.data || [];
      setUsers(
        (data as Array<{ id: number; first_name?: string; last_name?: string; email: string }>).map((u) => ({
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
          email: u.email,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  useEffect(() => {
    void fetchAssignments();
    void fetchUsers();
  }, [fetchAssignments, fetchUsers]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setSaveError(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (assignment: PhoneAssignment) => {
    setEditing(assignment);
    setSaveError(null);
    setForm({
      user: String(assignment.user),
      extension: assignment.extension,
      // The API never returns the password. Blank on save keeps the
      // stored one; typing a new one replaces it.
      extension_password: "",
      phone_number: assignment.phone_number,
      display_name: assignment.display_name,
      is_primary: assignment.is_primary,
      is_active: assignment.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload: Record<string, unknown> = {
        user: parseInt(form.user, 10),
        sip_configuration: sipConfigId,
        extension: form.extension,
        phone_number: form.phone_number,
        display_name: form.display_name,
        is_primary: form.is_primary,
        is_active: form.is_active,
      };
      if (form.extension_password) {
        payload.extension_password = form.extension_password;
      }

      if (editing) {
        await axios.patch(`/api/phone-assignments/${editing.id}/`, payload);
      } else {
        await axios.post("/api/phone-assignments/", payload);
      }

      setDialogOpen(false);
      resetForm();
      void fetchAssignments();
    } catch (err) {
      console.error("Failed to save assignment:", err);
      setSaveError(apiErrorDetail(err) || t("saveAssignmentFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDeleteAssignment"))) return;
    setListError(null);
    try {
      await axios.delete(`/api/phone-assignments/${id}/`);
      void fetchAssignments();
    } catch (err) {
      console.error("Failed to delete assignment:", err);
      setListError(apiErrorDetail(err) || tCommon("somethingWentWrong"));
    }
  };

  // A password is required for a new extension only; when editing, blank
  // keeps the stored one.
  const isValid = Boolean(form.user && form.extension && form.phone_number && (editing || form.extension_password));

  const passwordHint = editing
    ? editing.has_extension_password
      ? t("secretSetHint")
      : t("secretUnsetHint")
    : t("extensionPasswordHint");

  return (
    <SettingsSection
      title={t("assignedUsers")}
      hint={sipConfigName}
      testId={`phone-assignments-${sipConfigId}`}
      actions={<ListActionButton action={{ label: t("assignUser"), icon: Plus, onClick: openCreate, testId: "assign-user" }} />}
    >
      <p className="border-b px-4 py-2.5 text-xs leading-[17px] text-muted-foreground">{t("assignedUsersDesc")}</p>
      {listError && (
        <div className="border-b px-4 py-3">
          <SettingsNote tone="danger" testId="phone-assignments-error">
            {listError}
          </SettingsNote>
        </div>
      )}
      {loading ? (
        <p className="px-4 py-3.5 text-[13px] text-muted-foreground">{t("loading")}</p>
      ) : assignments.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">{t("noAssignments")}</p>
      ) : (
        <ul className="divide-y" data-testid="phone-assignment-list">
          {assignments.map((a) => (
            <li key={a.id} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2" data-testid="phone-assignment-row">
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
              >
                {initials(a.user_name || a.user_email || "?")}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium">{a.user_name}</span>
                <span className="truncate text-[11px] text-muted-foreground tabular-nums">
                  {t("ext")} {a.extension} &middot; {a.phone_number}
                </span>
              </span>
              <span className="ms-auto flex shrink-0 items-center gap-1">
                {a.is_primary && <TonePill tone="info">{t("primary")}</TonePill>}
                {!a.is_active && <TonePill tone="neutral">{t("inactive")}</TonePill>}
                <button
                  type="button"
                  className={rdButton.ghostIconSm}
                  onClick={() => openEdit(a)}
                  aria-label={t("editAssignment")}
                  title={t("editAssignment")}
                  data-testid="assignment-edit"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(rdButton.ghostIconSm, "hover:bg-destructive/10 hover:text-destructive")}
                  onClick={() => void handleDelete(a.id)}
                  aria-label={t("removeAssignment")}
                  title={t("removeAssignment")}
                  data-testid="assignment-delete"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Assign / edit dialog: FORM page rows inside the dialog shell. */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto" data-testid="assignment-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? t("editAssignment") : t("assignUser")}</DialogTitle>
            <DialogDescription>{t("assignUserDesc")}</DialogDescription>
          </DialogHeader>

          {saveError && (
            <SettingsNote tone="danger" testId="assignment-error">
              {saveError}
            </SettingsNote>
          )}

          <div className="rounded-[10px] border bg-card">
            <FieldRow label={t("selectUser")} help={t("userHint")} htmlFor="assignment-user">
              <select
                id="assignment-user"
                value={form.user}
                onChange={(e) => setForm({ ...form, user: e.target.value })}
                className={inputClass}
                disabled={users.length === 0}
                data-testid="assignment-user"
              >
                <option value="">{users.length === 0 ? t("noUsers") : t("selectUserPlaceholder")}</option>
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow label={t("extension")} help={t("extensionHint")} htmlFor="assignment-extension">
              <input
                id="assignment-extension"
                value={form.extension}
                onChange={(e) => setForm({ ...form, extension: e.target.value })}
                placeholder="100"
                inputMode="numeric"
                className={cn(inputClass, "font-mono")}
                data-testid="assignment-extension"
              />
            </FieldRow>

            <FieldRow label={t("extensionPassword")} help={passwordHint} htmlFor="assignment-password">
              {/* Never prefilled: the API only says whether one is stored. */}
              <SecretInput
                id="assignment-password"
                value={form.extension_password}
                onChange={(v) => setForm({ ...form, extension_password: v })}
                placeholder={editing?.has_extension_password ? "••••••••" : undefined}
                showLabel={tSecret("show")}
                hideLabel={tSecret("hide")}
                autoComplete="new-password"
                className={settingsFieldWidth}
                testId="assignment-password"
              />
            </FieldRow>

            <FieldRow label={t("phoneNumber")} help={t("phoneNumberHint")} htmlFor="assignment-phone">
              <input
                id="assignment-phone"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+995322421219"
                inputMode="tel"
                className={cn(inputClass, "font-mono")}
                data-testid="assignment-phone"
              />
            </FieldRow>

            <FieldRow label={t("displayName")} help={t("displayNameHint")} htmlFor="assignment-display-name">
              <input
                id="assignment-display-name"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder={t("displayNamePlaceholder")}
                className={inputClass}
                data-testid="assignment-display-name"
              />
            </FieldRow>

            <FieldRow label={t("primaryNumber")} help={t("primaryHint")} htmlFor="assignment-primary" align="center">
              <SettingsToggle
                id="assignment-primary"
                checked={form.is_primary}
                onCheckedChange={(v) => setForm({ ...form, is_primary: v })}
                data-testid="assignment-primary"
              />
            </FieldRow>

            <FieldRow label={t("activeAssignment")} help={t("activeAssignmentHint")} htmlFor="assignment-active" align="center">
              <SettingsToggle
                id="assignment-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                data-testid="assignment-active"
              />
            </FieldRow>
          </div>

          <DialogFooter>
            <button type="button" className={rdButton.outline} onClick={closeDialog} disabled={saving} data-testid="assignment-cancel">
              {t("cancel")}
            </button>
            <button
              type="button"
              className={rdButton.primary}
              onClick={() => void handleSave()}
              disabled={!isValid || saving}
              data-testid="assignment-submit"
            >
              {saving ? t("saving") : editing ? t("update") : t("assign")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
