"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rdButton } from "@/components/redesign/buttons";
import { TonePill } from "@/components/redesign/pill";
import { SettingsSection, SettingsToggle } from "@/components/redesign/settings";
import { initials } from "@/app/(tenant)/tickets/_components/primitives/initials";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import axios from "@/api/axios";

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

export function UserPhoneAssignments({ sipConfigId, sipConfigName }: UserPhoneAssignmentsProps) {
  const t = useTranslations("calls");
  const tCommon = useTranslations("common");
  const [assignments, setAssignments] = useState<PhoneAssignment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PhoneAssignment | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user: "",
    extension: "",
    extension_password: "",
    phone_number: "",
    display_name: "",
    is_primary: true,
    is_active: true,
  });

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`/api/phone-assignments/?sip_configuration=${sipConfigId}`);
      setAssignments(res.data.results || res.data || []);
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all users without pagination limit
      const res = await axios.get('/api/users/?page_size=200');
      const data = res.data.results || res.data || [];
      const userList = data.map((u: any) => ({
        id: u.id,
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
        email: u.email,
      }));
      setUsers(userList);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchUsers();
  }, [sipConfigId]);

  const resetForm = () => {
    setForm({
      user: "",
      extension: "",
      extension_password: "",
      phone_number: "",
      display_name: "",
      is_primary: true,
      is_active: true,
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (assignment: PhoneAssignment) => {
    setEditing(assignment);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        user: parseInt(form.user),
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
      fetchAssignments();
    } catch (err: any) {
      console.error("Failed to save assignment:", err);
      alert(err.response?.data?.detail || t("settings.saveAssignmentFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("settings.confirmDeleteAssignment"))) return;
    try {
      await axios.delete(`/api/phone-assignments/${id}/`);
      fetchAssignments();
    } catch (err) {
      console.error("Failed to delete assignment:", err);
    }
  };

  // A password is required for a new extension only; when editing, blank
  // keeps the stored one.
  const isValid =
    form.user && form.extension && form.phone_number && (editing || form.extension_password);

  return (
    <SettingsSection
      title={t("settings.assignedUsers")}
      hint={sipConfigName}
      testId={`phone-assignments-${sipConfigId}`}
      actions={
        <button type="button" className={cn(rdButton.primarySm, "px-2.5")} onClick={openCreate} data-testid="assign-user">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("settings.assignUser")}
        </button>
      }
    >
      <p className="border-b px-4 py-2.5 text-xs leading-[17px] text-muted-foreground">{t("settings.assignedUsersDesc")}</p>
      {loading ? (
        <p className="px-4 py-3.5 text-[13px] text-muted-foreground">{t("settings.loading")}</p>
      ) : assignments.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">{t("settings.noAssignments")}</p>
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
                  {t("settings.ext")} {a.extension} &middot; {a.phone_number}
                </span>
              </span>
              <span className="ms-auto flex shrink-0 items-center gap-1">
                {a.is_primary && <TonePill tone="info">{t("settings.primary")}</TonePill>}
                {!a.is_active && <TonePill tone="neutral">{t("settings.inactive")}</TonePill>}
                <button
                  type="button"
                  className={rdButton.ghostIconSm}
                  onClick={() => openEdit(a)}
                  aria-label={t("settings.editAssignment")}
                  title={t("settings.editAssignment")}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(rdButton.ghostIconSm, "hover:bg-destructive/10 hover:text-destructive")}
                  onClick={() => handleDelete(a.id)}
                  aria-label={tCommon("delete")}
                  title={tCommon("delete")}
                  data-testid="assignment-delete"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Assign/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t("settings.editAssignment") : t("settings.assignUser")}
            </DialogTitle>
            <DialogDescription>
              {t("settings.assignUserDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[13px]">{t("settings.selectUser")}</Label>
              <Select value={form.user} onValueChange={(v) => setForm({ ...form, user: v })}>
                <SelectTrigger className="h-[34px] text-[13px]">
                  <SelectValue placeholder={t("settings.selectUserPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[13px]">{t("settings.extension")}</Label>
                <Input
                  className="h-[34px] text-[13px]"
                  value={form.extension}
                  onChange={(e) => setForm({ ...form, extension: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">{t("settings.extensionPassword")}</Label>
                <Input
                  className="h-[34px] text-[13px]"
                  type="password"
                  value={form.extension_password}
                  onChange={(e) => setForm({ ...form, extension_password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    {t("settings.passwordKeepHint")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[13px]">{t("settings.phoneNumber")}</Label>
                <Input
                  className="h-[34px] text-[13px]"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  placeholder="+995322421219"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">{t("settings.displayName")}</Label>
                <Input
                  className="h-[34px] text-[13px]"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="Sales Team"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div className="flex items-center space-x-2">
                <SettingsToggle
                  checked={form.is_primary}
                  onCheckedChange={(v) => setForm({ ...form, is_primary: v })}
                />
                <Label className="text-[13px]">{t("settings.primaryNumber")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <SettingsToggle
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label className="text-[13px]">{t("settings.activeAssignment")}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button type="button" className={rdButton.outline} onClick={() => setDialogOpen(false)}>{t("settings.cancel")}</button>
            <button type="button" className={rdButton.primary} onClick={handleSave} disabled={!isValid || saving} data-testid="assignment-submit">
              {saving ? t("settings.saving") : editing ? t("settings.update") : t("settings.assign")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
