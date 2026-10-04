"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Clock, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BookingService, bookingApi, formatMoney } from "@/lib/booking-api"
import { useSalon } from "./salon-context"

export function ServiceList() {
  const { salon, info } = useSalon()
  const locale = useLocale()
  const t = useTranslations("publicBooking")
  const [services, setServices] = useState<BookingService[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    bookingApi
      .services(salon, locale)
      .then((data) => !cancelled && setServices(data))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [salon, locale])

  // Group by category, keeping the salon's own category order.
  const groups = useMemo(() => {
    const map = new Map<string, { order: number; items: BookingService[] }>()
    for (const service of services || []) {
      if (!service.staff_members.length) continue // nobody can perform it → can't be booked
      const name = service.category?.name_display || ""
      const group = map.get(name) || { order: service.category?.display_order ?? 9999, items: [] }
      group.items.push(service)
      map.set(name, group)
    }
    return [...map.entries()].sort((a, b) => a[1].order - b[1].order)
  }, [services])

  const description = info.description?.[locale] || info.description?.en || info.description?.ka || ""

  return (
    <div className="space-y-6">
      {(description || info.address || info.phone) && (
        <section className="space-y-2">
          {description && <p className="whitespace-pre-line text-sm text-muted-foreground">{description}</p>}
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {info.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {info.address}
              </span>
            )}
            {info.phone && (
              <a href={`tel:${info.phone}`} className="flex items-center gap-1.5 hover:underline">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {info.phone}
              </a>
            )}
          </div>
        </section>
      )}

      <h1 className="text-xl font-semibold">{t("services.title")}</h1>

      {failed ? (
        <p className="text-sm text-destructive">{t("services.loadFailed")}</p>
      ) : services === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("services.empty")}</p>
      ) : (
        groups.map(([category, group]) => (
          <section key={category || "uncategorised"} className="space-y-2">
            {category && <h2 className="text-sm font-medium text-muted-foreground">{category}</h2>}
            <ul className="space-y-2">
              {group.items.map((service) => (
                <li
                  key={service.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{service.name_display}</p>
                    {service.description_display && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {service.description_display}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {t("services.minutes", { count: service.duration_minutes })}
                      </span>
                      <span className="font-medium text-foreground">
                        {Number(service.base_price) ? formatMoney(service.base_price) : t("services.free")}
                      </span>
                    </p>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link href={`/${salon}/book/${service.id}`}>{t("services.book")}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
