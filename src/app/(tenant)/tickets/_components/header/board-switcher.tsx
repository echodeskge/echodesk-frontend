"use client";

/**
 * Board switcher for the app header breadcrumb ("Boards" / switcher, D18–D33).
 *
 * Rendered in the tenant layout's header slot, outside the tickets route
 * providers, so everything (labels included) comes in as props and only plain
 * React hooks are used.
 *
 * - Trigger: 8px dot, name 13/600, ChevronDown 14; `accent` while open; −4px
 *   left margin after the "/" separator (D20–21).
 * - Menu (desktop): 260px, large popover shadow, one 32px row per board (dot,
 *   name, open count), a divider, then New board / Edit columns / Manage users /
 *   Board settings…, each only when its handler is given (permission gating
 *   happens in the bridge).
 * - Below `sm` the same content is a bottom Sheet (DC40).
 *
 * The design's `accent` fills use `muted` here: same colour in light mode, but
 * ThemeContext keeps `--accent` light in dark mode (with a light foreground),
 * which made accent rows unreadable there. `ROW_HIGHLIGHT` also overrides the
 * shadcn item focus fill for the same reason.
 */
import { useState, type ReactNode } from "react";
import { ChevronDown, Plus, Settings, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ColorDot } from "../primitives/color-dot";
import { BELOW_SM, useMediaQuery } from "./use-media-query";

/** Focus/hover fill for menu rows (see the note above on `accent` in dark mode). */
export const ROW_HIGHLIGHT = "focus:bg-muted focus:text-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground";

export interface SwitcherBoard {
  id: number;
  name: string;
  color?: string | null;
  open_count?: number | null;
}

export interface BoardSwitcherLabels {
  /** Accessible name of the trigger ("Switch board"). */
  switchBoard: string;
  /** Screen-reader marker for the current board row. */
  current: string;
  newBoard: string;
  editColumns: string;
  manageUsers: string;
  boardSettings: string;
}

export interface BoardSwitcherProps {
  boards: SwitcherBoard[];
  currentId: number | null;
  onSelect: (id: number) => void;
  labels: BoardSwitcherLabels;
  /** Each action shows only when its handler is given. */
  onNewBoard?: () => void;
  onEditColumns?: () => void;
  onManageUsers?: () => void;
  onBoardSettings?: () => void;
  /** Forces the Sheet (tests); defaults to the `sm` media query. */
  forceSheet?: boolean;
}

interface Action {
  key: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

export function BoardSwitcher({
  boards,
  currentId,
  onSelect,
  labels,
  onNewBoard,
  onEditColumns,
  onManageUsers,
  onBoardSettings,
  forceSheet,
}: BoardSwitcherProps) {
  const [open, setOpen] = useState(false);
  const belowSm = useMediaQuery(BELOW_SM);
  const asSheet = forceSheet ?? belowSm;
  const current = boards.find((b) => b.id === currentId) ?? null;

  const actions: Action[] = [
    onNewBoard && { key: "new", label: labels.newBoard, icon: Plus, run: onNewBoard },
    onEditColumns && { key: "columns", label: labels.editColumns, icon: Settings, run: onEditColumns },
    onManageUsers && { key: "users", label: labels.manageUsers, icon: Users, run: onManageUsers },
    onBoardSettings && { key: "settings", label: labels.boardSettings, icon: SlidersHorizontal, run: onBoardSettings },
  ].filter(Boolean) as Action[];

  const trigger = (
    <button
      type="button"
      aria-label={labels.switchBoard}
      aria-haspopup={asSheet ? "dialog" : "menu"}
      aria-expanded={open}
      data-testid="board-switcher"
      data-state={open ? "open" : "closed"}
      onClick={asSheet ? () => setOpen(true) : undefined}
      className={cn(
        "-ml-1 inline-flex h-7 min-w-0 max-w-[50vw] cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted sm:max-w-[320px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        open && "bg-muted",
      )}
    >
      <ColorDot color={current?.color} size={8} />
      <span className="truncate">{current?.name ?? ""}</span>
      <ChevronDown aria-hidden="true" size={14} className="shrink-0 text-muted-foreground" />
    </button>
  );

  const pick = (id: number) => {
    setOpen(false);
    if (id !== currentId) onSelect(id);
  };
  const run = (action: Action) => {
    setOpen(false);
    action.run();
  };

  if (asSheet) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[80vh] gap-0 rounded-t-xl p-0 pb-[env(safe-area-inset-bottom)]" data-testid="board-switcher-sheet">
            <SheetTitle className="px-4 pb-2 pt-4 text-sm">{labels.switchBoard}</SheetTitle>
            <SheetDescription className="sr-only">{labels.switchBoard}</SheetDescription>
            <div className="flex min-h-0 flex-col overflow-y-auto px-2 pb-3" role="list">
              {boards.map((b) => (
                <SheetRow key={b.id} selected={b.id === currentId} onClick={() => pick(b.id)} currentLabel={labels.current}>
                  <BoardRowContent board={b} />
                </SheetRow>
              ))}
              {actions.length > 0 && <div className="-mx-2 my-1 h-px bg-border" />}
              {actions.map((a) => (
                <SheetRow key={a.key} onClick={() => run(a)}>
                  <a.icon aria-hidden="true" size={14} className="text-muted-foreground" />
                  <span className="truncate">{a.label}</span>
                </SheetRow>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="w-[260px] p-1 shadow-popover-lg"
        data-testid="board-switcher-menu"
      >
        {boards.map((b) => {
          const selected = b.id === currentId;
          return (
            <DropdownMenuItem
              key={b.id}
              onSelect={() => pick(b.id)}
              aria-current={selected ? "true" : undefined}
              data-selected={selected ? "true" : "false"}
              className={cn("h-8 gap-2 px-2 text-[13px]", ROW_HIGHLIGHT, selected && "bg-muted font-medium")}
            >
              <BoardRowContent board={b} />
              {selected && <span className="sr-only">{labels.current}</span>}
            </DropdownMenuItem>
          );
        })}
        {actions.length > 0 && <DropdownMenuSeparator />}
        {actions.map((a) => (
          <DropdownMenuItem key={a.key} onSelect={() => run(a)} className={cn("h-8 gap-2 px-2 text-[13px]", ROW_HIGHLIGHT)} data-action={a.key}>
            <a.icon aria-hidden="true" size={14} className="text-muted-foreground" />
            <span className="truncate">{a.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BoardRowContent({ board }: { board: SwitcherBoard }) {
  return (
    <>
      <ColorDot color={board.color} size={8} />
      <span className="min-w-0 flex-1 truncate">{board.name}</span>
      {typeof board.open_count === "number" && (
        <span className="text-xs tabular-nums text-muted-foreground">{board.open_count}</span>
      )}
    </>
  );
}

function SheetRow({
  children,
  onClick,
  selected,
  currentLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  selected?: boolean;
  currentLabel?: string;
}) {
  return (
    <button
      type="button"
      role="listitem"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      data-selected={selected ? "true" : "false"}
      className={cn(
        "flex h-10 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted",
        selected && "bg-muted font-medium",
      )}
    >
      {children}
      {selected && currentLabel && <span className="sr-only">{currentLabel}</span>}
    </button>
  );
}
