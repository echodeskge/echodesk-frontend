"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { SelectField } from "./SelectField"

/** The common zones of the settings pages (Settings → Bookings / Calls / Social). */
export const TIMEZONES = [
  "Asia/Tbilisi",
  "Asia/Yerevan",
  "Asia/Baku",
  "Europe/Istanbul",
  "Europe/Kyiv",
  "Europe/Warsaw",
  "Europe/Berlin",
  "Europe/London",
  "Asia/Dubai",
  "Asia/Almaty",
  "America/New_York",
  "UTC",
]

export const DEFAULT_TIMEZONE = "Asia/Tbilisi"

/** The list, plus the current zone when it is not one of the common ones. */
export function timezoneOptions(current?: string | null): string[] {
  return current && !TIMEZONES.includes(current) ? [current, ...TIMEZONES] : TIMEZONES
}

/** "Asia/Tbilisi (GMT+4)" — offset computed for now, so it follows DST. */
export function timezoneLabel(zone: string): string {
  try {
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value
    return offset ? `${zone.replace(/_/g, " ")} (${offset})` : zone
  } catch {
    return zone
  }
}

/** Native select of the common timezones; `label` defaults to the shared "Timezone". */
export function TimezoneField({
  label,
  help,
  error,
  value,
  onChange,
  className,
  testId = "timezone",
}: {
  label?: ReactNode
  help?: ReactNode
  error?: string | null
  value: string
  onChange: (zone: string) => void
  className?: string
  testId?: string
}) {
  const t = useTranslations("onboarding.fields")
  return (
    <SelectField
      label={label ?? t("timezone")}
      help={help}
      error={error}
      value={value || DEFAULT_TIMEZONE}
      onChange={onChange}
      options={timezoneOptions(value).map((zone) => ({ value: zone, label: timezoneLabel(zone) }))}
      className={className}
      selectClassName="sm:max-w-[300px]"
      testId={testId}
    />
  )
}
