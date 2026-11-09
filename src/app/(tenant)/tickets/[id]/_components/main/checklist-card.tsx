"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { DragDropContext, Draggable, Droppable, type DraggableProvidedDragHandleProps, type DropResult } from "@hello-pangea/dnd";
import { Check, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CollapsibleCard } from "../../../_components/primitives/collapsible-card";
import { formatDateTime } from "../../../_lib/format";
import type { TicketChecklistItem } from "../../../_lib/types";
import { checklistProgress, sortChecklist } from "./main-utils";
import { useChecklistMutations } from "./use-main-mutations";

export interface ChecklistCardProps {
  ticketId: number;
  items: TicketChecklistItem[] | null | undefined;
}

/**
 * Checklist card (D130–D139), open by default.
 *
 * Header: "Checklist", n/m and a `--green` progress bar (max-width 160, 4px,
 * a .2s width transition). Rows are 32px: a 16px checkbox (primary when
 * done), the text (13px; struck through and muted when done; double-click to
 * edit inline) and a remove button. Remove has no confirm: the toast offers
 * Undo. The add row at the end adds on Enter and clears. Rows drag to
 * reorder (@hello-pangea/dnd: mouse, touch and keyboard).
 *
 * Every viewer of the ticket may change the checklist: the server only checks
 * that the ticket is visible (A11), as the old detail did.
 */
export function ChecklistCard({ ticketId, items }: ChecklistCardProps) {
  const t = useTranslations("ticketsScreen.checklist");
  const sorted = sortChecklist(items);
  const { done, total, percent } = checklistProgress(sorted);
  const m = useChecklistMutations(ticketId);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    void m.reorder(result.source.index, result.destination.index);
  };

  const summary = (
    <>
      {total > 0 && <span data-slot="checklist-summary">{t("summary", { done, total })}</span>}
      {total > 0 && (
        <span
          data-slot="checklist-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={t("progress", { done, total })}
          className="ml-1.5 block h-1 max-w-[160px] flex-1 overflow-hidden rounded-full bg-muted"
        >
          <span
            data-slot="checklist-progress-bar"
            className="block h-full rounded-full bg-green transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </span>
      )}
    </>
  );

  return (
    <CollapsibleCard title={t("title")} summary={summary} defaultOpen bodyClassName="flex flex-col gap-0.5">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={`checklist-${ticketId}`}>
          {(drop) => (
            <div ref={drop.innerRef} {...drop.droppableProps} data-slot="checklist-items" className="flex flex-col gap-0.5">
              {sorted.map((item, index) => (
                <Draggable key={item.id} draggableId={`checklist-item-${item.id}`} index={index}>
                  {(drag, snapshot) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className={cn(
                        "rounded-md",
                        snapshot.isDragging && "bg-card shadow-md ring-1 ring-border",
                      )}
                    >
                      <ChecklistRow
                        item={item}
                        dragHandleProps={drag.dragHandleProps}
                        onToggle={() => void m.toggle(item)}
                        onRename={(text) => void m.rename(item, text)}
                        onRemove={() => void m.remove(item)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {drop.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <AddRow onAdd={(text) => void m.add(text)} />
    </CollapsibleCard>
  );
}

function ChecklistRow({
  item,
  dragHandleProps,
  onToggle,
  onRename,
  onRemove,
}: {
  item: TicketChecklistItem;
  /** The text is the drag handle (mouse, touch, and Space + arrows from the keyboard). */
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  onToggle: () => void;
  onRename: (text: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("ticketsScreen.checklist");
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const checkedBy =
    item.is_checked && item.checked_by
      ? t("checkedBy", {
          name: item.checked_by.name,
          time: item.checked_at ? formatDateTime(item.checked_at, locale) : "",
        }).replace(/ · $/, "")
      : undefined;

  const finish = (save: boolean) => {
    setEditing(false);
    if (save) onRename(draft);
    else setDraft(item.text);
  };

  return (
    <div
      data-slot="checklist-row"
      data-checked={item.is_checked || undefined}
      title={checkedBy}
      className="group flex h-8 items-center gap-2.5 rounded-md px-1.5 hover:bg-muted/40"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.is_checked}
        aria-label={t("toggle", { text: item.text })}
        onClick={onToggle}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border text-primary-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          item.is_checked ? "border-primary bg-primary" : "border-input bg-transparent",
        )}
      >
        {item.is_checked && <Check aria-hidden="true" size={12} strokeWidth={3} />}
      </button>
      {editing ? (
        <input
          autoFocus
          aria-label={t("editItem")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => finish(true)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") finish(true);
            if (e.key === "Escape") finish(false);
          }}
          className="h-7 min-w-0 flex-1 rounded-sm bg-transparent text-[13px] leading-5 outline-none ring-1 ring-border focus:ring-ring"
        />
      ) : (
        <span
          {...(dragHandleProps ?? {})}
          data-slot="checklist-text"
          onDoubleClick={() => {
            setDraft(item.text);
            setEditing(true);
          }}
          className={cn(
            "min-w-0 flex-1 cursor-grab truncate rounded-sm text-[13px] leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            item.is_checked ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {item.text}
        </span>
      )}
      <button
        type="button"
        aria-label={t("remove")}
        title={t("remove")}
        onClick={onRemove}
        className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden="true" size={13} />
      </button>
    </div>
  );
}

function AddRow({ onAdd }: { onAdd: (text: string) => void }) {
  const t = useTranslations("ticketsScreen.checklist");
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!value.trim()) return;
      onAdd(value);
      setValue("");
    } else if (e.key === "Escape") {
      setValue("");
      ref.current?.blur();
    }
  };
  return (
    <div data-slot="checklist-add" className="flex h-8 items-center gap-2.5 px-1.5">
      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-dashed border-muted-foreground/50 text-muted-foreground"
      >
        <Plus size={11} />
      </span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("addPlaceholder")}
        aria-label={t("addPlaceholder")}
        className="h-7 min-w-0 flex-1 bg-transparent text-[13px] leading-5 outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
