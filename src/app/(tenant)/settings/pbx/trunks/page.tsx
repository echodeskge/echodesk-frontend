"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useTrunks,
  useCreateTrunk,
  useUpdateTrunk,
  useDeleteTrunk,
} from "@/hooks/usePbxQueries";
import { trunksRetrieve } from "@/api/generated/api";
import type { Trunk, TrunkList, TrunkRequest } from "@/api/generated/interfaces";

type TrunkFormState = {
  name: string;
  provider: string;
  sip_server: string;
  sip_port: number;
  username: string;
  password: string;
  realm: string;
  proxy: string;
  register: boolean;
  codecs: string; // comma-separated in UI
  caller_id_number: string;
  phone_numbers: string[];
  is_active: boolean;
};

const EMPTY_FORM: TrunkFormState = {
  name: "",
  provider: "",
  sip_server: "",
  sip_port: 5060,
  username: "",
  password: "",
  realm: "",
  proxy: "",
  register: true,
  codecs: "g722, alaw, ulaw",
  caller_id_number: "",
  phone_numbers: [],
  is_active: true,
};

export default function TrunksPage() {
  const t = useTranslations("pbxSettings.trunks");
  const tForm = useTranslations("pbxSettings.form");
  const tToast = useTranslations("pbxSettings.toast");

  const { data, isLoading } = useTrunks();
  const createMut = useCreateTrunk();
  const updateMut = useUpdateTrunk();
  const deleteMut = useDeleteTrunk();

  const trunks = useMemo<TrunkList[]>(() => {
    if (!data) return [];
    const d = data as { results?: TrunkList[] } | TrunkList[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [data]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Trunk | null>(null);
  const [form, setForm] = useState<TrunkFormState>(EMPTY_FORM);
  const [newPhone, setNewPhone] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TrunkList | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNewPhone("");
    setDialogOpen(true);
  };

  const openEdit = async (trunkSummary: TrunkList) => {
    setDialogOpen(true);
    try {
      const trunk = await trunksRetrieve(trunkSummary.id);
      setEditing(trunk);
      setForm({
        name: trunk.name,
        provider: trunk.provider ?? "",
        sip_server: trunk.sip_server,
        sip_port: trunk.sip_port ?? 5060,
        username: trunk.username,
        password: trunk.password,
        realm: trunk.realm ?? "",
        proxy: trunk.proxy ?? "",
        register: trunk.register ?? true,
        codecs: Array.isArray(trunk.codecs)
          ? trunk.codecs.join(", ")
          : String(trunk.codecs ?? ""),
        caller_id_number: trunk.caller_id_number ?? "",
        phone_numbers: Array.isArray(trunk.phone_numbers)
          ? (trunk.phone_numbers as string[])
          : [],
        is_active: trunk.is_active ?? true,
      });
      setNewPhone("");
    } catch {
      toast.error(tToast("error"));
      setDialogOpen(false);
    }
  };

  const addPhone = () => {
    const n = newPhone.trim();
    if (!n) return;
    if (form.phone_numbers.includes(n)) return;
    setForm((f) => ({ ...f, phone_numbers: [...f.phone_numbers, n] }));
    setNewPhone("");
  };

  const removePhone = (num: string) => {
    setForm((f) => ({ ...f, phone_numbers: f.phone_numbers.filter((x) => x !== num) }));
  };

  const buildPayload = (): TrunkRequest => ({
    name: form.name.trim(),
    provider: form.provider.trim() || undefined,
    sip_server: form.sip_server.trim(),
    sip_port: form.sip_port,
    username: form.username.trim(),
    password: form.password,
    realm: form.realm.trim() || undefined,
    proxy: form.proxy.trim() || undefined,
    register: form.register,
    codecs: form.codecs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    caller_id_number: form.caller_id_number.trim() || undefined,
    phone_numbers: form.phone_numbers,
    is_active: form.is_active,
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.sip_server.trim() || !form.username.trim()) {
      toast.error(tToast("error"));
      return;
    }
    const payload = buildPayload();
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: payload });
        toast.success(tToast("updated"));
      } else {
        await createMut.mutateAsync(payload);
        toast.success(tToast("created"));
      }
      setDialogOpen(false);
    } catch {
      toast.error(tToast("error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success(tToast("deleted"));
      setDeleteTarget(null);
    } catch {
      toast.error(tToast("error"));
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t("new")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6">…</p>
        ) : trunks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.provider")}</TableHead>
                <TableHead>{t("columns.sipServer")}</TableHead>
                <TableHead>{t("columns.phoneNumbers")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {trunks.map((trunk) => {
                const phones = Array.isArray(trunk.phone_numbers)
                  ? (trunk.phone_numbers as string[])
                  : [];
                return (
                  <TableRow key={trunk.id}>
                    <TableCell className="font-medium">{trunk.name}</TableCell>
                    <TableCell>{trunk.provider ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">—</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {phones.length ? phones.join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      {trunk.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(trunk)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(trunk)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("edit") : t("new")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="trunk-name">{t("form.name")}</Label>
              <Input
                id="trunk-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t("form.nameHelp")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trunk-provider">{t("form.provider")}</Label>
              <Input
                id="trunk-provider"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t("form.providerHelp")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trunk-caller-id">{t("form.callerIdNumber")}</Label>
              <Input
                id="trunk-caller-id"
                value={form.caller_id_number}
                onChange={(e) => setForm({ ...form, caller_id_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trunk-sip-server">{t("form.sipServer")}</Label>
              <Input
                id="trunk-sip-server"
                value={form.sip_server}
                onChange={(e) => setForm({ ...form, sip_server: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trunk-sip-port">{t("form.sipPort")}</Label>
              <Input
                id="trunk-sip-port"
                type="number"
                value={form.sip_port}
                onChange={(e) => setForm({ ...form, sip_port: Number(e.target.value) || 5060 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trunk-username">{t("form.username")}</Label>
              <Input
                id="trunk-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trunk-password">{t("form.password")}</Label>
              <Input
                id="trunk-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trunk-realm">{t("form.realm")}</Label>
              <Input
                id="trunk-realm"
                value={form.realm}
                onChange={(e) => setForm({ ...form, realm: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trunk-proxy">{t("form.proxy")}</Label>
              <Input
                id="trunk-proxy"
                value={form.proxy}
                onChange={(e) => setForm({ ...form, proxy: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="trunk-codecs">{t("form.codecs")}</Label>
              <Input
                id="trunk-codecs"
                value={form.codecs}
                onChange={(e) => setForm({ ...form, codecs: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t("form.codecsHelp")}</p>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>{t("form.phoneNumbers")}</Label>
              <div className="flex gap-2">
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPhone();
                    }
                  }}
                  placeholder="+995322421219"
                />
                <Button type="button" variant="outline" onClick={addPhone}>
                  {t("form.addPhoneNumber")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("form.phoneNumbersHelp")}</p>
              {form.phone_numbers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {form.phone_numbers.map((n) => (
                    <Badge key={n} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                      <span className="font-mono">{n}</span>
                      <button
                        type="button"
                        onClick={() => removePhone(n)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="trunk-register"
                checked={form.register}
                onCheckedChange={(v) => setForm({ ...form, register: v })}
              />
              <div>
                <Label htmlFor="trunk-register">{t("form.register")}</Label>
                <p className="text-xs text-muted-foreground">{t("form.registerHelp")}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="trunk-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="trunk-active">{t("form.isActive")}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tForm("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? tForm("saving") : editing ? tForm("update") : tForm("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tForm("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t("deleteConfirm", { name: deleteTarget.name }) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tForm("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? tForm("deleting") : tForm("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
