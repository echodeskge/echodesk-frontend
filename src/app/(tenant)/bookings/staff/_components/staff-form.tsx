"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Loader2, Search } from "lucide-react"
import type { AvailableUser, BookingStaff, BookingStaffCreateRequest, PatchedBookingStaffCreateRequest, ServiceList } from "@/api/generated/interfaces"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { getApiErrorMessage } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { fetchAvailableUsers } from "../../_lib/bookings-api"
import { Avatar, bkgField, displayName, staffName } from "../../_components/ui"
import { FormField, FormSection, FormSheet, FormSwitchRow } from "../../_components/catalog"

export interface StaffFormState {
  user: AvailableUser | null
  bio: string
  isActive: boolean
  serviceIds: number[]
}

export const EMPTY_STAFF_FORM: StaffFormState = { user: null, bio: "", isActive: true, serviceIds: [] }

export function staffToForm(s: BookingStaff): StaffFormState {
  return {
    user: s.user ? { id: s.user.id, email: s.user.email, first_name: s.user.first_name, last_name: s.user.last_name, full_name: s.user.full_name } : null,
    bio: s.bio ?? "",
    isActive: s.is_active_for_bookings ?? true,
    serviceIds: (s.services ?? []).map((x) => x.id),
  }
}

/** Create body: the chosen user + bio, active flag and the full `service_ids` list. */
export function staffToCreatePayload(f: StaffFormState): BookingStaffCreateRequest {
  return { user_id: f.user?.id, bio: f.bio.trim(), is_active_for_bookings: f.isActive, service_ids: f.serviceIds }
}

/** Update body: the user cannot change; `service_ids` is always sent so an emptied list sticks. */
export function staffToUpdatePayload(f: StaffFormState): PatchedBookingStaffCreateRequest {
  return { bio: f.bio.trim(), is_active_for_bookings: f.isActive, service_ids: f.serviceIds }
}

function userLabel(u: AvailableUser): string {
  return u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email
}

/** Searches `staff/available_users/?search=` (users who are not booking staff yet) and picks one. */
function UserPicker({ value, onChange, error }: { value: AvailableUser | null; onChange: (u: AvailableUser | null) => void; error?: string | null }) {
  const t = useTranslations("bookingsStaff")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AvailableUser[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = setTimeout(() => {
      fetchAvailableUsers(query.trim())
        .then((users) => {
          if (!active) return
          setResults(users)
          setLoadError(null)
        })
        .catch((e) => active && setLoadError(getApiErrorMessage(e, t("usersFailed"))))
        .finally(() => active && setLoading(false))
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, t])

  return (
    <FormField label={t("selectUserLabel")} htmlFor="bkg-staff-user-search" required error={error ?? loadError} help={value ? undefined : t("selectUserHelp")}>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          id="bkg-staff-user-search"
          type="search"
          className={cn(bkgField.input, "ps-8")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("selectUserPlaceholder")}
          autoComplete="off"
          data-testid="bkg-staff-user-search"
        />
        {loading && <Loader2 aria-hidden className="absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      <div role="radiogroup" aria-label={t("selectUserLabel")} className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border p-1" data-testid="bkg-staff-user-list">
        {results === null ? null : results.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">{query ? t("noUsersMatch") : t("noAvailableUsers")}</p>
        ) : (
          results.map((u) => {
            const selected = value?.id === u.id
            return (
              <button
                key={u.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(selected ? null : u)}
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded px-2 py-1.5 text-start text-[13px] hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected && "bg-muted"
                )}
                data-testid="bkg-staff-user-option"
              >
                <Avatar name={userLabel(u)} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{userLabel(u)}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{u.email}</span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </FormField>
  )
}

/**
 * Add / edit staff sheet: user picker (new staff only), bio, "active for
 * bookings" and the services checklist (every service, through
 * `fetchAllPages`, loaded by the page).
 */
export function StaffFormSheet({
  open,
  onOpenChange,
  staff,
  services,
  servicesLoading,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: BookingStaff | null
  services: ServiceList[]
  servicesLoading?: boolean
  onSubmit: (form: StaffFormState) => Promise<void>
  submitting: boolean
}) {
  const t = useTranslations("bookingsStaff")
  const locale = useLocale()
  const [form, setForm] = useState<StaffFormState>(EMPTY_STAFF_FORM)
  const [userError, setUserError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(staff ? staffToForm(staff) : { ...EMPTY_STAFF_FORM })
      setUserError(null)
    }
  }, [open, staff])

  const toggleService = (id: number) =>
    setForm((f) => ({ ...f, serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id] }))

  const submit = async () => {
    if (!staff && !form.user) {
      setUserError(t("userRequired"))
      return
    }
    await onSubmit(form)
  }

  const sortedServices = useMemo(() => [...services].sort((a, b) => displayName(a, locale).localeCompare(displayName(b, locale))), [services, locale])

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={staff ? t("editStaff") : t("addStaff")}
      description={staff ? t("editStaffDescription") : t("addStaffDescription")}
      size="md"
      onSubmit={submit}
      submitting={submitting}
      submitLabel={staff ? t("update") : t("create")}
      cancelLabel={t("cancel")}
      testId="bkg-staff-form"
    >
      <FormSection title={t("staffMember")}>
        {staff ? (
          <div className="flex items-center gap-2.5 rounded-md border px-3 py-2" data-testid="bkg-staff-form-user">
            <Avatar name={staffName(staff)} size={28} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium">{staffName(staff)}</span>
              <span className="truncate text-xs text-muted-foreground">{staff.user?.email}</span>
            </span>
          </div>
        ) : (
          <UserPicker
            value={form.user}
            onChange={(u) => {
              setForm((f) => ({ ...f, user: u }))
              setUserError(null)
            }}
            error={userError}
          />
        )}
        <FormField label={t("bio")} htmlFor="bkg-staff-bio">
          <textarea id="bkg-staff-bio" className={bkgField.textarea} rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder={t("bioPlaceholder")} data-testid="bkg-staff-bio" />
        </FormField>
        <FormSwitchRow label={t("activeForBookings")} help={t("activeForBookingsHelp")} htmlFor="bkg-staff-active">
          <Switch id="bkg-staff-active" checked={form.isActive} onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))} />
        </FormSwitchRow>
      </FormSection>

      <FormSection title={t("assignServices")} hint={t("servicesSelected", { count: form.serviceIds.length })}>
        {sortedServices.length === 0 ? (
          <p className="text-xs text-muted-foreground">{servicesLoading ? t("loadingServices") : t("noServicesAvailable")}</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border p-2" data-testid="bkg-staff-services">
            {sortedServices.map((s) => {
              const id = `bkg-staff-service-${s.id}`
              return (
                <label key={s.id} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-muted/50">
                  <Checkbox id={id} checked={form.serviceIds.includes(s.id)} onCheckedChange={() => toggleService(s.id)} />
                  <span className="min-w-0 truncate">{displayName(s, locale)}</span>
                  {(s.status as string) !== "active" && <span className="ms-auto text-[11px] text-muted-foreground">{t("inactive")}</span>}
                </label>
              )
            })}
          </div>
        )}
      </FormSection>
    </FormSheet>
  )
}
