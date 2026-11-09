"use client"

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AttributeDefinition } from "@/api/generated"
import {
  ActivePill,
  IdText,
  TonePill,
  humanize,
  localizedText,
  rdButton,
  type EcColumn,
} from "@/app/(tenant)/ecommerce/_components/ui"
import type { SortState, SortValue } from "../../products/_lib/table-kit"
import { SortHeader } from "../../products/_components/table-kit"

type T = ((key: string, values?: Record<string, string | number>) => string) & { has?: (key: string) => boolean }

/** The attribute's name in the UI language (then English, then any), else its key. */
export function attributeName(attribute: Pick<AttributeDefinition, "name" | "key">, locale: string): string {
  return localizedText(attribute.name as Parameters<typeof localizedText>[0], locale) || attribute.key || "—"
}

export function optionCount(attribute: Pick<AttributeDefinition, "options">): number {
  return Array.isArray(attribute.options) ? attribute.options.length : 0
}

/**
 * Search used by the toolbar: the name in any language or the key
 * (case-insensitive), as the placeholder says.
 */
export function matchesAttribute(attribute: Pick<AttributeDefinition, "name" | "key">, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const name = attribute.name as unknown
  const names = name && typeof name === "object" ? Object.values(name as Record<string, string>) : [String(name ?? "")]
  return [...names, attribute.key ?? ""].some((text) => String(text ?? "").toLowerCase().includes(q))
}

export const HIDEABLE_ATTRIBUTE_COLUMNS = ["type", "options", "flags", "status"] as const

export function attributeSortAccessors(locale: string): Record<string, (a: AttributeDefinition) => SortValue> {
  return {
    name: (a) => attributeName(a, locale),
    type: (a) => String(a.attribute_type ?? ""),
    options: (a) => optionCount(a),
    status: (a) => !!a.is_active,
  }
}

export function getAttributeColumns({
  t,
  tc,
  moreLabel,
  locale,
  sort,
  onSortChange,
  onEdit,
  onDelete,
  hidden,
}: {
  /** `productAttributes` namespace. */
  t: T
  /** `common` namespace. */
  tc: (key: string) => string
  /** "More actions" (ecommerceUi). */
  moreLabel: string
  locale: string
  sort: SortState | null
  onSortChange: (sort: SortState | null) => void
  onEdit: (attribute: AttributeDefinition) => void
  onDelete: (attribute: AttributeDefinition) => void
  hidden: ReadonlySet<string>
}): EcColumn<AttributeDefinition>[] {
  const header = (id: string, label: string, align: "start" | "end" = "start") => (
    <SortHeader id={id} label={label} sort={sort} onSortChange={onSortChange} align={align} />
  )
  const typeLabel = (type: string) => (t.has?.(`types.${type}`) ? t(`types.${type}`) : humanize(type))
  const columns: EcColumn<AttributeDefinition>[] = [
    {
      id: "name",
      header: header("name", t("table.name")),
      width: "minmax(0,2fr)",
      mobile: "title",
      cell: (a) => (
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="truncate font-medium">{attributeName(a, locale)}</span>
          <IdText className="hidden text-[11px] text-muted-foreground @3xl:inline">{a.key}</IdText>
        </span>
      ),
    },
    {
      id: "type",
      header: header("type", t("table.type")),
      width: "minmax(0,1fr)",
      mobile: "meta",
      cell: (a) => <TonePill tone="neutral">{typeLabel(String(a.attribute_type))}</TonePill>,
    },
    {
      id: "options",
      header: header("options", t("options"), "end"),
      width: "104px",
      align: "end",
      mobile: "meta",
      cell: (a) =>
        String(a.attribute_type) === "number" ? (
          <span className="text-muted-foreground">{a.unit || "—"}</span>
        ) : (
          <span className="tabular-nums">
            <span className="@3xl:hidden">{t("optionsCount", { count: optionCount(a) })}</span>
            <span className="hidden @3xl:inline">{optionCount(a)}</span>
          </span>
        ),
    },
    {
      id: "flags",
      header: t("properties"),
      width: "minmax(0,1.2fr)",
      mobile: "meta",
      cell: (a) =>
        a.is_required || a.is_filterable ? (
          <span className="flex min-w-0 flex-wrap gap-1">
            {a.is_required && <TonePill tone="warning">{t("required")}</TonePill>}
            {a.is_filterable && <TonePill tone="info">{t("filterable")}</TonePill>}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      header: header("status", t("table.status")),
      width: "104px",
      mobile: "meta",
      cell: (a) => <ActivePill active={a.is_active} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">{t("table.actions")}</span>,
      width: "36px",
      align: "end",
      mobile: "end",
      cell: (a) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={rdButton.ghostIconSm}
              aria-label={`${moreLabel}: ${attributeName(a, locale)}`}
              title={moreLabel}
              data-testid="ec-attribute-actions"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            // Portaled, but React still bubbles its clicks to the row, which
            // would open the edit sheet on top of the chosen action.
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem className="text-[13px]" onClick={() => onEdit(a)}>
              <Pencil className="me-2 h-3.5 w-3.5" aria-hidden />
              {tc("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[13px] text-destructive focus:text-destructive"
              onClick={() => onDelete(a)}
              data-testid="ec-attribute-delete"
            >
              <Trash2 className="me-2 h-3.5 w-3.5" aria-hidden />
              {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
  return columns.filter((c) => !hidden.has(c.id))
}
