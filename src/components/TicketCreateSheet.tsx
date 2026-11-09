"use client";

/**
 * The global "New ticket" sheet (plan FE-14, W8, W57, W127). Mounted once in
 * the tenant layout and opened through `useTicketCreate().openTicketCreate`
 * from the header "+", the board header, a column's "+", a list group's "+"
 * and the incoming-call sidebar.
 *
 * - Board and status are always resolved: the board the caller passed, else
 *   the board selected elsewhere in the app, else the default board, else the
 *   first one; the column the caller passed, else the board's default column,
 *   else its first open column. Columns are fetched for the chosen board
 *   only and across every page, so a passed column is never dropped.
 * - Options come from the shared ticket pickers (every page, users filtered by
 *   board access).
 * - Priority has the four backend values (E17); the description is rich text
 *   saved as HTML (E16); due date and customer are new (U2). The customer row
 *   shows only with the social feature (R13), pre-filled from `opts.customerId`.
 * - Attachments upload after the ticket exists; each failure gets its own
 *   toast instead of being skipped silently.
 * - After create: the board, list, column counts, view counts and board
 *   counts refetch, and the toast offers "Open ticket".
 *
 * The sheet renders outside the tickets route, so it only uses the global
 * `tickets` and `common` namespaces.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronsUpDown, Plus, UserRound, X } from "lucide-react";
import axios from "@/api/axios";
import { formSubmissionsCreate, itemListsRetrieve, ticketFormsRetrieve } from "@/api/generated/api";
import type { ItemList, SocialClientList, Ticket, TicketForm, TicketFormMinimal, User } from "@/api/generated/interfaces";
import { useTicketCreate, type TicketCreateOptions } from "@/contexts/TicketCreateContext";
import { useBoard } from "@/contexts/BoardContext";
import { socialClientKeys } from "@/hooks/api/useSocialClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { LabelManagementDialog } from "@/components/LabelManagementDialog";
import MultiUserAssignment, { type AssignmentData } from "@/components/MultiUserAssignment";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileDropzone, type UploadedFile } from "@/components/FileDropzone";
import { cn } from "@/lib/utils";
import { ColorDot, PriorityPill, PropertyPicker, PropertyPill, PropertyRow, type PickerOption } from "@/app/(tenant)/tickets/_components/primitives";
import { getAllPages, errorStatus, uploadAttachment } from "@/app/(tenant)/tickets/_lib/api";
import { issueMutationId, mutationHeaders } from "@/app/(tenant)/tickets/_lib/mutation-id";
import { getPriorityStyle, PRIORITY_OPTIONS, type TicketPriority } from "@/app/(tenant)/tickets/_lib/priority";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { BoardLite } from "@/app/(tenant)/tickets/_lib/types";
import { useBoardsLite } from "@/app/(tenant)/tickets/_hooks/use-boards-lite";
import { useTicketPickers } from "@/app/(tenant)/tickets/_hooks/use-ticket-pickers";
import { useTicketPermissions } from "@/app/(tenant)/tickets/_hooks/use-ticket-permissions";

// ---------------------------------------------------------------------------
// pure helpers (exported for tests)
// ---------------------------------------------------------------------------

type ColumnLike = { id: number; position?: number; is_default?: boolean; is_closed_status?: boolean };

/** The board to preselect: passed > selected elsewhere > default > first (all among accessible boards). */
export function resolveBoardId(
  boards: Pick<BoardLite, "id" | "is_default">[],
  passed: number | null | undefined,
  selected: number | null | undefined,
): number | null {
  if (passed) return passed;
  if (selected && boards.some((b) => b.id === selected)) return selected;
  return boards.find((b) => b.is_default)?.id ?? boards[0]?.id ?? null;
}

/**
 * The column to preselect from a board's columns (sorted by position):
 * the current one when it belongs to the board, else the default open
 * column, else the first open column, else the first column.
 */
export function resolveColumnId(columns: ColumnLike[], current: number | null | undefined): number | null {
  if (current && columns.some((c) => c.id === current)) return current;
  const open = columns.filter((c) => !c.is_closed_status);
  return (
    open.find((c) => c.is_default)?.id ??
    open[0]?.id ??
    columns.find((c) => c.is_default)?.id ??
    columns[0]?.id ??
    null
  );
}

