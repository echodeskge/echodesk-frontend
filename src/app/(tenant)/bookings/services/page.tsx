"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Briefcase, Clock, Plus, SearchX } from "lucide-react"
import type { BookingStaff, ServiceCategory, ServiceList } from "@/api/generated/interfaces"
import { useMyAccess } from "@/hooks/useMyAccess"
import { getApiErrorMessage } from "@/lib/utils"
import {
  activateService,
  createService,
  deactivateService,
  deleteService,
  fetchAllCategories,
  fetchAllServices,
  fetchAllStaff,
  isConflictError,
  updateService,
} from "../_lib/bookings-api"
import {
  BookingsEmptyState,
  BookingsHeaderBridge,
  BookingsPage,
  BookingsTable,
  SectionCard,
  TonePill,
  ToolbarSearch,
  displayName,
  formatMoney,
  rdButton,
  type BookingsColumn,
} from "../_components/ui"
import { ActivePill, DeleteDialog, RowActions, asBilingual, matchesSearch } from "../_components/catalog"
import { ServiceFormSheet, type ServicePayload, type ServiceStatus } from "./_components/service-form"

export default function ServicesPage() {
  const t = useTranslations("bookingsServices")
  const tUi = useTranslations("bookingsUi")
  const locale = useLocale()
  const { isBookingAdmin } = useMyAccess()

  const [services, setServices] = useState<ServiceList[] | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [search, setSearch] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceList | null>(null)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [staff, setStaff] = useState<BookingStaff[]>([])
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)

  const [deleting, setDeleting] = useState<ServiceList | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setServices(await fetchAllServices())
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Categories and staff are only needed by the form: loaded once, when it first opens.
  const loadOptions = useCallback(async () => {
    if (optionsLoaded || optionsLoading) return
    setOptionsLoading(true)
    try {
      const [cats, people] = await Promise.all([fetchAllCategories(), fetchAllStaff()])
      setCategories(cats)
      setStaff(people)
      setOptionsLoaded(true)
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("form.optionsFailed")))
    } finally {
      setOptionsLoading(false)
    }
  }, [optionsLoaded, optionsLoading, t])

  const openForm = (service: ServiceList | null) => {
    setEditing(service)
    setFormOpen(true)
    loadOptions()
  }

  const submit = async (payload: ServicePayload) => {
    setSaving(true)
    // `category_id: null` clears the category (the backend accepts it; the generated type only knows numbers).
    const body = payload as unknown as Parameters<typeof createService>[0]
    try {
      if (editing) {
        await updateService(editing.id, body)
        toast.success(t("serviceUpdated"))
      } else {
        await createService(body)
        toast.success(t("serviceCreated"))
      }
      setFormOpen(false)
      await load()
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("saveFailed")))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await deleteService(deleting.id)
      toast.success(t("serviceDeleted"))
      setDeleting(null)
      await load()
    } catch (e) {
      // The backend keeps a service that bookings still reference (PROTECT) and answers 409.
      toast.error(isConflictError(e) ? t("deleteHasBookings") : getApiErrorMessage(e, t("deleteFailed")))
    } finally {
      setDeleteBusy(false)
    }
  }

  /** Row status toggle: active ↔ inactive through the `activate` / `deactivate` actions (coming soon → active). */
  const toggleStatus = async (service: ServiceList) => {
    setTogglingId(service.id)
    try {
      const updated =
        (service.status as ServiceStatus) === "active" ? await deactivateService(service.id) : await activateService(service.id)
      setServices((list) => list?.map((s) => (s.id === service.id ? { ...s, status: updated.status ?? s.status } : s)))
      toast.success(updated.status === "active" ? t("serviceActivated") : t("serviceDeactivated"))
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("saveFailed")))
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = useMemo(
    () => (services ?? []).filter((s) => matchesSearch(search, s.name_display, asBilingual(s.name))),
    [services, search]
  )

  const statusLabel = (status: string | undefined) =>
    status === "inactive" ? t("inactive") : status === "coming_soon" ? t("comingSoon") : t("active")

  const columns: BookingsColumn<ServiceList>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("serviceName"),
        width: "minmax(0,1.8fr)",
        mobile: "title",
        cell: (s) => {
          const category = s.category ? displayName(s.category, locale, "") : ""
          return (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{displayName(s, locale)}</span>
              {category && <span className="hidden truncate text-[11px] text-muted-foreground @3xl:block">{category}</span>}
            </span>
          )
        },
      },
      {
        id: "duration",
        header: t("duration"),
        width: "110px",
        mobile: "meta",
        cell: (s) => (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {t("minutes", { count: s.duration_minutes })}
          </span>
        ),
      },
      {
        id: "price",
        header: t("price"),
        width: "100px",
        mobile: "meta",
        cell: (s) => <span className="tabular-nums">{formatMoney(s.base_price)}</span>,
      },
      {
        id: "type",
        header: t("type"),
        width: "150px",
        mobile: "hidden",
        cell: (s) => (
          <TonePill tone="neutral" testId="bkg-service-type-pill">
            {(s.booking_type as string) === "fixed_slots" ? t("fixedSlots") : t("durationBased")}
          </TonePill>
        ),
      },
      {
        id: "status",
        header: t("status"),
        width: "110px",
        mobile: "end",
        cell: (s) => {
          const status = (s.status as ServiceStatus) || "active"
          const pill = (
            <ActivePill
              active={status === "active"}
              tone={status === "coming_soon" ? "warning" : status === "active" ? "solid" : "outline"}
              label={statusLabel(status)}
              testId="bkg-service-status-pill"
            />
          )
          if (!isBookingAdmin) return pill
          const title = status === "active" ? t("deactivate") : t("activate")
          return (
            <button
              type="button"
              onClick={() => toggleStatus(s)}
              disabled={togglingId === s.id}
              className="inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label={`${title}: ${displayName(s, locale)}`}
              title={title}
              data-testid="bkg-service-status-toggle"
            >
              {pill}
            </button>
          )
        },
      },
      // Only booking admins may change the catalog: no action column for anyone else.
      ...(isBookingAdmin
        ? [
            {
              id: "actions",
              header: <span className="sr-only">{t("actions")}</span>,
              width: "64px",
              align: "end",
              mobile: "actions",
              cell: (s) => (
                <RowActions
                  onEdit={() => openForm(s)}
                  onDelete={() => setDeleting(s)}
                  editLabel={t("editAria", { name: displayName(s, locale) })}
                  deleteLabel={t("deleteAria", { name: displayName(s, locale) })}
                  testId="bkg-service-actions"
                />
              ),
            } satisfies BookingsColumn<ServiceList>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale, isBookingAdmin, togglingId]
  )

  const count = services && !error ? t("servicesFound", { count: filtered.length }) : null

  return (
    <BookingsPage testId="bkg-services">
      <BookingsHeaderBridge
        sub={count}
        primary={isBookingAdmin ? { label: t("addService"), icon: Plus, onClick: () => openForm(null), testId: "bkg-services-add" } : null}
      />
      <SectionCard
        title={t("allServices")}
        hint={count ?? undefined}
        actions={<ToolbarSearch value={search} onChange={setSearch} placeholder={t("searchServices")} clearLabel={tUi("clearSearch")} testId="bkg-services-search" />}
        testId="bkg-services-card"
      >
        <BookingsTable
          variant="flush"
          density="comfortable"
          columns={columns}
          rows={services ? filtered : undefined}
          rowKey={(s) => s.id}
          loading={loading}
          error={error}
          onRetry={load}
          onRowClick={isBookingAdmin ? (s) => openForm(s) : undefined}
          ariaLabel={t("allServices")}
          skeletonRows={5}
          testId="bkg-services-table"
          empty={
            search ? (
              <BookingsEmptyState
                icon={SearchX}
                title={tUi("noMatches")}
                description={tUi("noMatchesHint")}
                action={
                  <button type="button" className={rdButton.outlineSm} onClick={() => setSearch("")}>
                    {tUi("clearFilters")}
                  </button>
                }
              />
            ) : (
              <BookingsEmptyState
                icon={Briefcase}
                title={t("noServicesFound")}
                description={t("getStartedServices")}
                action={
                  isBookingAdmin ? (
                    <button type="button" className={rdButton.primary} onClick={() => openForm(null)}>
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      {t("createService")}
                    </button>
                  ) : undefined
                }
              />
            )
          }
        />
      </SectionCard>

      {isBookingAdmin && (
        <>
          <ServiceFormSheet
            open={formOpen}
            onOpenChange={setFormOpen}
            service={editing}
            categories={categories}
            staff={staff}
            optionsLoading={optionsLoading}
            onSubmit={submit}
            submitting={saving}
          />
          <DeleteDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={t("deleteDialog.title")}
            description={t("deleteDialog.description", { name: deleting ? displayName(deleting, locale) : "" })}
            cancelLabel={t("cancel")}
            confirmLabel={t("deleteDialog.confirm")}
            onConfirm={confirmDelete}
            busy={deleteBusy}
            testId="bkg-service-delete"
          />
        </>
      )}
    </BookingsPage>
  )
}
