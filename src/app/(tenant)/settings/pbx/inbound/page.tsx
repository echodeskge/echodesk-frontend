"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    if (!form.did.trim()) return "DID";
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
        ) : routes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.did")}</TableHead>
                <TableHead>{t("columns.destinationType")}</TableHead>
                <TableHead>{t("columns.destination")}</TableHead>
                <TableHead>{t("columns.priority")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.did}</TableCell>
                  <TableCell>
                    {t(
                      `destinations.${(r.destination_type as unknown as string) ?? "queue"}` as never
                    )}
                  </TableCell>
                  <TableCell>{resolveDestination(r)}</TableCell>
                  <TableCell>{r.priority ?? 100}</TableCell>
                  <TableCell>
                    {r.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
              <Label htmlFor="route-did">{t("form.did")}</Label>
              <Input
                id="route-did"
                value={form.did}
                onChange={(e) => setForm({ ...form, did: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t("form.didHelp")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("form.trunk")}</Label>
              <Select
                value={form.trunk != null ? String(form.trunk) : ""}
                onValueChange={(v) => setForm({ ...form, trunk: v ? Number(v) : null })}
              >
                <SelectTrigger>
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
              <Label>{t("form.destinationType")}</Label>
              <Select
                value={form.destination_type}
                onValueChange={(v) =>
                  setForm({ ...form, destination_type: v as DestType })
                }
              >
                <SelectTrigger>
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
                <Label>{t("form.destinationQueue")}</Label>
                <Select
                  value={form.destination_queue != null ? String(form.destination_queue) : ""}
                  onValueChange={(v) => setForm({ ...form, destination_queue: Number(v) })}
                >
                  <SelectTrigger>
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
                <Label>{t("form.destinationExtension")}</Label>
                <Select
                  value={
                    form.destination_extension != null ? String(form.destination_extension) : ""
                  }
                  onValueChange={(v) => setForm({ ...form, destination_extension: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        ext {a.extension} — {a.user_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.destination_type === "ivr_custom" && (
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="route-ivr">{t("form.ivrCustomContext")}</Label>
                <Input
                  id="route-ivr"
                  value={form.ivr_custom_context}
                  onChange={(e) =>
                    setForm({ ...form, ivr_custom_context: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">{t("form.ivrCustomContextHelp")}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("form.workingHoursOverride")}</Label>
              <Select
                value={
                  form.working_hours_override != null ? String(form.working_hours_override) : ""
                }
                onValueChange={(v) =>
                  setForm({ ...form, working_hours_override: v ? Number(v) : null })
                }
              >
                <SelectTrigger>
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
              <Label htmlFor="route-priority">{t("form.priority")}</Label>
              <Input
                id="route-priority"
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t("form.priorityHelp")}</p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="route-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="route-active">{t("form.isActive")}</Label>
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
              {deleteTarget ? t("deleteConfirm", { did: deleteTarget.did }) : null}
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
