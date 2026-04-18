"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
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
  useQueues,
  useCreateQueue,
  useUpdateQueue,
  useDeleteQueue,
  useQueueMembers,
} from "@/hooks/usePbxQueries";
import { tenantGroupsList, queuesRetrieve } from "@/api/generated/api";
import type {
  Queue,
  QueueList,
  QueueRequest,
  TenantGroup,
  StrategyEnum,
  JoinemptyEnum,
  LeavewhenemptyEnum,
  QueueMember,
} from "@/api/generated/interfaces";
import { useQuery } from "@tanstack/react-query";

const STRATEGIES = [
  "ringall",
  "rrmemory",
  "leastrecent",
  "fewestcalls",
  "random",
  "linear",
  "wrandom",
] as const;
const JOIN_EMPTY = ["yes", "no", "strict", "loose"] as const;
const LEAVE_WHEN_EMPTY = ["yes", "no", "strict", "loose"] as const;

type QueueFormState = {
  name: string;
  slug: string;
  strategy: (typeof STRATEGIES)[number];
  group: number | null;
  timeout_seconds: number;
  max_wait_seconds: number;
  max_len: number;
  wrapup_time: number;
  music_on_hold: string;
  announce_position: boolean;
  announce_holdtime: boolean;
  joinempty: (typeof JOIN_EMPTY)[number];
  leavewhenempty: (typeof LEAVE_WHEN_EMPTY)[number];
  is_active: boolean;
  is_default: boolean;
};

