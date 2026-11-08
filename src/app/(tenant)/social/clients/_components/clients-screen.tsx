"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Search, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { useHeaderActions } from "@/contexts/HeaderActionsContext";
import { useSocialClientCustomFields, useSocialClients } from "@/hooks/api/useSocialClients";
import { useMyAccess } from "@/hooks/useMyAccess";
import { cn } from "@/lib/utils";

import { ClientDetailRail, type ChatLink } from "./client-detail-rail";
import { ClientFormDialog, type EditableClient } from "./client-form-dialog";
import {
  CLIENT_PLATFORMS,
  CLIENT_PLATFORM_BG,
  CLIENT_PLATFORM_BRAND,
  CLIENT_PLATFORM_ICON,
  clientInitials,
  clientPageStats,
  clientPlatforms,
  clientTags,
  pageRange,
  shortDate,
  type ClientPlatform,
  type ClientTab,
} from "./clients-utils";

export const CLIENTS_PAGE_SIZE = 50;

/** Row shape we read from `/api/social/clients/` (list serializer). */
export interface ClientRow {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  tags?: unknown;
  profile_picture?: string | null;
  platforms?: unknown;
  social_accounts?: ChatLink[];
  social_accounts_count?: number | null;
  is_booking_enabled?: boolean | null;
  is_verified?: boolean | null;
  booking_count?: number | null;
  created_at?: string | null;
}

const GRID = "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_150px_110px_110px_90px] items-center";