export interface CreateTicketInput {
  title: string;
  priority: TicketPriority;
  columnId: number;
  descriptionHtml: string;
  tagIds: number[];
  groupIds: number[];
  assignments: AssignmentData[];
  dueDate: string;
  customerId: number | null;
  includeCustomer: boolean;
}

function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "" && !/<img\b/i.test(html);
}

/** The POST /api/tickets/ body; empty optional fields are left out. */
export function buildCreateBody(input: CreateTicketInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: input.title.trim(),
    priority: input.priority,
    column_id: input.columnId,
  };
  if (!isBlankHtml(input.descriptionHtml)) {
    body.description = input.descriptionHtml;
    body.rich_description = input.descriptionHtml;
    body.description_format = "html";
  }
  if (input.tagIds.length) body.tag_ids = input.tagIds;
  if (input.groupIds.length) body.assigned_group_ids = input.groupIds;
  if (input.assignments.length) {
    const primary = input.assignments.find((a) => a.role === "primary") ?? input.assignments[0];
    body.assigned_to_id = primary.userId;
    body.assigned_user_ids = input.assignments.map((a) => a.userId);
    body.assignment_roles = Object.fromEntries(input.assignments.map((a) => [String(a.userId), a.role]));
  }
  if (input.dueDate) body.due_date = input.dueDate;
  if (input.includeCustomer && input.customerId) body.customer_id = input.customerId;
  return body;
}

type FlatItem = { id: number; label: string; custom_id?: string; level: number };

function flattenItems(items: unknown[], level = 0, out: FlatItem[] = []): FlatItem[] {
  for (const raw of items as Array<FlatItem & { children?: unknown[] }>) {
    out.push({ id: raw.id, label: raw.label, custom_id: raw.custom_id, level });
    if (raw.children?.length) flattenItems(raw.children, level + 1, out);
  }
  return out;
}

function listRootItems(list: ItemList & { root_items?: unknown[]; items?: Array<{ parent?: unknown }> }): unknown[] {
  if (Array.isArray(list.root_items) && list.root_items.length) return list.root_items;
  if (Array.isArray(list.items) && list.items.length) return list.items.filter((i) => !i.parent);
  return [];
}

type CustomField = { name: string; label: string; type: string; required?: boolean };

function customFieldsOf(form: TicketForm | null | undefined): CustomField[] {
  const fields = (form as { custom_fields?: unknown } | null | undefined)?.custom_fields;
  return Array.isArray(fields) ? (fields as CustomField[]) : [];
}

