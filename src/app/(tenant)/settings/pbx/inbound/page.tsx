"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Route, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import type { Column } from "@/components/redesign/data-table";
import { rdButton } from "@/components/redesign/buttons";
import { BadgeCell, SettingsToggle, TextCell } from "@/components/redesign/settings";
import { LabeledCount, PbxEmpty, PbxListBlock, RowIconButton, dialogInputClass } from "../_components/pbx-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useInboundRoutes,
  useCreateInboundRoute,
  useUpdateInboundRoute,
  useDeleteInboundRoute,
  useTrunks,
  useQueues,
} from "@/hooks/usePbxQueries";
import { phoneAssignmentsList, sipConfigurationsList } from "@/api/generated/api";
import type {
  InboundRoute,
  InboundRouteRequest,
  TrunkList,
  QueueList,
  DestinationTypeEnum,
  UserPhoneAssignment,
  SipConfigurationList,
} from "@/api/generated/interfaces";
import { useQuery } from "@tanstack/react-query";

type DestType = "queue" | "extension" | "voicemail" | "ivr_custom" | "hangup";

type InboundFormState = {
  did: string;
  trunk: number | null;
  destination_type: DestType;
  destination_queue: number | null;
  destination_extension: number | null;
  ivr_custom_context: string;
  working_hours_override: number | null;
  priority: number;
  is_active: boolean;
};

const EMPTY_FORM: InboundFormState = {
  did: "",
  trunk: null,
  destination_type: "queue",
  destination_queue: null,
  destination_extension: null,
  ivr_custom_context: "",
  working_hours_override: null,
  priority: 100,
  is_active: true,
};

