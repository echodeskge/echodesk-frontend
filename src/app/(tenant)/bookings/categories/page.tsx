"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { FolderTree, Plus, SearchX } from "lucide-react"
import type { ServiceCategory, ServiceCategoryRequest } from "@/api/generated/interfaces"
import { useMyAccess } from "@/hooks/useMyAccess"
import { getApiErrorMessage, localizedName } from "@/lib/utils"
import { createCategory, deleteCategory, fetchAllCategories, updateCategory } from "../_lib/bookings-api"
import {
  BookingsEmptyState,
  BookingsHeaderBridge,
  BookingsPage,
  BookingsTable,
  SectionCard,
  ToolbarSearch,
  displayName,
  rdButton,
  type BookingsColumn,
} from "../_components/ui"
import { ActivePill, DeleteDialog, RowActions, asBilingual, matchesSearch } from "../_components/catalog"
import { CategoryFormSheet } from "./_components/category-form"

/** Description in the UI locale (`description_display` from the API, else the `{en, ka}` object). */
function categoryDescription(c: ServiceCategory, locale: string): string {
  if (c.description_display) return c.description_display
  const d = c.description
  if (typeof d === "string") return d
  return localizedName((d as { en?: string; ka?: string } | null) ?? null, locale)
}

export default function CategoriesPage() {
  const t = useTranslations("bookingsCategories")
  const tUi = useTranslations("bookingsUi")
  const locale = useLocale()
  const { isBookingAdmin } = useMyAccess()

  const [categories, setCategories] = useState<ServiceCategory[] | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<ServiceCategory | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCategories(await fetchAllCategories())
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openForm = (category: ServiceCategory | null) => {
    setEditing(category)
    setFormOpen(true)
  }

  const submit = async (payload: ServiceCategoryRequest) => {
    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing.id, payload)
        toast.success(t("categoryUpdated"))
      } else {
        await createCategory(payload)
        toast.success(t("categoryCreated"))
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
      await deleteCategory(deleting.id)
      toast.success(t("categoryDeleted"))
      setDeleting(null)
      await load()
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("deleteFailed")))
    } finally {
      setDeleteBusy(false)
    }
  }

  const filtered = useMemo(
    () => (categories ?? []).filter((c) => matchesSearch(search, c.name_display, asBilingual(c.name))),
    [categories, search]
  )

  const columns: BookingsColumn<ServiceCategory>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("categoryName"),
        width: "minmax(0,1.2fr)",
        mobile: "title",
        cell: (c) => <span className="truncate font-medium">{displayName(c, locale)}</span>,
      },
      {
        id: "description",
        header: t("description"),
        width: "minmax(0,2fr)",
        mobile: "meta",
        muted: true,
        cell: (c) => <span className="truncate">{categoryDescription(c, locale) || "—"}</span>,
      },
      {
        id: "status",
        header: t("status"),
        width: "100px",
        mobile: "end",
        cell: (c) => <ActivePill active={c.is_active ?? true} label={c.is_active ?? true ? t("active") : t("inactive")} testId="bkg-category-status-pill" />,
      },
      ...(isBookingAdmin
        ? [
            {
              id: "actions",
              header: <span className="sr-only">{t("actions")}</span>,
              width: "64px",
              align: "end",
              mobile: "actions",
              cell: (c) => (
                <RowActions
                  onEdit={() => openForm(c)}
                  onDelete={() => setDeleting(c)}
                  editLabel={t("editAria", { name: displayName(c, locale) })}
                  deleteLabel={t("deleteAria", { name: displayName(c, locale) })}
                  testId="bkg-category-actions"
                />
              ),
            } satisfies BookingsColumn<ServiceCategory>,
          ]
        : []),
    ],
    [t, locale, isBookingAdmin]
  )

  const count = categories && !error ? t("categoriesFound", { count: filtered.length }) : null

  return (
    <BookingsPage testId="bkg-categories">
      <BookingsHeaderBridge
        sub={count}
        primary={isBookingAdmin ? { label: t("addCategory"), icon: Plus, onClick: () => openForm(null), testId: "bkg-categories-add" } : null}
      />
      <SectionCard
        title={t("allCategories")}
        hint={count ?? undefined}
        actions={<ToolbarSearch value={search} onChange={setSearch} placeholder={t("searchCategories")} clearLabel={tUi("clearSearch")} testId="bkg-categories-search" />}
        testId="bkg-categories-card"
      >
        <BookingsTable
          variant="flush"
          density="comfortable"
          columns={columns}
          rows={categories ? filtered : undefined}
          rowKey={(c) => c.id}
          loading={loading}
          error={error}
          onRetry={load}
          onRowClick={isBookingAdmin ? (c) => openForm(c) : undefined}
          ariaLabel={t("allCategories")}
          skeletonRows={4}
          testId="bkg-categories-table"
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
                icon={FolderTree}
                title={t("noCategoriesFound")}
                description={t("getStartedCategories")}
                action={
                  isBookingAdmin ? (
                    <button type="button" className={rdButton.primary} onClick={() => openForm(null)}>
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      {t("createCategory")}
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
          <CategoryFormSheet open={formOpen} onOpenChange={setFormOpen} category={editing} onSubmit={submit} submitting={saving} />
          <DeleteDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={t("deleteDialog.title")}
            description={t("deleteDialog.description", { name: deleting ? displayName(deleting, locale) : "" })}
            cancelLabel={t("cancel")}
            confirmLabel={t("deleteDialog.confirm")}
            onConfirm={confirmDelete}
            busy={deleteBusy}
            testId="bkg-category-delete"
          />
        </>
      )}
    </BookingsPage>
  )
}
