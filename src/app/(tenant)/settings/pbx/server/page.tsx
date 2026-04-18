"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Pencil, RotateCw, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  usePbxServers,
  useCreatePbxServer,
  useUpdatePbxServer,
  useDeletePbxServer,
  useRegeneratePbxServerToken,
} from "@/hooks/usePbxQueries";
import type { PbxServer, PbxServerRequest } from "@/api/generated/interfaces";

type FormState = {
  name: string;
  fqdn: string;
  public_ip: string;
  ami_port: number;
  use_tenant_prefix: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  fqdn: "",
  public_ip: "",
  ami_port: 5038,
  use_tenant_prefix: false,
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "provisioning":
    case "pending":
      return "secondary";
    case "error":
    case "revoked":
      return "destructive";
    default:
      return "outline";
  }
}

export default function PbxServerPage() {
  const t = useTranslations("pbxSettings.server");
  const tForm = useTranslations("pbxSettings.form");
  const tToast = useTranslations("pbxSettings.toast");

  const { data, isLoading } = usePbxServers();
  const createMut = useCreatePbxServer();
  const updateMut = useUpdatePbxServer();
  const deleteMut = useDeletePbxServer();
  const regenMut = useRegeneratePbxServerToken();

  const servers = useMemo<PbxServer[]>(() => {
    if (!data) return [];
    const d = data as { results?: PbxServer[] } | PbxServer[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [data]);
  const pbx = servers[0] ?? null;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (server: PbxServer) => {
    setForm({
      name: server.name,
      fqdn: server.fqdn,
      public_ip: server.public_ip ?? "",
      ami_port: server.ami_port ?? 5038,
      use_tenant_prefix: server.use_tenant_prefix ?? false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.fqdn.trim()) {
      toast.error(tToast("error"));
      return;
    }
    const payload: PbxServerRequest = {
      name: form.name.trim(),
      fqdn: form.fqdn.trim(),
      public_ip: form.public_ip.trim() || undefined,
      realtime_db_host: "",
      realtime_db_name: "",
      realtime_db_user: "",
      ami_port: form.ami_port,
      use_tenant_prefix: form.use_tenant_prefix,
    };
    try {
      if (pbx) {
        await updateMut.mutateAsync({ id: pbx.id, data: payload });
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

  const handleRegenerate = async () => {
    if (!pbx) return;
    try {
      await regenMut.mutateAsync({
        id: pbx.id,
        data: {
          name: pbx.name,
          fqdn: pbx.fqdn,
          realtime_db_host: pbx.realtime_db_host,
          realtime_db_name: pbx.realtime_db_name,
          realtime_db_user: pbx.realtime_db_user,
        } as PbxServerRequest,
      });
      toast.success(tToast("updated"));
    } catch {
      toast.error(tToast("error"));
    }
  };

  const handleDelete = async () => {
    if (!pbx) return;
    try {
      await deleteMut.mutateAsync(pbx.id);
      toast.success(tToast("deleted"));
      setDeleteOpen(false);
    } catch {
      toast.error(tToast("error"));
    }
  };

  const copyInstall = async (cmd: string) => {
    await navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const statusLabel = (status: string): string => {
    switch (status) {
      case "active":
        return t("activeStatus");
      case "pending":
        return t("pendingStatus");
      case "provisioning":
        return t("provisioningStatus");
      case "error":
        return t("errorStatus");
      case "revoked":
        return t("revokedStatus");
      default:
        return status;
    }
  };

  const installCommand =
    (pbx as unknown as { install_command?: string } | null)?.install_command ?? "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {pbx ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(pbx)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t("edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={openCreate}>
              {t("register")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6">…</p>
          ) : !pbx ? (
            <p className="text-sm text-muted-foreground py-6">{t("notRegistered")}</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t("statusLabel")}>
                  <Badge variant={statusVariant(String(pbx.status))}>
                    {statusLabel(String(pbx.status))}
                  </Badge>
                </Field>
                <Field label="FQDN">
                  <span className="font-mono text-sm">{pbx.fqdn}</span>
                </Field>
                <Field label={t("lastSeen")}>
                  <span className="text-sm">
                    {pbx.last_seen_at
                      ? new Date(pbx.last_seen_at).toLocaleString()
                      : t("lastSeenNever")}
                  </span>
                </Field>
                <Field label={t("asteriskVersion")}>
                  <span className="font-mono text-sm">{pbx.asterisk_version || "—"}</span>
                </Field>
              </div>

              {installCommand && String(pbx.status) !== "active" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">{t("installCommand")}</Label>
                  <div className="flex items-stretch gap-2">
                    <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono overflow-x-auto whitespace-pre">
                      {installCommand}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInstall(installCommand)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copied ? t("copied") : t("copy")}
                    </Button>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={regenMut.isPending}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      {t("regenerateToken")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{pbx ? t("edit") : t("register")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pbx-name">{t("form.name")}</Label>
              <Input
                id="pbx-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t("form.nameHelp")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pbx-fqdn">{t("form.fqdn")}</Label>
              <Input
                id="pbx-fqdn"
                value={form.fqdn}
                onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
                placeholder="pbx.example.com"
              />
              <p className="text-xs text-muted-foreground">{t("form.fqdnHelp")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pbx-ip">{t("form.publicIp")}</Label>
                <Input
                  id="pbx-ip"
                  value={form.public_ip}
                  onChange={(e) => setForm({ ...form, public_ip: e.target.value })}
                  placeholder="1.2.3.4"
                />
                <p className="text-xs text-muted-foreground">{t("form.publicIpHelp")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pbx-ami-port">{t("form.amiPort")}</Label>
                <Input
                  id="pbx-ami-port"
                  type="number"
                  value={form.ami_port}
                  onChange={(e) =>
                    setForm({ ...form, ami_port: Number(e.target.value) || 5038 })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="pbx-prefix"
                checked={form.use_tenant_prefix}
                onCheckedChange={(v) => setForm({ ...form, use_tenant_prefix: v })}
              />
              <div>
                <Label htmlFor="pbx-prefix">{t("form.usePrefix")}</Label>
                <p className="text-xs text-muted-foreground">{t("form.usePrefixHelp")}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tForm("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending
                ? tForm("saving")
                : pbx
                ? tForm("update")
                : tForm("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tForm("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pbx ? `${pbx.name} (${pbx.fqdn})` : null}
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
