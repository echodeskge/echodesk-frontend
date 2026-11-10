"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Network, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Column } from "@/components/redesign/data-table";
import { rdButton } from "@/components/redesign/buttons";
import {
  AvatarCell,
  BadgeCell,
  SecretInput,
  SettingsToggle,
  TextCell,
} from "@/components/redesign/settings";
import {
  DialogField,
  DialogSwitchRow,
  PbxEmpty,
  PbxListBlock,
  RowIconButton,
  dialogInputClass,
} from "../_components/pbx-ui";
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
  const tStatus = useTranslations("pbxSettings.status");
  const tList = useTranslations("pbxSettings.list");
  const tSecret = useTranslations("pbxSettings.secret");
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

  const phonesOf = (trunk: TrunkList): string[] =>
    Array.isArray(trunk.phone_numbers) ? (trunk.phone_numbers as string[]) : [];

  const columns: Column<TrunkList>[] = [
    {
      id: "name",
      header: t("columns.name"),
      width: "minmax(0,1.3fr)",
      mobile: "title",
      cell: (trunk) => <AvatarCell name={trunk.name} shape="square" icon={Network} />,
    },
    {
      id: "provider",
      header: t("columns.provider"),
      width: "minmax(0,0.8fr)",
      cell: (trunk) => <TextCell text={trunk.provider ?? "—"} />,
    },
    {
      id: "sipServer",
      header: t("columns.sipServer"),
      width: "minmax(0,0.8fr)",
      mobile: "hidden",
      cell: () => <TextCell text="—" mono muted />,
    },
    {
      id: "phones",
      header: t("columns.phoneNumbers"),
      width: "minmax(0,1.2fr)",
      cell: (trunk) => {
        const phones = phonesOf(trunk);
        return <TextCell text={phones.length ? phones.join(", ") : "—"} mono />;
      },
    },
    {
      id: "status",
      header: t("columns.status"),
      width: "100px",
      mobile: "end",
      cell: (trunk) =>
        trunk.is_active ? (
          <BadgeCell tone="success" dot>{tStatus("active")}</BadgeCell>
        ) : (
          <BadgeCell tone="neutral" dot>{tStatus("inactive")}</BadgeCell>
        ),
    },
    {
      id: "actions",
      header: <span className="sr-only">{tList("actions")}</span>,
      width: "68px",
      align: "end",
      mobile: "actions",
      cell: (trunk) => (
        <span className="flex items-center gap-0.5">
          <RowIconButton icon={Pencil} label={t("edit")} onClick={() => openEdit(trunk)} />
          <RowIconButton
            icon={Trash2}
            tone="danger"
            label={tForm("delete")}
            onClick={() => setDeleteTarget(trunk)}
            testId="trunk-delete"
          />
        </span>
      ),
    },
  ];

  return (
    <PbxListBlock
      title={t("title")}
      description={t("description")}
      newAction={{ label: t("new"), onClick: openCreate, testId: "trunk-new" }}
      columns={columns}
      rows={isLoading ? undefined : trunks}
      rowKey={(trunk) => trunk.id}
      onRowClick={openEdit}
      loading={isLoading}
      empty={<PbxEmpty icon={Network} text={t("empty")} />}
      countLabel={tList("trunks", { count: trunks.length })}
      ariaLabel={t("title")}
      idPrefix="pbx-trunks"
    >
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("edit") : t("new")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
            <DialogField className="md:col-span-2" label={t("form.name")} htmlFor="trunk-name" help={t("form.nameHelp")}>
              <Input
                id="trunk-name"
                className={dialogInputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </DialogField>

            <DialogField label={t("form.provider")} htmlFor="trunk-provider" help={t("form.providerHelp")}>
              <Input
                id="trunk-provider"
                className={dialogInputClass}
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
            </DialogField>

            <DialogField label={t("form.callerIdNumber")} htmlFor="trunk-caller-id">
              <Input
                id="trunk-caller-id"
                className={dialogInputClass}
                value={form.caller_id_number}
                onChange={(e) => setForm({ ...form, caller_id_number: e.target.value })}
              />
            </DialogField>

            <DialogField label={t("form.sipServer")} htmlFor="trunk-sip-server">
              <Input
                id="trunk-sip-server"
                className={dialogInputClass}
                value={form.sip_server}
                onChange={(e) => setForm({ ...form, sip_server: e.target.value })}
              />
            </DialogField>

            <DialogField label={t("form.sipPort")} htmlFor="trunk-sip-port">
              <Input
                id="trunk-sip-port"
                type="number"
                className={dialogInputClass}
                value={form.sip_port}
                onChange={(e) => setForm({ ...form, sip_port: Number(e.target.value) || 5060 })}
              />
            </DialogField>

            <DialogField label={t("form.username")} htmlFor="trunk-username">
              <Input
                id="trunk-username"
                className={dialogInputClass}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </DialogField>

            <DialogField label={t("form.password")} htmlFor="trunk-password">
              <SecretInput
                id="trunk-password"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                showLabel={tSecret("show")}
                hideLabel={tSecret("hide")}
                autoComplete="new-password"
                mono={false}
              />
            </DialogField>

            <DialogField label={t("form.realm")} htmlFor="trunk-realm">
              <Input
                id="trunk-realm"
                className={dialogInputClass}
                value={form.realm}
                onChange={(e) => setForm({ ...form, realm: e.target.value })}
              />
            </DialogField>

            <DialogField label={t("form.proxy")} htmlFor="trunk-proxy">
              <Input
                id="trunk-proxy"
                className={dialogInputClass}
                value={form.proxy}
                onChange={(e) => setForm({ ...form, proxy: e.target.value })}
              />
            </DialogField>

            <DialogField className="md:col-span-2" label={t("form.codecs")} htmlFor="trunk-codecs" help={t("form.codecsHelp")}>
              <Input
                id="trunk-codecs"
                className={dialogInputClass}
                value={form.codecs}
                onChange={(e) => setForm({ ...form, codecs: e.target.value })}
              />
            </DialogField>

            <DialogField
              className="md:col-span-2"
              label={t("form.phoneNumbers")}
              htmlFor="trunk-new-phone"
              help={t("form.phoneNumbersHelp")}
            >
              <div className="flex gap-2">
                <Input
                  id="trunk-new-phone"
                  className={dialogInputClass}
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
                <button type="button" className={rdButton.outline} onClick={addPhone}>
                  {t("form.addPhoneNumber")}
                </button>
              </div>
              {form.phone_numbers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.phone_numbers.map((n) => (
                    <span
                      key={n}
                      className="inline-flex h-6 items-center gap-1 rounded-md border bg-muted/50 ps-2 pe-1 font-mono text-xs"
                    >
                      {n}
                      <button
                        type="button"
                        onClick={() => removePhone(n)}
                        aria-label={tList("removeNumber", { number: n })}
                        className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </DialogField>

            <DialogSwitchRow
              label={t("form.register")}
              htmlFor="trunk-register"
              help={t("form.registerHelp")}
              control={
                <SettingsToggle
                  id="trunk-register"
                  checked={form.register}
                  onCheckedChange={(v) => setForm({ ...form, register: v })}
                />
              }
            />

            <DialogSwitchRow
              label={t("form.isActive")}
              htmlFor="trunk-active"
              control={
                <SettingsToggle
                  id="trunk-active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
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
              disabled={saving}
              data-testid="trunk-submit"
            >
              {saving ? tForm("saving") : editing ? tForm("update") : tForm("create")}
            </button>
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
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? tForm("deleting") : tForm("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PbxListBlock>
  );
}
