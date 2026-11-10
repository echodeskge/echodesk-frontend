"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Pencil, Plus, RotateCw, Server } from "lucide-react";
import { Input } from "@/components/ui/input";
import { rdButton } from "@/components/redesign/buttons";
import { TonePill } from "@/components/redesign/pill";
import type { Tone } from "@/components/redesign/tones";
import { EmptyState } from "@/app/(tenant)/tickets/_components/primitives/empty-state";
import {
  ActionButton,
  DangerZone,
  FieldRow,
  SettingsSection,
  SettingsToggle,
} from "@/components/redesign/settings";
import { cn } from "@/lib/utils";
import {
  DialogField,
  DialogSwitchRow,
  dialogInputClass,
  usePbxStates,
} from "../_components/pbx-ui";
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

function statusTone(status: string): Tone {
  switch (status) {
    case "active":
      return "success";
    case "provisioning":
      return "info";
    case "pending":
      return "warning";
    case "error":
    case "revoked":
      return "danger";
    default:
      return "neutral";
  }
}

export default function PbxServerPage() {
  const t = useTranslations("pbxSettings.server");
  const tForm = useTranslations("pbxSettings.form");
  const tToast = useTranslations("pbxSettings.toast");
  const { loading: loadingBlock } = usePbxStates();

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
    <div className="flex min-w-0 flex-col gap-5" data-testid="pbx-server">
      <SettingsSection
        title={t("title")}
        hint={t("description")}
        actions={
          pbx ? (
            <ActionButton icon={Pencil} onClick={() => openEdit(pbx)} testId="pbx-server-edit">
              {t("edit")}
            </ActionButton>
          ) : undefined
        }
      >
        {isLoading ? (
          loadingBlock
        ) : !pbx ? (
          <EmptyState
            icon={Server}
            title={t("notRegistered")}
            action={
              <button type="button" className={rdButton.primary} onClick={openCreate} data-testid="pbx-server-register">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t("register")}
              </button>
            }
          />
        ) : (
          <>
            <FieldRow label={t("statusLabel")} align="center">
              <TonePill tone={statusTone(String(pbx.status))} dot>
                {statusLabel(String(pbx.status))}
              </TonePill>
            </FieldRow>
            <FieldRow label={t("form.fqdn")} align="center">
              <span className="break-all font-mono text-[13px]">{pbx.fqdn}</span>
            </FieldRow>
            <FieldRow label={t("lastSeen")} align="center">
              <span className="text-[13px]">
                {pbx.last_seen_at
                  ? new Date(pbx.last_seen_at).toLocaleString()
                  : t("lastSeenNever")}
              </span>
            </FieldRow>
            <FieldRow label={t("asteriskVersion")} align="center">
              <span className="font-mono text-[13px]">{pbx.asterisk_version || "—"}</span>
            </FieldRow>
          </>
        )}
      </SettingsSection>

      {pbx && installCommand && String(pbx.status) !== "active" && (
        <SettingsSection title={t("installTitle")} hint={t("installCommand")} testId="pbx-server-install">
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <code className="block max-w-full overflow-x-auto whitespace-pre rounded-md border bg-muted px-3 py-2 font-mono text-xs">
              {installCommand}
            </code>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={Copy} onClick={() => copyInstall(installCommand)} testId="pbx-server-copy">
                {copied ? t("copied") : t("copy")}
              </ActionButton>
              <ActionButton
                icon={RotateCw}
                onClick={handleRegenerate}
                disabled={regenMut.isPending}
                testId="pbx-server-regenerate"
              >
                {t("regenerateToken")}
              </ActionButton>
            </div>
          </div>
        </SettingsSection>
      )}

      {pbx && (
        <DangerZone
          label={t("deleteLabel")}
          help={`${pbx.name} (${pbx.fqdn})`}
          actionLabel={tForm("delete")}
          onAction={() => setDeleteOpen(true)}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{pbx ? t("edit") : t("register")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <DialogField label={t("form.name")} htmlFor="pbx-name" help={t("form.nameHelp")}>
              <Input
                id="pbx-name"
                className={dialogInputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </DialogField>
            <DialogField label={t("form.fqdn")} htmlFor="pbx-fqdn" help={t("form.fqdnHelp")}>
              <Input
                id="pbx-fqdn"
                className={dialogInputClass}
                value={form.fqdn}
                onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
                placeholder="pbx.example.com"
              />
            </DialogField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DialogField label={t("form.publicIp")} htmlFor="pbx-ip" help={t("form.publicIpHelp")}>
                <Input
                  id="pbx-ip"
                  className={dialogInputClass}
                  value={form.public_ip}
                  onChange={(e) => setForm({ ...form, public_ip: e.target.value })}
                  placeholder="1.2.3.4"
                />
              </DialogField>
              <DialogField label={t("form.amiPort")} htmlFor="pbx-ami-port">
                <Input
                  id="pbx-ami-port"
                  type="number"
                  className={dialogInputClass}
                  value={form.ami_port}
                  onChange={(e) =>
                    setForm({ ...form, ami_port: Number(e.target.value) || 5038 })
                  }
                />
              </DialogField>
            </div>
            <DialogSwitchRow
              label={t("form.usePrefix")}
              htmlFor="pbx-prefix"
              help={t("form.usePrefixHelp")}
              control={
                <SettingsToggle
                  id="pbx-prefix"
                  checked={form.use_tenant_prefix}
                  onCheckedChange={(v) => setForm({ ...form, use_tenant_prefix: v })}
                />
              }
            />
          </div>

          <DialogFooter>
            <button type="button" className={rdButton.outline} onClick={() => setDialogOpen(false)}>
              {tForm("cancel")}
            </button>
            <button
              type="button"
              className={rdButton.primary}
              onClick={handleSubmit}
              disabled={createMut.isPending || updateMut.isPending}
              data-testid="pbx-server-submit"
            >
              {createMut.isPending || updateMut.isPending
                ? tForm("saving")
                : pbx
                ? tForm("update")
                : tForm("create")}
            </button>
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
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              {deleteMut.isPending ? tForm("deleting") : tForm("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