const EMPTY_FORM: QueueFormState = {
  name: "",
  slug: "",
  strategy: "rrmemory",
  group: null,
  timeout_seconds: 30,
  max_wait_seconds: 300,
  max_len: 0,
  wrapup_time: 10,
  music_on_hold: "queue-hold",
  announce_position: true,
  announce_holdtime: false,
  joinempty: "yes",
  leavewhenempty: "no",
  is_active: true,
  is_default: false,
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function QueuesPage() {
  const t = useTranslations("pbxSettings.queues");
  const tForm = useTranslations("pbxSettings.form");
  const tToast = useTranslations("pbxSettings.toast");

  const { data, isLoading } = useQueues();
  const createMut = useCreateQueue();
  const updateMut = useUpdateQueue();
  const deleteMut = useDeleteQueue();

  const { data: groupsData } = useQuery({
    queryKey: ["tenant-groups-for-queues"],
    queryFn: () => tenantGroupsList(),
  });
  const groups = useMemo<TenantGroup[]>(() => {
    if (!groupsData) return [];
    const g = groupsData as { results?: TenantGroup[] } | TenantGroup[];
    return Array.isArray(g) ? g : (g.results ?? []);
  }, [groupsData]);

  const queues = useMemo<QueueList[]>(() => {
    if (!data) return [];
    const d = data as { results?: QueueList[] } | QueueList[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [data]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Queue | null>(null);
  const [form, setForm] = useState<QueueFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<QueueList | null>(null);
  const [membersOpenFor, setMembersOpenFor] = useState<QueueList | null>(null);

  // Auto-slugify
  useEffect(() => {
    if (!editing && form.name) {
      const expected = slugify(form.name);
      if (form.slug === "" || form.slug === slugify(form.name.slice(0, form.slug.length))) {
        setForm((f) => ({ ...f, slug: expected }));
      }
    }
  }, [form.name, form.slug, editing]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = async (queueSummary: QueueList) => {
    setDialogOpen(true);
    try {
      const queue = await queuesRetrieve(queueSummary.id);
      setEditing(queue);
      setForm({
        name: queue.name,
        slug: queue.slug,
        strategy: ((queue.strategy as unknown as string) ?? "rrmemory") as QueueFormState["strategy"],
        group: queue.group,
        timeout_seconds: queue.timeout_seconds ?? 30,
        max_wait_seconds: queue.max_wait_seconds ?? 300,
        max_len: queue.max_len ?? 0,
        wrapup_time: queue.wrapup_time ?? 10,
        music_on_hold: queue.music_on_hold ?? "queue-hold",
        announce_position: queue.announce_position ?? true,
        announce_holdtime: queue.announce_holdtime ?? false,
        joinempty: ((queue.joinempty as unknown as string) ?? "yes") as QueueFormState["joinempty"],
        leavewhenempty: ((queue.leavewhenempty as unknown as string) ??
          "no") as QueueFormState["leavewhenempty"],
        is_active: queue.is_active ?? true,
        is_default: queue.is_default ?? false,
      });
    } catch {
      toast.error(tToast("error"));
      setDialogOpen(false);
    }
  };

  const buildPayload = (): QueueRequest => ({
    name: form.name.trim(),
    slug: form.slug.trim(),
    strategy: form.strategy as unknown as StrategyEnum,
    group: form.group as number,
    timeout_seconds: form.timeout_seconds,
    max_wait_seconds: form.max_wait_seconds,
    max_len: form.max_len,
    wrapup_time: form.wrapup_time,
    music_on_hold: form.music_on_hold.trim(),
    announce_position: form.announce_position,
    announce_holdtime: form.announce_holdtime,
    joinempty: form.joinempty as unknown as JoinemptyEnum,
    leavewhenempty: form.leavewhenempty as unknown as LeavewhenemptyEnum,
    is_active: form.is_active,
    is_default: form.is_default,
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim() || form.group == null) {
      toast.error(tToast("error"));
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
        ) : queues.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.strategy")}</TableHead>
                <TableHead>{t("columns.group")}</TableHead>
                <TableHead>{t("columns.members")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    {q.name}
                    {q.is_default && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {t("columns.default")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {t(`strategies.${(q.strategy as unknown as string) ?? "rrmemory"}` as never)}
                  </TableCell>
                  <TableCell>{q.group_name}</TableCell>
                  <TableCell>{q.member_count}</TableCell>
                  <TableCell>
                    {q.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setMembersOpenFor(q)}>
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(q)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(q)}>
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
            <div className="space-y-2">
              <Label htmlFor="queue-name">{t("form.name")}</Label>
              <Input
                id="queue-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queue-slug">{t("form.slug")}</Label>
              <Input
                id="queue-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{t("form.slugHelp")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("form.strategy")}</Label>
              <Select
                value={form.strategy}
                onValueChange={(v) => setForm({ ...form, strategy: v as QueueFormState["strategy"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`strategies.${s}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("form.group")}</Label>
              <Select
                value={form.group != null ? String(form.group) : ""}
                onValueChange={(v) => setForm({ ...form, group: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("form.groupHelp")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="queue-timeout">{t("form.timeoutSeconds")}</Label>
              <Input
                id="queue-timeout"
                type="number"
                value={form.timeout_seconds}
                onChange={(e) =>
                  setForm({ ...form, timeout_seconds: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queue-maxwait">{t("form.maxWaitSeconds")}</Label>
              <Input
                id="queue-maxwait"
                type="number"
                value={form.max_wait_seconds}
                onChange={(e) =>
                  setForm({ ...form, max_wait_seconds: Number(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="queue-maxlen">{t("form.maxLen")}</Label>
              <Input
                id="queue-maxlen"
                type="number"
                value={form.max_len}
                onChange={(e) => setForm({ ...form, max_len: Number(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">{t("form.maxLenHelp")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="queue-wrapup">{t("form.wrapupTime")}</Label>
              <Input
                id="queue-wrapup"
                type="number"
                value={form.wrapup_time}
                onChange={(e) =>
                  setForm({ ...form, wrapup_time: Number(e.target.value) || 0 })
                }
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="queue-moh">{t("form.musicOnHold")}</Label>
              <Input
                id="queue-moh"
                value={form.music_on_hold}
                onChange={(e) => setForm({ ...form, music_on_hold: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("form.joinempty")}</Label>
              <Select
                value={form.joinempty}
                onValueChange={(v) =>
                  setForm({ ...form, joinempty: v as QueueFormState["joinempty"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOIN_EMPTY.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("form.leavewhenempty")}</Label>
              <Select
                value={form.leavewhenempty}
                onValueChange={(v) =>
                  setForm({ ...form, leavewhenempty: v as QueueFormState["leavewhenempty"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_WHEN_EMPTY.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="queue-announce-pos"
                checked={form.announce_position}
                onCheckedChange={(v) => setForm({ ...form, announce_position: v })}
              />
              <Label htmlFor="queue-announce-pos">{t("form.announcePosition")}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="queue-announce-hold"
                checked={form.announce_holdtime}
                onCheckedChange={(v) => setForm({ ...form, announce_holdtime: v })}
              />
              <Label htmlFor="queue-announce-hold">{t("form.announceHoldtime")}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="queue-default"
                checked={form.is_default}
                onCheckedChange={(v) => setForm({ ...form, is_default: v })}
              />
              <Label htmlFor="queue-default">{t("form.isDefault")}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="queue-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="queue-active">{t("form.isActive")}</Label>
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

      <Dialog open={!!membersOpenFor} onOpenChange={(v) => !v && setMembersOpenFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("membersTitle")}
              {membersOpenFor ? ` — ${membersOpenFor.name}` : ""}
            </DialogTitle>
            <DialogDescription>{t("membersHelp")}</DialogDescription>
          </DialogHeader>
          {membersOpenFor && <QueueMembersInline queueId={membersOpenFor.id} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function QueueMembersInline({ queueId }: { queueId: number }) {
  const t = useTranslations("pbxSettings.queues");
  const { data, isLoading } = useQueueMembers(queueId);

  const members = useMemo<QueueMember[]>(() => {
    if (!data) return [];
    const d = data as { results?: QueueMember[] } | QueueMember[];
    const all = Array.isArray(d) ? d : (d.results ?? []);
    return all.filter((m) => m.queue === queueId);
  }, [data, queueId]);

  if (isLoading) return <p className="text-sm text-muted-foreground">…</p>;
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noMembers")}</p>;
  }
  return (
    <ul className="divide-y text-sm">
      {members.map((m) => (
        <li key={m.id} className="py-2 flex items-center justify-between">
          <span className="font-mono">ext {m.extension}</span>
          {m.paused && <Badge variant="secondary">paused</Badge>}
        </li>
      ))}
    </ul>
  );
}
