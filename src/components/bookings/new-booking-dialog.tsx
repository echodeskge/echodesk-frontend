"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import {
  bookingsAdminBookingsCreate,
  bookingsAdminClientsList,
  bookingsAdminServicesList,
} from "@/api/generated"
import type { BookingClient, BookingStaff, ServiceList } from "@/api/generated/interfaces"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorMessage, localizedName } from "@/lib/utils"

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
  const [clientId, setClientId] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [notify, setNotify] = useState(true)
  const [suggestions, setSuggestions] = useState<BookingClient[]>([])
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
    setClientId(null)
    setNotes("")
    setNotify(true)
    setSuggestions([])
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

  // Existing contacts by name or phone, so a regular is not typed in twice
  const lookup = `${firstName} ${phone}`.trim()
  useEffect(() => {
    if (clientId || lookup.length < 3) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      bookingsAdminClientsList(undefined, undefined, undefined, 5, lookup)
        .then((response) => setSuggestions((response.results || []) as BookingClient[]))
        .catch(() => setSuggestions([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [lookup, clientId])

  const pickClient = (client: BookingClient) => {
    setClientId(client.id)
    setFirstName(client.first_name || client.full_name)
    setLastName(client.last_name || "")
    setPhone(client.phone_number || "")
    setEmail(client.email || "")
    setSuggestions([])
  }

  const editCustomer = (setter: (value: string) => void) => (value: string) => {
    setClientId(null) // typing again means "someone else"
    setter(value)
  }

  const submit = async () => {
    if (!staffId || !serviceId || !date || !time) {
      toast({ title: t("error"), description: t("dialog.fillRequired"), variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await bookingsAdminBookingsCreate({
        service_id: Number(serviceId),
        staff_id: Number(staffId),
        date,
        start_time: time,
        client_id: clientId ?? undefined,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email: email || undefined,
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
              <Input id="nb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
            <p className="text-sm font-medium">{t("dialog.customer")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nb-first">{t("dialog.firstName")} *</Label>
                <Input id="nb-first" value={firstName} onChange={(e) => editCustomer(setFirstName)(e.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-last">{t("dialog.lastName")}</Label>
                <Input id="nb-last" value={lastName} onChange={(e) => editCustomer(setLastName)(e.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-phone">{t("dialog.phone")} *</Label>
                <Input id="nb-phone" type="tel" value={phone} onChange={(e) => editCustomer(setPhone)(e.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nb-email">{t("dialog.email")}</Label>
                <Input id="nb-email" type="email" value={email} onChange={(e) => editCustomer(setEmail)(e.target.value)} autoComplete="off" />
              </div>
            </div>
            {suggestions.length > 0 && (
              <div className="rounded-md border bg-muted/40 text-sm">
                <p className="px-2 pt-1.5 text-xs text-muted-foreground">{t("dialog.existingCustomers")}</p>
                {suggestions.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="flex w-full items-center justify-between px-2 py-1.5 text-left hover:bg-accent"
                    onClick={() => pickClient(client)}
                  >
                    <span>{client.full_name}</span>
                    <span className="text-muted-foreground">{client.phone_number}</span>
                  </button>
                ))}
              </div>
            )}
            {clientId && <p className="text-xs text-muted-foreground">{t("dialog.existingSelected")}</p>}
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
