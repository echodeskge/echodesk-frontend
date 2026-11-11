"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Clock, Mail, Plus, SearchX, UserCheck } from "lucide-react"
import type { BookingStaff, ServiceList } from "@/api/generated/interfaces"
import { useMyAccess } from "@/hooks/useMyAccess"
import { getApiErrorMessage } from "@/lib/utils"
import { createStaff, deleteStaff, fetchAllServices, fetchAllStaff, updateStaff } from "../_lib/bookings-api"
import {
  BookingsEmptyState,
  BookingsHeaderBridge,
  BookingsPage,
  BookingsTable,
  PersonCell,
  SectionCard,
  TonePill,
  ToolbarSearch,
  displayName,
  rdButton,
  staffName,
  type BookingsColumn,
} from "../_components/ui"
import { ActivePill, DeleteDialog, RowActions, matchesSearch } from "../_components/catalog"
import { StaffFormSheet, staffToCreatePayload, staffToUpdatePayload, type StaffFormState } from "./_components/staff-form"

const VISIBLE_SERVICE_PILLS = 2

export default function StaffPage() {
  const t = useTranslations("bookingsStaff")
  const tUi = useTranslations("bookingsUi")
  const locale = useLocale()
  const { isBookingAdmin } = useMyAccess()

  const [staff, setStaff] = useState<BookingStaff[] | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BookingStaff | null>(null)
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<ServiceList[]>([])
  const [servicesLoaded, setServicesLoaded] = useState(false)
  const [servicesLoading, setServicesLoading] = useState(false)
  const [deleting, setDeleting] = useState<BookingStaff | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStaff(await fetchAllStaff())
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // The services checklist needs every service (not the first page): loaded when the form first opens.
  const loadServices = useCallback(async () => {
    if (servicesLoaded || servicesLoading) return
    setServicesLoading(true)
    try {
      setServices(await fetchAllServices())
      setServicesLoaded(true)
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("servicesFailed")))
    } finally {
      setServicesLoading(false)
    }
  }, [servicesLoaded, servicesLoading, t])

  const openForm = (member: BookingStaff | null) => {
    setEditing(member)
    setFormOpen(true)
    loadServices()
  }

  const submit = async (form: StaffFormState) => {
    setSaving(true)
    try {
      if (editing) {
        await updateStaff(editing.id, staffToUpdatePayload(form))
        toast.success(t("staffUpdated"))
      } else {
        await createStaff(staffToCreatePayload(form))
        toast.success(t("staffCreated"))
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
      await deleteStaff(deleting.id)
      toast.success(t("staffDeleted"))
      setDeleting(null)
      await load()
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("deleteFailed")))
    } finally {
      setDeleteBusy(false)
    }
  }

  const filtered = useMemo(
    () => (staff ?? []).filter((m) => matchesSearch(search, staffName(m), m.user?.email)),
    [staff, search]
  )

  const columns: BookingsColumn<BookingStaff>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("name"),
        width: "minmax(0,1.4fr)",
        mobile: "title",
        cell: (m) => <PersonCell name={staffName(m) || m.user?.email || "—"} size={28} />,
      },
      {
        id: "email",
        header: t("email"),
        width: "minmax(0,1.4fr)",
        mobile: "meta",
        muted: true,
        cell: (m) => (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{m.user?.email || t("na")}</span>
          </span>
        ),
      },
      {
        id: "services",
        header: t("services"),
        width: "minmax(0,1.8fr)",
        mobile: "meta",
        cell: (m) => {
          const list = m.services ?? []
          if (list.length === 0) return <span className="text-xs text-muted-foreground">{t("noServices")}</span>
          const extra = list.length - VISIBLE_SERVICE_PILLS
          return (
            <span className="flex min-w-0 flex-wrap items-center gap-1" data-testid="bkg-staff-services-cell" title={list.map((s) => displayName(s, locale)).join(", ")}>
              {list.slice(0, VISIBLE_SERVICE_PILLS).map((s) => (
                <TonePill key={s.id} tone="neutral" className="max-w-[160px]">
                  {displayName(s, locale)}
                </TonePill>
              ))}
              {extra > 0 && (
                <TonePill tone="neutral" testId="bkg-staff-services-more">
                  +{extra}
                </TonePill>
              )}
            </span>
          )
        },
      },
      {
        id: "status",
        header: t("status"),
        width: "100px",
        mobile: "end",
        cell: (m) => <ActivePill active={m.is_active_for_bookings ?? true} label={m.is_active_for_bookings ?? true ? t("active") : t("inactive")} testId="bkg-staff-status-pill" />,
      },
      ...(isBookingAdmin
        ? [
            {
              id: "actions",
              header: <span className="sr-only">{t("actions")}</span>,
              width: "64px",
              align: "end",
              mobile: "actions",
              cell: (m) => (
                <RowActions
                  onEdit={() => openForm(m)}
                  onDelete={() => setDeleting(m)}
                  editLabel={t("editAria", { name: staffName(m) })}
                  deleteLabel={t("deleteAria", { name: staffName(m) })}
                  testId="bkg-staff-actions"
                />
              ),
            } satisfies BookingsColumn<BookingStaff>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale, isBookingAdmin]
  )

  const count = staff && !error ? t("staffFound", { count: filtered.length }) : null

  return (
    <BookingsPage testId="bkg-staff">
      <BookingsHeaderBridge
        sub={count}
        primary={isBookingAdmin ? { label: t("addStaff"), icon: Plus, onClick: () => openForm(null), testId: "bkg-staff-add" } : null}
        secondary={[{ label: t("workingHours"), icon: Clock, href: "/bookings/staff/availability", testId: "bkg-staff-hours" }]}
      />
      <SectionCard
        title={t("allStaff")}
        hint={count ?? undefined}
        actions={<ToolbarSearch value={search} onChange={setSearch} placeholder={t("searchStaff")} clearLabel={tUi("clearSearch")} testId="bkg-staff-search" />}
        testId="bkg-staff-card"
      >
        <BookingsTable
          variant="flush"
          density="comfortable"
          columns={columns}
          rows={staff ? filtered : undefined}
          rowKey={(m) => m.id}
          loading={loading}
          error={error}
          onRetry={load}
          onRowClick={isBookingAdmin ? (m) => openForm(m) : undefined}
          ariaLabel={t("allStaff")}
          skeletonRows={4}
          testId="bkg-staff-table"
          empty={
            search ? (
              <BookingsEmptyState
                icon={SearchX}
                title={tUi("noMatches")}
                description={t("noStaffMatch")}
                action={
                  <button type="button" className={rdButton.outlineSm} onClick={() => setSearch("")}>
                    {tUi("clearFilters")}
                  </button>
                }
              />
            ) : (
              <BookingsEmptyState
                icon={UserCheck}
                title={t("noStaffFound")}
                description={t("noStaffYet")}
                action={
                  isBookingAdmin ? (
                    <button type="button" className={rdButton.primary} onClick={() => openForm(null)}>
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      {t("addStaff")}
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
          <StaffFormSheet open={formOpen} onOpenChange={setFormOpen} staff={editing} services={services} servicesLoading={servicesLoading} onSubmit={submit} submitting={saving} />
          <DeleteDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={t("deleteDialog.title")}
            description={t("deleteDialog.description", { name: deleting ? staffName(deleting) : "" })}
            cancelLabel={t("cancel")}
            confirmLabel={t("deleteDialog.confirm")}
            onConfirm={confirmDelete}
            busy={deleteBusy}
            testId="bkg-staff-delete"
          />
        </>
      )}
    </BookingsPage>
  )
}
