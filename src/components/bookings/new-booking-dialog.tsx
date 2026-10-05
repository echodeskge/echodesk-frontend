"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronsUpDown, Loader2, UserPlus, X } from "lucide-react"
import {
  bookingsAdminBookingsCreate,
  bookingsAdminClientsList,
  bookingsAdminServicesList,
} from "@/api/generated"
import type { BookingClient, BookingStaff, ServiceList } from "@/api/generated/interfaces"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn, getApiErrorMessage, localizedName } from "@/lib/utils"

export interface NewBookingPreset {
  staffId?: number
  date: string
  /** "HH:MM" */
  time?: string
}

interface NewBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffList: BookingStaff[]
  preset: NewBookingPreset
  onCreated: () => void
}

/** Book for a customer by hand: from a phone call, a walk-in or a calendar click. */
export function NewBookingDialog({ open, onOpenChange, staffList, preset, onCreated }: NewBookingDialogProps) {
  const t = useTranslations("bookingsCalendar")
  const locale = useLocale()
  const { toast } = useToast()

  const [services, setServices] = useState<ServiceList[]>([])
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
  }, [open, preset])

  useEffect(() => {
    if (!open || services.length) return
    bookingsAdminServicesList(undefined, undefined, undefined, undefined, 200, undefined, "active")
      .then((response) => setServices((response.results || (response as unknown as ServiceList[])) as ServiceList[]))
      .catch(() => setServices([]))
  }, [open, services.length])

  // Only the services this specialist performs
  const staff = staffList.find((s) => String(s.id) === staffId)
  const serviceOptions = useMemo(() => {
    if (!staff) return services
    const ids = new Set(staff.services.map((s) => s.id))
    return services.filter((s) => ids.has(s.id))
  }, [services, staff])

  const pickService = (id: string) => {
    setServiceId(id)
    const service = services.find((s) => String(s.id) === id)
    if (service) setPrice(service.base_price)
  }

  // Customers matching what was typed in the picker (name, phone or email)
  useEffect(() => {
    if (!pickerOpen) return
    setSearching(true)
    const timer = setTimeout(() => {
      bookingsAdminClientsList(undefined, undefined, undefined, 8, clientQuery.trim() || undefined)
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
      toast({ title: t("error"), description: t("dialog.fillRequired"), variant: "destructive" })
      return
    }
    if (!client && !newClient) {
      toast({ title: t("error"), description: t("dialog.pickCustomer"), variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await bookingsAdminBookingsCreate({
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
      toast({ title: t("dialog.created") })
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast({ title: t("error"), description: getApiErrorMessage(error, t("dialog.createFailed")), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("newBooking")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nb-staff">{t("dialog.staff")} *</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger id="nb-staff">
                  <SelectValue placeholder={t("dialog.selectStaff")} />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.user.full_name || s.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nb-service">{t("dialog.service")} *</Label>
              <Select value={serviceId} onValueChange={pickService}>
                <SelectTrigger id="nb-service">
                  <SelectValue placeholder={t("dialog.selectService")} />
                </SelectTrigger>
                <SelectContent>
                  {serviceOptions.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">{t("dialog.noServiceForStaff")}</div>
                  )}
                  {serviceOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {localizedName(s.name, locale)} · {s.duration_minutes} {t("minutesShort")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nb-date">{t("dialog.date")} *</Label>
              <DatePicker id="nb-date" value={date} onChange={setDate} className="w-full" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nb-time">{t("dialog.time")} *</Label>
              <Input id="nb-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nb-price">{t("dialog.price")} (₾)</Label>
              <Input id="nb-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <Label>{t("dialog.customer")} *</Label>
            {client ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{client.full_name}</p>
                  <p className="truncate text-muted-foreground">
                    {[client.phone_number, client.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-none" onClick={clearClient} aria-label={t("dialog.changeCustomer")}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" aria-expanded={pickerOpen} className="w-full justify-between font-normal">
                    <span className={cn(!newClient && "text-muted-foreground")}>
                      {newClient ? t("dialog.newCustomer") : t("dialog.searchCustomer")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput value={clientQuery} onValueChange={setClientQuery} placeholder={t("dialog.searchCustomerHint")} />
                    <CommandList>
                      <CommandGroup>
                        <CommandItem value="__new__" onSelect={startNewClient} className="font-medium">
                          <UserPlus className="mr-2 h-4 w-4" />
                          {clientQuery.trim() ? t("dialog.addNamed", { name: clientQuery.trim() }) : t("dialog.addNew")}
                        </CommandItem>
                      </CommandGroup>
                      {searching && clientOptions.length === 0 ? (
                        <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <CommandEmpty>{t("dialog.noCustomers")}</CommandEmpty>
                      )}
                      {clientOptions.length > 0 && (
                        <CommandGroup heading={t("dialog.existingCustomers")}>
                          {clientOptions.map((option) => (
                            <CommandItem key={option.id} value={String(option.id)} onSelect={() => pickClient(option)}>
                              <span className="truncate">{option.full_name}</span>
                              <span className="ml-auto pl-3 text-xs text-muted-foreground">{option.phone_number}</span>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nb-first">{t("dialog.firstName")} *</Label>
                  <Input id="nb-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nb-last">{t("dialog.lastName")}</Label>
                  <Input id="nb-last" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nb-phone">{t("dialog.phone")} *</Label>
                  <Input id="nb-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nb-email">{t("dialog.email")}</Label>
                  <Input id="nb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">{t("dialog.newCustomerSaved")}</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nb-notes">{t("dialog.notes")}</Label>
            <Textarea id="nb-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={notify} onCheckedChange={(value) => setNotify(value === true)} />
            {t("dialog.notifyClient")}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("dialog.cancel")}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("dialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
