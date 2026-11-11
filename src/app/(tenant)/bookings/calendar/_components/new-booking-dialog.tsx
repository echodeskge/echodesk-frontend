"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronsUpDown, Loader2, UserPlus, X } from "lucide-react"
import { toast } from "sonner"
import type { BookingClient, BookingStaff, ServiceList } from "@/api/generated/interfaces"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, getApiErrorMessage } from "@/lib/utils"
import { BookingsDialog, Field, bkgButton, bkgField, displayName, formatTime } from "../../_components/ui"
import { createBooking, fetchActiveStaff, fetchAllServices, fetchBookingClients, fetchSlots } from "../../_lib/bookings-api"

export interface NewBookingPreset {
  staffId?: number
  date: string
  /** "HH:MM" */
  time?: string
}

export interface NewBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preset: NewBookingPreset
  onCreated: () => void
}

/**
 * Book for a customer by hand (design shot 10): Specialist, Service (the
 * specialist's own), Date, Time (with the free start times from `slots/`),
 * Price, Customer (search combobox or a new customer typed in), Internal
 * notes and the e-mail confirmation checkbox. API errors show inline.
 */
export function NewBookingDialog({ open, onOpenChange, preset, onCreated }: NewBookingDialogProps) {
  const t = useTranslations("bookingsCalendar")
  const locale = useLocale()

  const [staffList, setStaffList] = useState<BookingStaff[] | null>(null)
  const [services, setServices] = useState<ServiceList[] | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const [staffId, setStaffId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [date, setDate] = useState(preset.date)
  const [time, setTime] = useState(preset.time || "10:00")
  const [price, setPrice] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  // Either an existing customer is picked, or a new one is typed in (and saved with the booking)
  const [client, setClient] = useState<BookingClient | null>(null)
  const [newClient, setNewClient] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [clientQuery, setClientQuery] = useState("")
  const [clientOptions, setClientOptions] = useState<BookingClient[]>([])
  const [searching, setSearching] = useState(false)
  const [notes, setNotes] = useState("")
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[] | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Reset to the clicked slot every time the dialog opens
  useEffect(() => {
    if (!open) return
    setStaffId(preset.staffId ? String(preset.staffId) : "")
    setServiceId("")
    setDate(preset.date)
    setTime(preset.time || "10:00")
    setPrice("")
    setFirstName("")
    setLastName("")
    setPhone("")
    setEmail("")
    setClient(null)
    setNewClient(false)
    setClientQuery("")
    setClientOptions([])
    setNotes("")
    setNotify(true)
    setError(null)
  }, [open, preset])

  // Specialists (with their services) and the active services: once, on the first open
  useEffect(() => {
    if (!open || (staffList && services)) return
    let active = true
    setOptionsError(false)
    Promise.all([fetchActiveStaff(), fetchAllServices()])
      .then(([people, list]) => {
        if (!active) return
        setStaffList(people)
        setServices(list.filter((s) => (s.status as string) === "active"))
      })
      .catch(() => active && setOptionsError(true))
    return () => {
      active = false
    }
  }, [open, staffList, services])

  // Only the services this specialist performs
  const staff = (staffList ?? []).find((s) => String(s.id) === staffId)
  const serviceOptions = useMemo(() => {
    const all = services ?? []
    if (!staff) return all
    const ids = new Set((staff.services ?? []).map((s) => s.id))
    return all.filter((s) => ids.has(s.id))
  }, [services, staff])

  const pickService = (id: string) => {
    setServiceId(id)
    const service = (services ?? []).find((s) => String(s.id) === id)
    if (service) setPrice(service.base_price)
  }

  // Free start times for the service on that day (and specialist), as a help for the time field
  useEffect(() => {
    if (!open || !serviceId || !date) {
      setSlots(null)
      return
    }
    let active = true
    setSlotsLoading(true)
    fetchSlots({ service: Number(serviceId), date, staff: staffId ? Number(staffId) : undefined })
      .then((res) => active && setSlots(Array.from(new Set((res.slots ?? []).map((s) => formatTime(s.start_time))))))
      .catch(() => active && setSlots([]))
      .finally(() => active && setSlotsLoading(false))
    return () => {
      active = false
    }
  }, [open, serviceId, date, staffId])

  // Customers matching what was typed in the picker (name, phone or email)
  useEffect(() => {
    if (!pickerOpen) return
    setSearching(true)
    const timer = setTimeout(() => {
      fetchBookingClients({ pageSize: 8, search: clientQuery.trim() })
        .then((response) => setClientOptions((response.results || []) as BookingClient[]))
        .catch(() => setClientOptions([]))
        .finally(() => setSearching(false))
    }, clientQuery ? 250 : 0)
    return () => clearTimeout(timer)
  }, [clientQuery, pickerOpen])

  const pickClient = (picked: BookingClient) => {
    setClient(picked)
    setNewClient(false)
    setPickerOpen(false)
  }

  const startNewClient = () => {
    setClient(null)
    setNewClient(true)
    setPickerOpen(false)
    // Whatever was typed to search is a head start for the new record
    const typed = clientQuery.trim()
    if (/^[+\d\s()-]+$/.test(typed)) setPhone(typed)
    else if (typed) setFirstName(typed)
  }

  const clearClient = () => {
    setClient(null)
    setNewClient(false)
    setFirstName("")
    setLastName("")
    setPhone("")
    setEmail("")
  }

  const submit = async () => {
    if (!staffId || !serviceId || !date || !time) {
      setError(t("dialog.fillRequired"))
      return
    }
    if (!client && !newClient) {
      setError(t("dialog.pickCustomer"))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createBooking({
        service_id: Number(serviceId),
        staff_id: Number(staffId),
        date,
        start_time: time,
        client_id: client?.id,
        first_name: client ? undefined : firstName,
        last_name: client ? undefined : lastName,
        phone_number: client ? undefined : phone,
        email: client ? undefined : email || undefined,
        total_amount: price === "" ? undefined : price,
        staff_notes: notes,
        notify_client: notify,
      })
      toast.success(t("dialog.created"))
      onOpenChange(false)
      onCreated()
    } catch (e) {
      setError(getApiErrorMessage(e, t("dialog.createFailed")))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BookingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("newBooking")}
      onSubmit={submit}
      submitLabel={t("dialog.save")}
      cancelLabel={t("dialog.cancel")}
      submitting={saving}
      testId="bkg-new-booking"
      className="sm:max-w-[520px]"
    >
      {optionsError && (
        <p role="alert" className="text-xs text-destructive">
          {t("dialog.optionsFailed")}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={<>{t("dialog.staff")} <span className="text-destructive">*</span></>} htmlFor="nb-staff">
          <select id="nb-staff" className={bkgField.select} value={staffId} onChange={(e) => setStaffId(e.target.value)} data-testid="bkg-nb-staff">
            <option value="">{t("dialog.selectStaff")}</option>
            {(staffList ?? []).map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.user.full_name || s.user.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label={<>{t("dialog.service")} <span className="text-destructive">*</span></>} htmlFor="nb-service">
          <select id="nb-service" className={bkgField.select} value={serviceId} onChange={(e) => pickService(e.target.value)} data-testid="bkg-nb-service">
            <option value="">{serviceOptions.length === 0 && staff ? t("dialog.noServiceForStaff") : t("dialog.selectService")}</option>
            {serviceOptions.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {displayName(s, locale)} · {s.duration_minutes} {t("minutesShort")}
              </option>
            ))}
          </select>
        </Field>
        <Field label={<>{t("dialog.date")} <span className="text-destructive">*</span></>} htmlFor="nb-date">
          <input id="nb-date" type="date" className={cn(bkgField.input, "tabular-nums")} value={date} onChange={(e) => setDate(e.target.value)} data-testid="bkg-nb-date" />
        </Field>
        <Field label={<>{t("dialog.time")} <span className="text-destructive">*</span></>} htmlFor="nb-time">
          <input id="nb-time" type="time" className={cn(bkgField.input, "tabular-nums")} value={time} onChange={(e) => setTime(e.target.value)} data-testid="bkg-nb-time" />
        </Field>
      </div>
      {serviceId && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t("dialog.freeTimes")}</span>
          {slotsLoading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="bkg-nb-slots-loading">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t("dialog.loadingTimes")}
            </span>
          ) : !slots || slots.length === 0 ? (
            <span className="text-xs text-muted-foreground" data-testid="bkg-nb-slots-empty">
              {t("dialog.noFreeTimes")}
            </span>
          ) : (
            <div className="flex max-h-[76px] flex-wrap gap-1.5 overflow-y-auto" data-testid="bkg-nb-slots">
              {slots.map((tm) => (
                <button key={tm} type="button" onClick={() => setTime(tm)} className={cn(bkgButton.outlineSm, "tabular-nums", time === tm && "border-primary bg-primary text-primary-foreground hover:bg-primary")}>
                  {tm}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <Field label={`${t("dialog.price")} (₾)`} htmlFor="nb-price">
        <input id="nb-price" type="number" min="0" step="0.01" inputMode="decimal" className={cn(bkgField.input, "tabular-nums")} value={price} onChange={(e) => setPrice(e.target.value)} data-testid="bkg-nb-price" />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">
          {t("dialog.customer")} <span className="text-destructive">*</span>
        </span>
        {client ? (
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-[13px]" data-testid="bkg-nb-client">
            <div className="min-w-0">
              <p className="truncate font-medium">{client.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{[client.phone_number, client.email].filter(Boolean).join(" · ")}</p>
            </div>
            <button type="button" className={bkgButton.ghostIconSm} onClick={clearClient} aria-label={t("dialog.changeCustomer")} title={t("dialog.changeCustomer")}>
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button type="button" aria-haspopup="listbox" aria-expanded={pickerOpen} className={cn(bkgField.select, "flex items-center justify-between text-left")} data-testid="bkg-nb-customer">
                <span className={cn("truncate", !newClient && "text-muted-foreground")}>{newClient ? t("dialog.newCustomer") : t("dialog.searchCustomer")}</span>
                <ChevronsUpDown className="ms-2 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput value={clientQuery} onValueChange={setClientQuery} placeholder={t("dialog.searchCustomerHint")} />
                <CommandList>
                  <CommandGroup>
                    <CommandItem value="__new__" onSelect={startNewClient} className="font-medium">
                      <UserPlus className="me-2 h-4 w-4" aria-hidden />
                      {clientQuery.trim() ? t("dialog.addNamed", { name: clientQuery.trim() }) : t("dialog.addNew")}
                    </CommandItem>
                  </CommandGroup>
                  {searching && clientOptions.length === 0 ? (
                    <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    </div>
                  ) : (
                    <CommandEmpty>{t("dialog.noCustomers")}</CommandEmpty>
                  )}
                  {clientOptions.length > 0 && (
                    <CommandGroup heading={t("dialog.existingCustomers")}>
                      {clientOptions.map((option) => (
                        <CommandItem key={option.id} value={String(option.id)} onSelect={() => pickClient(option)} data-testid="bkg-nb-client-option">
                          <span className="truncate">{option.full_name}</span>
                          <span className="ms-auto ps-3 text-xs text-muted-foreground">{option.phone_number}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {newClient && (
          <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2" data-testid="bkg-nb-new-client">
            <Field label={<>{t("dialog.firstName")} <span className="text-destructive">*</span></>} htmlFor="nb-first">
              <input id="nb-first" className={bkgField.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" autoFocus />
            </Field>
            <Field label={t("dialog.lastName")} htmlFor="nb-last">
              <input id="nb-last" className={bkgField.input} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
            </Field>
            <Field label={<>{t("dialog.phone")} <span className="text-destructive">*</span></>} htmlFor="nb-phone">
              <input id="nb-phone" type="tel" className={bkgField.input} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
            </Field>
            <Field label={t("dialog.email")} htmlFor="nb-email">
              <input id="nb-email" type="email" className={bkgField.input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">{t("dialog.newCustomerSaved")}</p>
          </div>
        )}
      </div>

      <Field label={t("dialog.notes")} htmlFor="nb-notes">
        <textarea id="nb-notes" rows={2} className={bkgField.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="bkg-nb-notes" />
      </Field>

      <label className="flex items-center gap-2 text-[13px]">
        <Checkbox checked={notify} onCheckedChange={(value) => setNotify(value === true)} data-testid="bkg-nb-notify" />
        {t("dialog.notifyClient")}
      </label>

      {error && (
        <p role="alert" className="text-xs text-destructive" data-testid="bkg-nb-error">
          {error}
        </p>
      )}
    </BookingsDialog>
  )
}
