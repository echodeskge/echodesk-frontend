"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

type NotFoundKey = "title" | "subtitle" | "description" | "homeButton"

/** Mirrors `notFound.*` in src/i18n/messages/en.json. */
const FALLBACK: Record<NotFoundKey, string> = {
  title: "404",
  subtitle: "Page Not Found",
  description: "We couldn't find the page you're looking for. It might have been moved or doesn't exist.",
  homeButton: "Home Page",
}

/**
 * `useTranslations` throws when no NextIntlClientProvider is above us. That
 * happens for the root not-found page on request paths where the root layout
 * bails out of the provider tree (widget embed, booking site) and for method
 * mismatches such as `POST /`, which Next answers with the 404 page before
 * any provider renders (Sentry 1C). Fall back to the English copy then.
 *
 * Hook-order note: the provider either exists or not for the lifetime of a
 * mount, so the number of hooks run inside `useTranslations` is the same on
 * every render of that mount.
 */
function useNotFoundText(): (key: NotFoundKey) => string {
  try {
    return useTranslations("notFound")
  } catch {
    return (key) => FALLBACK[key]
  }
}

export function NotFound404() {
  const t = useNotFoundText()

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-y-6 text-center text-foreground bg-background p-4">
      <div className="flex flex-col-reverse justify-center items-center gap-y-6 md:flex-row md:text-start">
        <Image
          src="/images/illustrations/characters/character-02.svg"
          alt=""
          height={232}
          width={249}
          priority
        />

        <h1 className="inline-grid text-6xl font-black">
          {t("title")} <span className="text-3xl font-semibold">{t("subtitle")}</span>
        </h1>
      </div>
      <p className="max-w-prose text-xl text-muted-foreground">
        {t("description")}
      </p>
      <Button size="lg" asChild>
        <Link href="/">{t("homeButton")}</Link>
      </Button>
    </div>
  )
}