/** Puts the "Create client" CTA into the app header (design: simple page header + primary). */
function ClientsHeaderBridge({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations("socialClients");
  const label = t("createClient");
  useHeaderActions(
    {
      primary: (
        <button
          type="button"
          onClick={onCreate}
          aria-label={label}
          data-testid="clients-create"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ),
    },
    [label]
  );
  return null;
}

function PlatformDot({ platform }: { platform: ClientPlatform }) {
  const Icon = CLIENT_PLATFORM_ICON[platform];
  return (
    <span
      className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-full text-white", CLIENT_PLATFORM_BG[platform])}
      aria-hidden
    >
      <Icon className="h-[9px] w-[9px]" strokeWidth={2.5} />
    </span>
  );
}

/** The redesigned Clients screen: stats strip, toolbar, table and the detail rail. */
export function ClientsScreen() {
  const t = useTranslations("socialClients");
  const ts = useTranslations("socialClients.screen");
  const { canManageSocialSettings } = useMyAccess();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ClientTab>("all");
  const [platform, setPlatform] = useState<ClientPlatform | null>(null);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableClient | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Any filter change starts again from page 1.
  useEffect(() => setPage(1), [search, tab, platform]);

  const { data, isLoading, isFetching } = useSocialClients({
    search: search || undefined,
    platform: platform ?? undefined,
    client_type: tab !== "all" ? tab : undefined,
    page,
    page_size: CLIENTS_PAGE_SIZE,
  });
  const { data: customFieldsData } = useSocialClientCustomFields({ is_active: true });

  const rows = useMemo(() => ((data as { results?: ClientRow[] } | undefined)?.results ?? []) as ClientRow[], [data]);
  const total = (data as { count?: number } | undefined)?.count ?? 0;
  const stats = useMemo(() => clientPageStats(rows), [rows]);
  const range = pageRange(page, CLIENTS_PAGE_SIZE, total);
  const hasNext = !!(data as { next?: string | null } | undefined)?.next;
  const openRow = rows.find((r) => r.id === openId);

  const customFieldLabels = useMemo(() => {
    const raw = customFieldsData as unknown;
    const list = (Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | undefined)?.results ?? []) as Array<{
      name?: string;
      label?: string;
    }>;
    return Object.fromEntries(list.filter((f) => f.name).map((f) => [f.name as string, f.label || (f.name as string)]));
  }, [customFieldsData]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const statCells = [
    { key: "total", label: t("stats.total"), value: total },
    { key: "booking", label: t("stats.bookingClients"), value: stats.booking, hint: `${stats.verified} ${t("stats.verified")}` },
    { key: "linked", label: t("stats.linked"), value: stats.linked },
    { key: "whatsapp", label: t("stats.whatsapp"), value: stats.whatsapp },
    { key: "facebook", label: t("stats.facebook"), value: stats.facebook },
  ];

  const tabs: { key: ClientTab; label: string }[] = [
    { key: "all", label: t("filters.allClients") },
    { key: "booking", label: t("filters.bookingEnabled") },
    { key: "social", label: t("filters.socialOnly") },
  ];

  const platformName = (p: ClientPlatform) => CLIENT_PLATFORM_BRAND[p] ?? ts("widget");

  return (
    <section className="relative flex h-full min-h-0 w-full overflow-hidden" data-testid="clients-screen">
      <ClientsHeaderBridge onCreate={openCreate} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* stats strip */}
        <div
          className="flex shrink-0 gap-px overflow-x-auto border-b bg-border"
          data-testid="clients-stats"
        >
          {statCells.map((cell) => (
            <div
              key={cell.key}
              className="flex min-w-[130px] flex-1 flex-col gap-0.5 bg-background px-4 py-2.5 md:min-w-[150px] md:py-3"
              title={cell.hint ? `${cell.label} · ${cell.hint}` : cell.label}
            >
              <span className="truncate text-[11px] text-muted-foreground">{cell.label}</span>
              <span className="text-xl font-semibold tabular-nums tracking-[-.02em]">{cell.value}</span>
            </div>
          ))}
        </div>

        {/* toolbar */}
        <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b px-4 py-1.5">
          <div className="inline-flex h-7 shrink-0 gap-0.5 rounded-md bg-muted p-0.5" role="tablist">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded px-2.5 text-xs font-medium",
                  tab === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5" role="group" aria-label={ts("channels")}>
            {CLIENT_PLATFORMS.map((p) => {
              const Icon = CLIENT_PLATFORM_ICON[p];
              const active = platform === p;
              return (
                <button
                  key={p}
                  type="button"
                  title={platformName(p)}
                  aria-label={platformName(p)}
                  aria-pressed={active}
                  onClick={() => setPlatform(active ? null : p)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-white transition-opacity hover:opacity-100",
                    CLIENT_PLATFORM_BG[p],
                    platform && !active ? "opacity-35" : "opacity-100",
                    active && "ring-2 ring-foreground/70 ring-offset-1 ring-offset-background"
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={2.5} />
                </button>
              );
            })}
          </div>
          <div className="relative ml-auto min-w-[160px] max-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={ts("searchPlaceholder")}
              aria-label={ts("searchPlaceholder")}
              className="h-7 w-full rounded-md border border-input bg-background pl-[26px] pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
        </div>

        {/* table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[760px]">
            <div
              className={cn(
                GRID,
                "sticky top-0 z-[1] h-8 border-b bg-background px-4 text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground"
              )}
            >
              <span>{t("table.client")}</span>
              <span>{t("table.email")}</span>
              <span>{t("table.phone")}</span>
              <span>{t("table.platforms")}</span>
              <span>{ts("bookingColumn")}</span>
              <span className="text-right">{t("table.created")}</span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-4 py-16 text-muted-foreground" data-testid="clients-empty">
                <UserRound className="h-6 w-6" />
                <p className="text-[13px] font-medium text-foreground">{t("noClients")}</p>
                {(search || platform || tab !== "all") && <p className="text-xs">{ts("emptyFiltered")}</p>}
              </div>
            ) : (
              rows.map((row) => {
                const platforms = clientPlatforms(row.platforms);
                const tags = clientTags(row.tags);
                const selected = row.id === openId;
                return (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenId(selected ? null : row.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenId(selected ? null : row.id);
                      }
                    }}
                    aria-pressed={selected}
                    data-testid="client-row"
                    className={cn(
                      GRID,
                      "h-12 cursor-pointer border-b px-4 text-[13px] outline-none hover:bg-muted/40 focus-visible:bg-muted/40",
                      selected && "bg-muted/60"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {row.profile_picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.profile_picture} alt="" className="h-[30px] w-[30px] shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {clientInitials(row.name)}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{row.name}</span>
                        {tags.length > 0 && (
                          <span className="truncate text-[11px] text-muted-foreground">{tags.join(" · ")}</span>
                        )}
                      </span>
                    </span>
                    <span className="truncate pr-2 text-xs text-muted-foreground">{row.email || "—"}</span>
                    <span className="truncate text-xs tabular-nums text-muted-foreground">{row.phone || "—"}</span>
                    <span className="flex gap-1">
                      {platforms.length ? (
                        platforms.map((p) => (
                          <span key={p} title={platformName(p)}>
                            <PlatformDot platform={p} />
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </span>
                    <span>
                      {row.is_booking_enabled ? (
                        <span
                          className={cn(
                            "inline-flex h-5 items-center rounded border px-[7px] text-[11px] font-medium",
                            row.is_verified
                              ? "border-[hsl(var(--success)/0.4)] text-green-700 dark:text-green-400"
                              : "border-amber-500/40 text-amber-700 dark:text-amber-400"
                          )}
                          title={row.booking_count ? `${row.booking_count} ${t("booking.bookings")}` : undefined}
                        >
                          {row.is_verified ? t("booking.verified") : t("booking.unverified")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </span>
                    <span className="text-right text-xs tabular-nums text-muted-foreground">{shortDate(row.created_at)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* footer / pagination */}
        {total > 0 && (
          <div className="flex h-9 shrink-0 items-center gap-2 border-t pl-4 pr-16 text-[11px] text-muted-foreground">
            <span className="tabular-nums" data-testid="clients-range">
              {ts("range", { from: range.from, to: range.to, total })}
            </span>
            {isFetching && !isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label={ts("previous")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                aria-label={ts("next")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {openId !== null && (
        <ClientDetailRail
          key={openId}
          clientId={openId}
          chatLinks={openRow?.social_accounts ?? []}
          bookingCount={openRow?.booking_count}
          canDelete={canManageSocialSettings}
          customFieldLabels={customFieldLabels}
          onClose={() => setOpenId(null)}
          onEdit={(client) => {
            setEditing(client);
            setFormOpen(true);
          }}
          onDeleted={() => setOpenId(null)}
          className="absolute inset-0 z-20 w-full md:static md:z-auto md:w-[340px] md:shrink-0"
        />
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} onSaved={(id) => setOpenId(id)} />
    </section>
  );
}
