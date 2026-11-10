"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { ErrorBlock, LoadingBlock } from "@/components/redesign/states";
import { EmptyState } from "@/app/(tenant)/tickets/_components/primitives/empty-state";
import { ListActionButton, type SettingsListAction } from "@/components/redesign/settings";
import { cn } from "@/lib/utils";

/**
 * Building blocks of the PBX settings tabs (ST-03). The PBX layout owns the
 * page header (design FORM/LIST page header) and the tab row; every tab then
 * renders blocks: a block header (title · description + primary action) and a
 * design LIST table, a stats panel or form sections.
 */

export interface PbxTab {
  id: string;
  href: string;
  label: string;
  active: boolean;
}

/** Link tabs styled as the design's 28px segment (scrolls sideways on phones). */
export function PbxTabs({ tabs, ariaLabel }: { tabs: PbxTab[]; ariaLabel: string }) {
  const navRef = useRef<HTMLElement>(null);
  const activeId = tabs.find((tab) => tab.active)?.id;
  // Phones: keep the active tab in view inside the scrolling segment.
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !el) return;
    const left = el.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + el.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = left - 8;
    }
  }, [activeId]);
  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      data-testid="pbx-tabs"
      className="flex h-[30px] max-w-full shrink-0 gap-0.5 self-start overflow-x-auto rounded-[7px] bg-muted p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          data-state={tab.active ? "on" : "off"}
          className={cn(
            "inline-flex h-[26px] shrink-0 items-center justify-center whitespace-nowrap rounded-[5px] px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab.active
              ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Header of a block inside a PBX tab: 15px title, 12px description, action on the right. */
export function PbxBlockHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start gap-x-4 gap-y-2", className)}>
      <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
        <h3 className="text-[15px] font-semibold leading-5 tracking-[-0.01em]">{title}</h3>
        {description && <p className="text-xs leading-[17px] text-muted-foreground [text-wrap:pretty]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Translated error / loading blocks for the PBX tabs. */
export function usePbxStates() {
  const t = useTranslations("pbxSettings.ui");
  const labels = {
    errorTitle: t("errorTitle"),
    errorHint: t("errorHint"),
    noAccessTitle: t("noAccessTitle"),
    noAccessHint: t("noAccessHint"),
    retry: t("retry"),
  };
  return {
    loadingLabel: t("loading"),
    renderError: (error: unknown, onRetry?: () => void) => <ErrorBlock error={error} onRetry={onRetry} labels={labels} />,
    loading: <LoadingBlock label={t("loading")} />,
  };
}

/** Empty state of a PBX list (the old one-line "No trunks yet…" text, centered). */
export function PbxEmpty({ icon, text, testId }: { icon: LucideIcon; text: string; testId?: string }) {
  return (
    <div data-testid={testId} className="contents">
      <EmptyState icon={icon} title={text} className="py-10" />
    </div>
  );
}

/**
 * Design LIST block: block header with the "New" button, the bordered table
 * (36px header, 48px rows, row click edits) and "N · click a row to edit".
 */
export function PbxListBlock<T>({
  title,
  description,
  newAction,
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  empty,
  countLabel,
  ariaLabel,
  idPrefix,
  children,
}: {
  title: string;
  description?: ReactNode;
  newAction?: SettingsListAction | null;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  countLabel?: ReactNode;
  ariaLabel: string;
  idPrefix: string;
  children?: ReactNode;
}) {
  const { renderError } = usePbxStates();
  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid={`${idPrefix}-block`}>
      <PbxBlockHeader
        title={title}
        description={description}
        action={newAction ? <ListActionButton action={newAction} /> : undefined}
      />
      <DataTable
        variant="card"
        density="comfortable"
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        onRowClick={onRowClick}
        loading={loading}
        renderError={renderError}
        empty={empty}
        ariaLabel={ariaLabel}
        idPrefix={idPrefix}
        skeletonRows={3}
      />
      {countLabel && rows && rows.length > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums" data-testid={`${idPrefix}-count`}>
          {countLabel}
        </span>
      )}
      {children}
    </div>
  );
}

/** 28px ghost icon button of a table row (never opens the row). */
export function RowIconButton({
  icon: Icon,
  label,
  onClick,
  tone = "default",
  disabled,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-testid={testId}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        tone === "danger"
          ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** Dialog form field: 13px label, control, 12px help (design dialog restyle). */
export function DialogField({
  label,
  htmlFor,
  help,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-[13px] font-medium">
          {label}
        </label>
      ) : (
        <span className="text-[13px] font-medium">{label}</span>
      )}
      {children}
      {help && <p className="text-xs leading-[17px] text-muted-foreground">{help}</p>}
    </div>
  );
}

/** Dialog switch row: label + help left, switch right. */
export function DialogSwitchRow({
  label,
  htmlFor,
  help,
  control,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  control: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={htmlFor} className="text-[13px] font-medium">
          {label}
        </label>
        {help && <span className="text-xs leading-[17px] text-muted-foreground">{help}</span>}
      </div>
      {control}
    </div>
  );
}

/** 34px inputs / select triggers inside the restyled dialogs. */
export const dialogInputClass = "h-[34px] text-[13px]";