function isEmptyValue(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

function clientName(c: Pick<SocialClientList, "name" | "full_name" | "email" | "phone"> | undefined | null): string {
  if (!c) return "";
  return c.name?.trim() || c.full_name?.trim() || c.email || c.phone || "";
}

// ---------------------------------------------------------------------------
// sheet
// ---------------------------------------------------------------------------

/**
 * The rail's PropertyRow with a wider label column: the sheet has room, and
 * Georgian labels ("შემსრულებლები") don't fit the rail's 92px.
 */
const ROW = "grid-cols-[112px_minmax(0,1fr)]";

export function TicketCreateSheet() {
  const { isOpen, selectedBoard, selectedColumn, options, closeTicketCreate } = useTicketCreate();
  const [busy, setBusy] = useState(false);
  // A fresh form per open, so nothing leaks from the previous ticket.
  const [session, setSession] = useState(0);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) setSession((s) => s + 1);
    wasOpen.current = isOpen;
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(next) => !next && !busy && closeTicketCreate()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]"
        data-testid="ticket-create-sheet"
      >
        {session > 0 && (
          <TicketCreateForm
            key={session}
            open={isOpen}
            passedBoardId={selectedBoard?.id ?? null}
            passedColumnId={selectedColumn?.id ?? null}
            options={options}
            onBusyChange={setBusy}
            onDone={closeTicketCreate}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface TicketCreateFormProps {
  open: boolean;
  passedBoardId: number | null;
  passedColumnId: number | null;
  options: TicketCreateOptions;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}

function TicketCreateForm({ open, passedBoardId, passedColumnId, options, onBusyChange, onDone }: TicketCreateFormProps) {
  const t = useTranslations("tickets");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const qc = useQueryClient();
  const perms = useTicketPermissions();
  const { selectedBoardId } = useBoard();

  const [title, setTitle] = useState(options.title ?? "");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [boardId, setBoardId] = useState<number | null>(passedBoardId);
  const [columnId, setColumnId] = useState<number | null>(passedColumnId);
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [groupIds, setGroupIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(options.customerId ?? null);
  const [formId, setFormId] = useState<number | null>(null);
  const [formTouched, setFormTouched] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<number, number | null>>({});
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => onBusyChange(saving), [saving, onBusyChange]);

  // --- data -----------------------------------------------------------------
  const boardsQuery = useBoardsLite({ enabled: open });
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);
  const pickers = useTicketPickers(boardId, { enabled: open });
  const columns = pickers.columns;
  const columnsLoaded = !!boardId && pickers.queries.columns.isSuccess;

  const formsQuery = useQuery({
    queryKey: tk.forms(),
    queryFn: () => getAllPages<TicketFormMinimal>("/api/ticket-forms/"),
    enabled: open,
    staleTime: 2 * 60_000,
  });
  const activeForms = useMemo(() => (formsQuery.data ?? []).filter((f) => f.is_active !== false), [formsQuery.data]);

  const formQuery = useQuery({
    queryKey: [...tk.forms(), formId],
    queryFn: () => ticketFormsRetrieve(formId as number),
    enabled: open && !!formId,
    staleTime: 2 * 60_000,
  });
  const form = formId ? formQuery.data ?? null : null;

  const listIds = useMemo(() => (form?.item_lists ?? []).map((l) => l.id), [form]);
  const listsQuery = useQuery({
    queryKey: ["itemLists", "forCreate", listIds],
    queryFn: () => Promise.all(listIds.map((id) => itemListsRetrieve(id))),
    enabled: open && listIds.length > 0,
    staleTime: 2 * 60_000,
  });

  // --- defaults -------------------------------------------------------------
  useEffect(() => {
    if (boardId || !boardsQuery.isSuccess) return;
    const next = resolveBoardId(boards, passedBoardId, selectedBoardId);
    if (next) setBoardId(next);
  }, [boardId, boards, boardsQuery.isSuccess, passedBoardId, selectedBoardId]);

  useEffect(() => {
    if (!columnsLoaded) return;
    const next = resolveColumnId(columns, columnId);
    if (next !== columnId) setColumnId(next);
  }, [columnsLoaded, columns, columnId]);

  useEffect(() => {
    if (formTouched || formId || !formsQuery.isSuccess) return;
    const def = activeForms.find((f) => f.is_default);
    if (def) setFormId(def.id);
  }, [formTouched, formId, formsQuery.isSuccess, activeForms]);

  // --- options --------------------------------------------------------------
  const boardOptions: PickerOption<number>[] = useMemo(() => {
    const opts = boards.map((b) => ({ value: b.id, label: b.name, color: b.color }));
    // A board passed by the caller that the lite list doesn't hold yet.
    if (boardId && !opts.some((o) => o.value === boardId) && passedBoardId === boardId) {
      opts.unshift({ value: boardId, label: `#${boardId}`, color: "" });
    }
    return opts;
  }, [boards, boardId, passedBoardId]);

  const columnOptions: PickerOption<number>[] = useMemo(
    () => columns.map((c) => ({ value: c.id, label: c.name, color: c.color || null })),
    [columns],
  );

  const priorityOptions: PickerOption<TicketPriority>[] = useMemo(
    () =>
      PRIORITY_OPTIONS.map((p) => {
        const s = getPriorityStyle(p);
        return { value: p, label: t(s.labelKey), textColor: s.color };
      }),
    [t],
  );

  const tagOptions: PickerOption<number>[] = useMemo(
    () => pickers.tags.map((tag) => ({ value: tag.id, label: tag.name, color: tag.color || "#6B7280" })),
    [pickers.tags],
  );

  const groupOptions: PickerOption<number>[] = useMemo(
    () => pickers.groups.map((g) => ({ value: g.id, label: g.name })),
    [pickers.groups],
  );

  // Drop assignees who can't work on a newly chosen board.
  const users = pickers.users as unknown as User[];
  useEffect(() => {
    if (!pickers.queries.users.isSuccess) return;
    const allowed = new Set(users.map((u) => u.id));
    setAssignments((prev) => {
      const next = prev.filter((a) => allowed.has(a.userId));
      return next.length === prev.length ? prev : next;
    });
  }, [users, pickers.queries.users.isSuccess]);

  const currentBoard = boards.find((b) => b.id === boardId);
  const currentColumn = columns.find((c) => c.id === columnId);
  const fields = customFieldsOf(form);
  const missingRequired = fields.some((f) => f.required && isEmptyValue(customValues[f.name]));
  const noColumns = columnsLoaded && columns.length === 0;
  const canSubmit = !saving && !!title.trim() && !!boardId && !!columnId && !missingRequired;

  // --- submit ---------------------------------------------------------------
  const submitRef = useRef<HTMLButtonElement>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Only the Create button submits. Shared pieces inside the form render
    // plain <button>s without type="button" (MultiUserAssignment, the label
    // manager trigger), and portalled dialogs' submits bubble here through
    // React; none of them may create the ticket.
    if (e.target !== e.currentTarget) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    if (submitter !== submitRef.current) return;
    if (!canSubmit || !boardId || !columnId) return;
    setSaving(true);
    let created: Ticket;
    try {
      const body = buildCreateBody({
        title,
        priority,
        columnId,
        descriptionHtml,
        tagIds,
        groupIds,
        assignments,
        dueDate,
        customerId,
        includeCustomer: perms.hasSocialFeature,
      });
      const { data } = await axios.post<Ticket>("/api/tickets/", body, { headers: mutationHeaders(issueMutationId()) });
      created = data;
    } catch (error) {
      toast.error(errorStatus(error) === 403 ? t("toasts.forbidden") : t("create.error"));
      setSaving(false);
      return;
    }

    for (const f of files) {
      try {
        await uploadAttachment(created.id, f.file, undefined, issueMutationId());
      } catch {
        toast.error(t("create.attachmentFailed", { name: f.file.name }));
      }
    }

    if (form) {
      try {
        await formSubmissionsCreate({
          ticket: created.id,
          form_id: form.id,
          selected_item_ids: Object.values(selectedItems).filter((id): id is number => id != null),
          form_data: customValues,
        } as unknown as Parameters<typeof formSubmissionsCreate>[0]);
      } catch {
        toast.error(t("create.formFailed"));
      }
    }

    qc.invalidateQueries({ queryKey: ["kanbanBoard", boardId] });
    qc.invalidateQueries({ queryKey: ["ticketList", boardId] });
    qc.invalidateQueries({ queryKey: ["ticketColumnCounts", boardId] });
    qc.invalidateQueries({ queryKey: ["ticketViewCounts"] });
    qc.invalidateQueries({ queryKey: ["boards"] });

    const id = created.id;
    toast.success(t("create.created", { id }), {
      action: { label: t("create.openTicket"), onClick: () => router.push(`/tickets/${id}`) },
    });
    setSaving(false);
    onDone();
  };

  // --- render ---------------------------------------------------------------
  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="text-base">{t("create.title")}</SheetTitle>
        <SheetDescription className="flex min-w-0 items-center gap-1.5 text-[13px]" data-testid="create-sheet-context">
          {currentBoard ? (
            <>
              <ColorDot color={currentBoard.color} />
              <span className="truncate">{currentBoard.name}</span>
              {currentColumn && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{currentColumn.name}</span>
                </>
              )}
            </>
          ) : (
            <span>{t("createTask")}</span>
          )}
        </SheetDescription>
      </SheetHeader>

      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-1.5">
            <Label htmlFor="create-ticket-title" className="sr-only">
              {t("ticketTitle")}
            </Label>
            <Textarea
              id="create-ticket-title"
              data-testid="create-title"
              value={title}
              required
              autoFocus
              rows={1}
              maxLength={255}
              aria-required="true"
              placeholder={t("create.titlePlaceholder")}
              disabled={saving}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              className={cn(
                "field-sizing-content min-h-[40px] resize-none rounded-md border-transparent px-2 py-1.5 shadow-none",
                "text-xl font-semibold leading-7 tracking-[-0.02em]",
                "hover:border-border focus-visible:border-input focus-visible:ring-[3px] focus-visible:ring-foreground/10",
              )}
            />
          </div>

          <div className="rounded-lg border px-3" data-testid="create-properties">
            <PropertyRow className={ROW} label={t("board")}>
              {boardsQuery.isSuccess && boards.length === 0 ? (
                <span className="text-xs text-muted-foreground">{t("create.noBoards")}</span>
              ) : (
                <PropertyPicker<number>
                  options={boardOptions}
                  value={boardId}
                  onChange={(id) => {
                    setBoardId(id);
                    setColumnId(null);
                  }}
                  placeholder={t("selectBoard")}
                  disabled={saving}
                  searchPlaceholder={tCommon("search")}
                  emptyText={tCommon("noResults")}
                  className="create-board-picker"
                />
              )}
            </PropertyRow>

            <PropertyRow className={ROW} label={t("create.status")}>
              {noColumns ? (
                <span className="text-xs text-muted-foreground" data-testid="create-no-columns">
                  {t("create.noColumns")}
                </span>
              ) : (
                <PropertyPicker<number>
                  options={columnOptions}
                  value={columnId}
                  onChange={setColumnId}
                  placeholder={t("selectColumn")}
                  disabled={saving || !boardId}
                  searchPlaceholder={tCommon("search")}
                  emptyText={tCommon("noResults")}
                  className="create-column-picker"
                />
              )}
            </PropertyRow>

            <PropertyRow className={ROW} label={t("priorityLabel")}>
              <PropertyPicker<TicketPriority>
                options={priorityOptions}
                value={priority}
                onChange={setPriority}
                renderPill={(o) => <PriorityPill priority={o.value} />}
                placeholder={t("priorityLabel")}
                disabled={saving}
                className="create-priority-picker"
              />
            </PropertyRow>

            <PropertyRow className={ROW} label={t("create.assignees")}>
              <div className="py-0.5" data-testid="create-assignees">
                <MultiUserAssignment
                  users={users}
                  selectedAssignments={assignments}
                  onChange={setAssignments}
                  disabled={saving}
                  placeholder={t("selectUsersPlaceholder")}
                  searchPlaceholder={t("searchUsers")}
                  noUsersFoundText={t("noUsersFound")}
                  noUsersAvailableText={t("noUsersAvailable")}
                />
              </div>
            </PropertyRow>

            {groupOptions.length > 0 && (
              <PropertyRow className={ROW} label={t("create.groups")}>
                <PropertyPicker<number>
                  multi
                  options={groupOptions}
                  value={groupIds}
                  onChange={setGroupIds}
                  placeholder={t("selectGroupsPlaceholder")}
                  disabled={saving}
                  searchPlaceholder={tCommon("search")}
                  emptyText={tCommon("noResults")}
                  className="create-groups-picker"
                />
              </PropertyRow>
            )}

            <PropertyRow className={ROW} label={t("labels")}>
              <div className="flex flex-wrap items-start gap-1">
                <div className="min-w-[120px] flex-1">
                  <PropertyPicker<number>
                    multi
                    options={tagOptions}
                    value={tagIds}
                    onChange={setTagIds}
                    placeholder={t("selectLabels")}
                    disabled={saving}
                    searchable
                    searchPlaceholder={tCommon("search")}
                    emptyText={t("noLabels")}
                    className="create-labels-picker"
                  />
                </div>
                <div className="shrink-0 [&_button]:h-[26px] [&_button]:border-transparent [&_button]:px-1.5 [&_button]:text-xs [&_button]:font-normal [&_button]:text-muted-foreground [&_button]:bg-transparent [&_button]:shadow-none dark:[&_button]:border-transparent dark:[&_button]:bg-transparent [&_button:hover]:bg-muted/40 [&_button:hover]:text-foreground">
                  <LabelManagementDialog />
                </div>
              </div>
            </PropertyRow>

            <PropertyRow className={ROW} label={t("create.dueDate")}>
              <div className="flex items-center gap-1">
                <DatePicker
                  id="create-ticket-due"
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder={t("create.noDueDate")}
                  disabled={saving}
                  className={cn(
                    "-ml-1.5 h-[26px] border-transparent bg-transparent px-1.5 text-xs normal-case shadow-none hover:border-border hover:bg-muted/40",
                    "dark:border-transparent dark:bg-transparent dark:hover:border-border dark:hover:bg-muted/40",
                    "[&_svg]:mr-1 [&_svg]:size-3.5",
                  )}
                />
                {dueDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground"
                    onClick={() => setDueDate("")}
                    aria-label={t("create.clearDate")}
                    title={t("create.clearDate")}
                    disabled={saving}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            </PropertyRow>

            {perms.hasSocialFeature && (
              <PropertyRow className={ROW} label={t("create.customer")}>
                <CustomerPicker value={customerId} onChange={setCustomerId} disabled={saving} />
              </PropertyRow>
            )}
          </div>

          <section className="grid gap-2">
            <SectionHeading label={t("description")} hint={t("create.optional")} />
            <RichTextEditor
              content={descriptionHtml}
              onChange={setDescriptionHtml}
              placeholder={t("create.descriptionPlaceholder")}
            />
          </section>

          <section className="grid gap-2">
            <SectionHeading label={t("attachments")} hint={t("create.optional")} />
            <FileDropzone
              onFilesSelected={(picked) =>
                setFiles((prev) => [
                  ...prev,
                  ...picked.map((file) => ({
                    file,
                    preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
                  })),
                ])
              }
              files={files}
              onRemoveFile={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
              maxFiles={10}
              maxSize={10 * 1024 * 1024}
              disabled={saving}
            />
          </section>

          {activeForms.length > 0 && (
            <section className="grid gap-3" data-testid="create-form-section">
              <SectionHeading label={t("create.form")} hint={t("create.optional")} />
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-md border px-2.5 py-1">
                  <PropertyPicker<number>
                    options={activeForms.map((f) => ({
                      value: f.id,
                      label: f.is_default ? `${f.title} (${t("create.defaultForm")})` : f.title,
                    }))}
                    value={formId}
                    onChange={(id) => {
                      setFormTouched(true);
                      setFormId(id);
                      setSelectedItems({});
                      setCustomValues({});
                    }}
                    placeholder={t("selectFormPlaceholder")}
                    disabled={saving}
                    className="create-form-picker ml-0 w-full"
                  />
                </div>
                {formId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => {
                      setFormTouched(true);
                      setFormId(null);
                      setSelectedItems({});
                      setCustomValues({});
                    }}
                    aria-label={t("create.clearForm")}
                    title={t("create.clearForm")}
                    disabled={saving}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>

              {form && listIds.length > 0 && (
                <div className="grid gap-3">
                  <span className="text-xs font-medium text-muted-foreground">{t("create.formItems")}</span>
                  {listsQuery.isLoading ? (
                    <div className="rounded-lg border p-3 text-center text-sm text-muted-foreground">
                      {tCommon("loading")}
                    </div>
                  ) : (
                    (listsQuery.data ?? []).map((list) => (
                      <ItemListField
                        key={list.id}
                        list={list}
                        value={selectedItems[list.id] ?? null}
                        onChange={(id) => setSelectedItems((prev) => ({ ...prev, [list.id]: id }))}
                        disabled={saving}
                      />
                    ))
                  )}
                </div>
              )}

              {fields.length > 0 && (
                <div className="grid gap-3">
                  <span className="text-xs font-medium text-muted-foreground">{t("customFields")}</span>
                  {fields.map((field, index) => (
                    <CustomFieldInput
                      key={field.name || index}
                      field={field}
                      value={customValues[field.name]}
                      onChange={(v) => setCustomValues((prev) => ({ ...prev, [field.name]: v }))}
                      disabled={saving}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex gap-2 border-t px-5 py-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onDone} disabled={saving}>
            {tCommon("cancel")}
          </Button>
          <Button ref={submitRef} type="submit" className="flex-1" disabled={!canSubmit} data-testid="create-submit">
            {saving ? <Spinner className="size-4" /> : <Plus className="size-4" />}
            {saving ? t("create.creating") : t("create.submit")}
          </Button>
        </div>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------------

function SectionHeading({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground/70">({hint})</span>}
    </div>
  );
}

/** Client search (server-side) for the customer row; shows the linked client as a pill. */
function CustomerPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("tickets");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState<SocialClientList | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const filters = { search: debounced || undefined, page_size: 20 };
  const list = useQuery({
    queryKey: socialClientKeys.list(filters),
    queryFn: async () => (await axios.get<{ results: SocialClientList[] }>("/api/social/clients/", { params: filters })).data,
    enabled: open,
    staleTime: 30_000,
  });
  const detail = useQuery({
    queryKey: socialClientKeys.detail(value ?? 0),
    queryFn: async () => (await axios.get<SocialClientList>(`/api/social/clients/${value}/`)).data,
    enabled: !!value && picked?.id !== value,
    staleTime: 60_000,
  });
  const current = value ? (picked?.id === value ? picked : detail.data ?? null) : null;
  const label = clientName(current) || (value ? `#${value}` : "");

  return (
    <div className="flex items-center gap-1" data-testid="create-customer">
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            data-slot="property-picker-trigger"
            className={cn(
              "-ml-1.5 flex min-h-[26px] min-w-0 flex-1 items-center gap-1 rounded-md border px-1.5 py-0.5 text-left",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              open ? "border-ring bg-accent" : "border-transparent hover:border-border hover:bg-muted/40",
            )}
          >
            {value ? (
              <PropertyPill label={label} />
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <UserRound aria-hidden="true" className="size-3.5" />
                {t("create.customerPlaceholder")}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-[min(320px,calc(100vw-32px))] rounded-lg p-1 shadow-popover-lg">
          <Command shouldFilter={false} className="bg-transparent">
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={t("create.customerSearch")}
              className="h-8 py-1 text-[13px]"
            />
            <CommandList className="max-h-[260px]">
              {list.isLoading ? (
                <div className="flex justify-center py-3">
                  <Spinner className="size-4" />
                </div>
              ) : (
                <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                  {t("create.noClients")}
                </CommandEmpty>
              )}
              <CommandGroup>
                {(list.data?.results ?? []).map((c) => (
                  <CommandItem
                    key={c.id}
                    value={String(c.id)}
                    onSelect={() => {
                      setPicked(c);
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className="h-auto min-h-[30px] gap-2 rounded-md px-2 py-1 text-[13px]"
                  >
                    <span className="min-w-0 flex-1 truncate">{clientName(c)}</span>
                    {(c.phone || c.email) && (
                      <span className="shrink-0 truncate text-xs text-muted-foreground tabular-nums">{c.phone || c.email}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground"
          onClick={() => {
            setPicked(null);
            onChange(null);
          }}
          aria-label={t("create.removeCustomer")}
          title={t("create.removeCustomer")}
          disabled={disabled}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

function ItemListField({
  list,
  value,
  onChange,
  disabled,
}: {
  list: ItemList;
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("tickets");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const items = useMemo(() => flattenItems(listRootItems(list as never)), [list]);
  const selected = items.find((i) => i.id === value);
  const inputId = `create-list-${list.id}`;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId} className="text-[13px] font-medium">
        {list.title}
        {list.description && <span className="ml-2 text-xs font-normal text-muted-foreground">{list.description}</span>}
      </Label>
      {items.length === 0 ? (
        <div className="rounded-lg border p-3 text-sm italic text-muted-foreground">{t("noItemsInList")}</div>
      ) : (
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={inputId}
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                disabled={disabled}
                className="h-8 w-full justify-between text-[13px] font-normal"
              >
                {selected ? (
                  <span className="flex items-center gap-2 truncate">
                    {selected.level > 0 && <span className="text-muted-foreground">{"→ ".repeat(selected.level)}</span>}
                    <span className="truncate">{selected.label}</span>
                    {selected.custom_id && (
                      <Badge variant="outline" className="text-xs">
                        {selected.custom_id}
                      </Badge>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("selectItem")}</span>
                )}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder={tCommon("search")} />
                <CommandList>
                  <CommandEmpty>{tCommon("noResults")}</CommandEmpty>
                  <CommandGroup>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.label} ${item.custom_id ?? ""} ${item.id}`}
                        onSelect={() => {
                          onChange(item.id);
                          setOpen(false);
                        }}
                      >
                        {item.level > 0 && <span className="mr-1 text-muted-foreground">{"→ ".repeat(item.level)}</span>}
                        <span className="flex-1">{item.label}</span>
                        {item.custom_id && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {item.custom_id}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {value != null && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => onChange(null)}
              aria-label={t("clearSelection")}
              title={t("clearSelection")}
              disabled={disabled}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: CustomField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const id = `create-field-${field.name}`;
  const str = value == null ? "" : String(value);
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium">
        {field.label}
        {field.required && (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        )}
      </Label>
      {field.type === "string" && (
        <Input id={id} value={str} required={field.required} disabled={disabled} placeholder={field.label} className="h-8 text-[13px]" onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "text" && (
        <Textarea id={id} value={str} required={field.required} disabled={disabled} rows={3} placeholder={field.label} className="text-[13px]" onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "number" && (
        <Input
          id={id}
          type="number"
          value={str}
          required={field.required}
          disabled={disabled}
          placeholder={field.label}
          className="h-8 text-[13px]"
          onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
        />
      )}
      {field.type === "date" && (
        <DatePicker id={id} value={str} onChange={onChange} disabled={disabled} className="h-8 w-full text-[13px]" />
      )}
      {field.type === "signature" && <SignatureCanvas onSignatureChange={onChange} required={field.required} />}
    </div>
  );
}