export default function InboundRoutesPage() {
  const t = useTranslations("pbxSettings.inbound");
  const tStatus = useTranslations("pbxSettings.status");
  const tList = useTranslations("pbxSettings.list");
  const tForm = useTranslations("pbxSettings.form");
  const tToast = useTranslations("pbxSettings.toast");

  const { data, isLoading } = useInboundRoutes();
  const createMut = useCreateInboundRoute();
  const updateMut = useUpdateInboundRoute();
  const deleteMut = useDeleteInboundRoute();

  const { data: trunksData } = useTrunks();
  const { data: queuesData } = useQueues();
  const { data: assignmentsData } = useQuery({
    queryKey: ["phone-assignments-for-inbound"],
    queryFn: () => phoneAssignmentsList(),
  });
  const { data: sipConfigsData } = useQuery({
    queryKey: ["sip-configs-for-inbound"],
    queryFn: () => sipConfigurationsList(),
  });

  const trunks = useMemo<TrunkList[]>(() => {
    if (!trunksData) return [];
    const d = trunksData as { results?: TrunkList[] } | TrunkList[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [trunksData]);
  const queues = useMemo<QueueList[]>(() => {
    if (!queuesData) return [];
    const d = queuesData as { results?: QueueList[] } | QueueList[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [queuesData]);
  const assignments = useMemo<UserPhoneAssignment[]>(() => {
    if (!assignmentsData) return [];
    const d = assignmentsData as
      | { results?: UserPhoneAssignment[] }
      | UserPhoneAssignment[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [assignmentsData]);
  const sipConfigs = useMemo<SipConfigurationList[]>(() => {
    if (!sipConfigsData) return [];
    const d = sipConfigsData as
      | { results?: SipConfigurationList[] }
      | SipConfigurationList[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [sipConfigsData]);

  const routes = useMemo<InboundRoute[]>(() => {
    if (!data) return [];
    const d = data as { results?: InboundRoute[] } | InboundRoute[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [data]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InboundRoute | null>(null);
  const [form, setForm] = useState<InboundFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<InboundRoute | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (route: InboundRoute) => {
    setEditing(route);
    setForm({
      did: route.did,
      trunk: route.trunk ?? null,
      destination_type: ((route.destination_type as unknown as string) ?? "queue") as DestType,
      destination_queue: route.destination_queue ?? null,
      destination_extension: route.destination_extension ?? null,
      ivr_custom_context: route.ivr_custom_context ?? "",
      working_hours_override: route.working_hours_override ?? null,
      priority: route.priority ?? 100,
      is_active: route.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const buildPayload = (): InboundRouteRequest => ({
    did: form.did.trim(),
    trunk: form.trunk ?? undefined,
    destination_type: form.destination_type as unknown as DestinationTypeEnum,
    destination_queue: form.destination_type === "queue" ? form.destination_queue ?? undefined : undefined,
    destination_extension:
      form.destination_type === "extension" ? form.destination_extension ?? undefined : undefined,
    ivr_custom_context:
      form.destination_type === "ivr_custom" ? form.ivr_custom_context.trim() : undefined,
    working_hours_override: form.working_hours_override ?? undefined,
    priority: form.priority,
    is_active: form.is_active,
  });

  const validate = (): string | null => {
    if (!form.did.trim()) return t("form.errors.didRequired");
    if (form.destination_type === "queue" && form.destination_queue == null)
      return t("form.errors.queueRequired");
    if (form.destination_type === "extension" && form.destination_extension == null)
      return t("form.errors.extensionRequired");
    if (form.destination_type === "ivr_custom" && !form.ivr_custom_context.trim())
      return t("form.errors.ivrContextRequired");
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: buildPayload() });
        toast.success(tToast("updated"));
      } else {
        await createMut.mutateAsync(buildPayload());
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

  const resolveDestination = (route: InboundRoute): string => {
    const type = (route.destination_type as unknown as string) ?? "";
    if (type === "queue") return route.destination_queue_slug || "—";
    if (type === "extension") return route.destination_extension_display || "—";
    if (type === "ivr_custom") return route.ivr_custom_context || "—";
    return "—";
  };

  const columns: Column<InboundRoute>[] = [
    {
      id: "did",
      header: t("columns.did"),
      width: "minmax(0,1.2fr)",
      mobile: "title",
      cell: (r) => <TextCell text={r.did} mono strong />,
    },
    {
      id: "type",
      header: t("columns.destinationType"),
      width: "minmax(0,1fr)",
      cell: (r) => (
        <TextCell text={t(`destinations.${(r.destination_type as unknown as string) ?? "queue"}` as never)} />
      ),
    },
    {
      id: "destination",
      header: t("columns.destination"),
      width: "minmax(0,1fr)",
      cell: (r) => <TextCell text={resolveDestination(r)} />,
    },
    {
      id: "priority",
      header: t("columns.priority"),
      width: "80px",
      numeric: true,
      cell: (r) => <LabeledCount label={t("columns.priority")} value={r.priority ?? 100} />,
    },
    {
      id: "status",
      header: t("columns.status"),
      width: "100px",
      mobile: "end",
      cell: (r) =>
        r.is_active ? (
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
      cell: (r) => (
        <span className="flex items-center gap-0.5">
          <RowIconButton icon={Pencil} label={t("edit")} onClick={() => openEdit(r)} />
          <RowIconButton
            icon={Trash2}
            tone="danger"
            label={tForm("delete")}
            onClick={() => setDeleteTarget(r)}
            testId="route-delete"
          />
        </span>
      ),
    },
  ];

  return (
    <PbxListBlock
      title={t("title")}
      description={t("description")}
      newAction={{ label: t("new"), onClick: openCreate, testId: "route-new" }}
      columns={columns}
      rows={isLoading ? undefined : routes}
      rowKey={(r) => r.id}
      onRowClick={openEdit}
      loading={isLoading}
      empty={<PbxEmpty icon={Route} text={t("empty")} />}
      countLabel={tList("routes", { count: routes.length })}
      ariaLabel={t("title")}
      idPrefix="pbx-inbound"
    >
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("edit") : t("new")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-[13px]" htmlFor="route-did">{t("form.did")}</Label>
              <Input
                className={dialogInputClass}
                id="route-did"
                value={form.did}
                onChange={(e) => setForm({ ...form, did: e.target.value })}
              />
              <p className="text-xs leading-[17px] text-muted-foreground">{t("form.didHelp")}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]">{t("form.trunk")}</Label>
              <Select
                value={form.trunk != null ? String(form.trunk) : ""}
                onValueChange={(v) => setForm({ ...form, trunk: v ? Number(v) : null })}
              >
                <SelectTrigger className={dialogInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trunks.map((tr) => (
                    <SelectItem key={tr.id} value={String(tr.id)}>
                      {tr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]">{t("form.destinationType")}</Label>
              <Select
                value={form.destination_type}
                onValueChange={(v) =>
                  setForm({ ...form, destination_type: v as DestType })
                }
              >
                <SelectTrigger className={dialogInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queue">{t("destinations.queue")}</SelectItem>
                  <SelectItem value="extension">{t("destinations.extension")}</SelectItem>
                  <SelectItem value="voicemail">{t("destinations.voicemail")}</SelectItem>
                  <SelectItem value="ivr_custom">{t("destinations.ivr_custom")}</SelectItem>
                  <SelectItem value="hangup">{t("destinations.hangup")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.destination_type === "queue" && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[13px]">{t("form.destinationQueue")}</Label>
                <Select
                  value={form.destination_queue != null ? String(form.destination_queue) : ""}
                  onValueChange={(v) => setForm({ ...form, destination_queue: Number(v) })}
                >
                  <SelectTrigger className={dialogInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {queues.map((q) => (
                      <SelectItem key={q.id} value={String(q.id)}>
                        {q.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.destination_type === "extension" && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[13px]">{t("form.destinationExtension")}</Label>
                <Select
                  value={
                    form.destination_extension != null ? String(form.destination_extension) : ""
                  }
                  onValueChange={(v) => setForm({ ...form, destination_extension: Number(v) })}
                >
                  <SelectTrigger className={dialogInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {t("extOption", { extension: a.extension, name: a.user_name })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.destination_type === "ivr_custom" && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[13px]" htmlFor="route-ivr">{t("form.ivrCustomContext")}</Label>
                <Input
                  className={dialogInputClass}
                  id="route-ivr"
                  value={form.ivr_custom_context}
                  onChange={(e) =>
                    setForm({ ...form, ivr_custom_context: e.target.value })
                  }
                />
                <p className="text-xs leading-[17px] text-muted-foreground">{t("form.ivrCustomContextHelp")}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[13px]">{t("form.workingHoursOverride")}</Label>
              <Select
                value={
                  form.working_hours_override != null ? String(form.working_hours_override) : ""
                }
                onValueChange={(v) =>
                  setForm({ ...form, working_hours_override: v ? Number(v) : null })
                }
              >
                <SelectTrigger className={dialogInputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sipConfigs.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px]" htmlFor="route-priority">{t("form.priority")}</Label>
              <Input
                className={dialogInputClass}
                id="route-priority"
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })}
              />
              <p className="text-xs leading-[17px] text-muted-foreground">{t("form.priorityHelp")}</p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
              <SettingsToggle
                id="route-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label className="text-[13px]" htmlFor="route-active">{t("form.isActive")}</Label>
            </div>
          </div>

          <DialogFooter>
            <button type="button" className={rdButton.outline} onClick={() => setDialogOpen(false)}>
              {tForm("cancel")}
            </button>
            <button type="button" className={rdButton.primary} onClick={handleSubmit} disabled={saving} data-testid="pbx-dialog-submit">
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
              {deleteTarget ? t("deleteConfirm", { did: deleteTarget.did }) : null}
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
