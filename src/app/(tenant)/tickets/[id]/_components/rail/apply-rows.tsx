"use client";

/**
 * Multi-select rows with an Apply step (FE-12): Labels and Groups.
 *
 * The popover edits a draft; Apply sends it and closes, closing without
 * Apply drops it (the Apply step of today's sidebar is kept, W81).
 *
 * - Labels: every tag (all pages) → `tag_ids`. The footer also has
 *   "Manage labels…", which opens `LabelManagementDialog` (create, edit,
 *   delete; the duplicate-name 400 is shown there). Editing needs `can_edit`.
 * - Groups: every tenant group → `assigned_group_ids`. Only rendered when
 *   `can_change_groups` (staff, WS10).
 */
import { useMemo, useState, type ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LabelManagementDialog } from "@/components/LabelManagementDialog";
import { PropertyPicker, type PickerOption } from "../../../_components/primitives/property-picker";
import { PropertyRow } from "../../../_components/primitives/property-row";
import { useTicketPickers } from "../../../_hooks/use-ticket-pickers";
import type { TicketDetail, ViewerPermissions } from "../../../_lib/types";
import { useEditingPresence, useRailPatch, RailLabel } from "./rail-shared";

interface ApplyPickerProps {
  options: PickerOption<number>[];
  value: number[];
  onApply: (ids: number[]) => void;
  placeholder: string;
  disabled: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Extra footer content left of Apply. */
  extra?: (close: () => void) => ReactNode;
  testId: string;
}

/** Stable empty fallback so the `useMemo` deps don't change every render. */
const EMPTY: never[] = [];

function sameSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

export function ApplyPicker({ options, value, onApply, placeholder, disabled, onOpenChange, extra, testId }: ApplyPickerProps) {
  const t = useTranslations("ticketsScreen.rail");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>(value);

  const change = (next: boolean) => {
    if (next) setDraft(value);
    setOpen(next);
    onOpenChange?.(next);
  };
  const close = () => change(false);

  return (
    <PropertyPicker<number>
      multi
      options={options}
      // Closed: the saved value. Open: the draft.
      value={open ? draft : value}
      onChange={(next) => setDraft(next)}
      open={open}
      onOpenChange={change}
      placeholder={placeholder}
      disabled={disabled}
      searchable
      searchPlaceholder={t("search")}
      emptyText={t("noResults")}
      selectedLabel={t("selected")}
      footer={
        <div
          className="flex flex-col gap-1 pb-0.5"
          data-testid={`${testId}-footer`}
          // cmdk handles Enter and arrows on the Command root; keep them on these buttons.
          onKeyDown={(e) => e.stopPropagation()}
        >
          {extra?.(close)}
          <Button
            type="button"
            size="sm"
            className="h-7 w-full px-2.5 text-xs"
            data-testid={`${testId}-apply`}
            onClick={() => {
              if (!sameSet(draft, value)) onApply(draft);
              close();
            }}
          >
            {t("apply")}
          </Button>
        </div>
      }
    />
  );
}

export function LabelsRow({ ticket, perms }: { ticket: TicketDetail; perms: ViewerPermissions }) {
  const t = useTranslations("ticketsScreen.rail");
  const { patch } = useRailPatch(ticket.id);
  const presence = useEditingPresence(ticket.id, "labels");
  const [manageOpen, setManageOpen] = useState(false);
  const { tags } = useTicketPickers(ticket.board?.id ?? null, { enabled: perms.can_edit });
  // Guarded like `assigned_groups` below: a partial realtime/optimistic
  // ticket may arrive without the array.
  const ticketTags = ticket.tags ?? EMPTY;

  const options: PickerOption<number>[] = useMemo(() => {
    const out: PickerOption<number>[] = tags.map((tag) => ({ value: tag.id, label: tag.name, color: tag.color || null }));
    for (const tag of ticketTags) {
      if (!out.some((o) => o.value === tag.id)) out.unshift({ value: tag.id, label: tag.name, color: tag.color || null });
    }
    return out;
  }, [tags, ticketTags]);

  return (
    <PropertyRow label={<RailLabel>{t("labels")}</RailLabel>}>
      <ApplyPicker
        testId="labels-picker"
        options={options}
        value={ticketTags.map((tag) => tag.id)}
        onApply={(ids) => {
          const next = ids
            .map((id) => {
              const tag = tags.find((x) => x.id === id) ?? ticketTags.find((x) => x.id === id);
              return tag ? { id: tag.id, name: tag.name, color: tag.color ?? "" } : null;
            })
            .filter((x): x is TicketDetail["tags"][number] => x !== null);
          patch({ tag_ids: ids }, (prev) => ({ ...prev, tags: next }));
        }}
        placeholder={t("none")}
        disabled={!perms.can_edit}
        onOpenChange={presence}
        extra={(close) => (
          <button
            type="button"
            data-testid="manage-labels"
            className="flex h-[30px] w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              close();
              setManageOpen(true);
            }}
          >
            <Settings2 aria-hidden="true" size={14} className="shrink-0" />
            <span className="truncate">{t("manageLabels")}</span>
          </button>
        )}
      />
      <LabelManagementDialog open={manageOpen} onOpenChange={setManageOpen} hideTrigger />
    </PropertyRow>
  );
}

export function GroupsRow({ ticket, perms }: { ticket: TicketDetail; perms: ViewerPermissions }) {
  const t = useTranslations("ticketsScreen.rail");
  const { patch } = useRailPatch(ticket.id);
  const presence = useEditingPresence(ticket.id, "groups");
  const { groups } = useTicketPickers(ticket.board?.id ?? null, { enabled: perms.can_change_groups });
  // `assigned_groups` is typed as required but the detail payload can omit
  // it (older serializers, partial realtime patches) — Sentry 1Q
  // "ticket.assigned_groups is not iterable".
  const assignedGroups = ticket.assigned_groups ?? EMPTY;

  const options: PickerOption<number>[] = useMemo(() => {
    const out: PickerOption<number>[] = groups.map((g) => ({ value: g.id, label: g.name }));
    for (const g of assignedGroups) {
      if (!out.some((o) => o.value === g.id)) out.unshift({ value: g.id, label: g.name });
    }
    return out;
  }, [groups, assignedGroups]);

  if (!perms.can_change_groups) return null;

  return (
    <PropertyRow label={<RailLabel>{t("groups")}</RailLabel>}>
      <ApplyPicker
        testId="groups-picker"
        options={options}
        value={assignedGroups.map((g) => g.id)}
        onApply={(ids) => {
          const next = ids
            .map((id) => {
              const g = groups.find((x) => x.id === id) ?? assignedGroups.find((x) => x.id === id);
              return g ? { id: g.id, name: g.name, description: g.description ?? "" } : null;
            })
            .filter((x): x is TicketDetail["assigned_groups"][number] => x !== null);
          patch({ assigned_group_ids: ids }, (prev) => ({ ...prev, assigned_groups: next }));
        }}
        placeholder={t("none")}
        disabled={false}
        onOpenChange={presence}
      />
    </PropertyRow>
  );
}
