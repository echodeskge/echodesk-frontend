"use client"

import { useQuery } from "@tanstack/react-query"
import { DEFAULT_TIMEZONE, fetchBusinessTimezone } from "./bookings-api"

/**
 * The business timezone saved in Settings → Bookings (`Asia/Tbilisi` by
 * default). "Today" on the bookings screens is the day in this zone, not the
 * browser's. Cached for the session (shared by every bookings page).
 */
export function useBusinessTimezone(): { timezone: string; loaded: boolean } {
  const { data, isSuccess, isError } = useQuery({
    queryKey: ["bookings", "settings", "timezone"],
    queryFn: fetchBusinessTimezone,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
  return { timezone: data || DEFAULT_TIMEZONE, loaded: isSuccess || isError }
}
