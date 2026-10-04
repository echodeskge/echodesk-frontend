"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { CalendarCheck, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBookingSession, useSalon } from "./salon-context"

export function SalonHeader() {
  const { salon, info } = useSalon()
  const { session, ready } = useBookingSession()
  const t = useTranslations("publicBooking")
  const locale = useLocale()
  const router = useRouter()

  const switchLocale = async () => {
    const next = locale === "ka" ? "en" : "ka"
    await fetch("/api/set-locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    })
    router.refresh()
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href={`/${salon}`} className="flex min-w-0 items-center gap-3">
          {info.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.logo} alt="" className="h-10 w-10 shrink-0 rounded-md object-contain" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-lg font-semibold text-primary">
              {info.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="truncate text-lg font-semibold">{info.name}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={switchLocale} aria-label={t("header.switchLanguage")}>
            {locale === "ka" ? "EN" : "ქარ"}
          </Button>
          {ready &&
            (session ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/${salon}/account`}>
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  <span className="max-sm:sr-only">{t("header.myBookings")}</span>
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={`/${salon}/login`}>
                  <LogIn className="mr-2 h-4 w-4" />
                  <span className="max-sm:sr-only">{t("header.signIn")}</span>
                </Link>
              </Button>
            ))}
        </div>
      </div>
    </header>
  )
}
