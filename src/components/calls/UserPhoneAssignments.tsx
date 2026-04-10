"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, Edit, Phone, User } from "lucide-react";
import axios from "@/api/axios";

interface PhoneAssignment {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  sip_configuration: number;
  extension: string;
  extension_password: string;
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
      extension_password: assignment.extension_password,
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
      const payload = {
        user: parseInt(form.user),
        sip_configuration: sipConfigId,
        extension: form.extension,
        extension_password: form.extension_password,
        phone_number: form.phone_number,
        display_name: form.display_name,
        is_primary: form.is_primary,
        is_active: form.is_active,
      };

      if (editing) {
        await axios.put(`/api/phone-assignments/${editing.id}/`, payload);
      } else {
        await axios.post("/api/phone-assignments/", payload);
      }

      setDialogOpen(false);
      resetForm();
      fetchAssignments();
    } catch (err: any) {
      console.error("Failed to save assignment:", err);
      alert(err.response?.data?.detail || "Failed to save assignment");
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

  const isValid = form.user && form.extension && form.extension_password && form.phone_number;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("settings.assignedUsers")}</CardTitle>
            <CardDescription>{t("settings.assignedUsersDesc")}</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t("settings.assignUser")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("settings.loading")}</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("settings.noAssignments")}</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.user_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.ext")} {a.extension} &middot; {a.phone_number}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.is_primary && <Badge variant="default">{t("settings.primary")}</Badge>}
                  {!a.is_active && <Badge variant="secondary">{t("settings.inactive")}</Badge>}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

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
              <Label>{t("settings.selectUser")}</Label>
              <Select value={form.user} onValueChange={(v) => setForm({ ...form, user: v })}>
                <SelectTrigger>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("settings.extension")}</Label>
                <Input
                  value={form.extension}
                  onChange={(e) => setForm({ ...form, extension: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.extensionPassword")}</Label>
                <Input
                  type="password"
                  value={form.extension_password}
                  onChange={(e) => setForm({ ...form, extension_password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("settings.phoneNumber")}</Label>
                <Input
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  placeholder="+995322421219"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.displayName")}</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="Sales Team"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.is_primary}
                  onCheckedChange={(v) => setForm({ ...form, is_primary: v })}
                />
                <Label>{t("settings.primaryNumber")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>{t("settings.activeAssignment")}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("settings.cancel")}</Button>
            <Button onClick={handleSave} disabled={!isValid || saving}>
              {saving ? t("settings.saving") : editing ? t("settings.update") : t("settings.assign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
