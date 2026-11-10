"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsSection, SettingsToggle } from '@/components/redesign/settings'
import { Bell, MessageCircle, Receipt, CalendarDays, Calendar, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import axiosInstance from '@/api/axios'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface ChannelPreference {
  inApp: boolean
  sound: boolean
  push: boolean
}

interface CategoryPreference {
  [subType: string]: ChannelPreference
}

interface NotificationPreferences {
  tickets: CategoryPreference
  messages: CategoryPreference
  invoices: CategoryPreference
  leave: CategoryPreference
  bookings: CategoryPreference
  calls: CategoryPreference
}

const STORAGE_KEY = 'notification_preferences'

// -------------------------------------------------------------------
// Default preferences (everything enabled)
// -------------------------------------------------------------------

function defaultPreferences(): NotificationPreferences {
  return {
    tickets: {
      assigned: { inApp: true, sound: true, push: true },
      commented: { inApp: true, sound: true, push: true },
      mentioned: { inApp: true, sound: true, push: true },
      status_changed: { inApp: true, sound: true, push: true },
    },
    messages: {
      new_message: { inApp: true, sound: true, push: true },
      message_assigned: { inApp: true, sound: true, push: true },
      team_chat: { inApp: true, sound: true, push: true },
      social_admin: { inApp: true, sound: true, push: true },
    },
    invoices: {
      created: { inApp: true, sound: true, push: true },
      paid: { inApp: true, sound: true, push: true },
      overdue: { inApp: true, sound: true, push: true },
    },
    leave: {
      submitted: { inApp: true, sound: true, push: true },
      approved: { inApp: true, sound: true, push: true },
      rejected: { inApp: true, sound: true, push: true },
      progress: { inApp: true, sound: true, push: true },
      awaiting_approval: { inApp: true, sound: true, push: true },
      cancelled: { inApp: true, sound: true, push: true },
    },
    bookings: {
      confirmed: { inApp: true, sound: true, push: true },
      cancelled: { inApp: true, sound: true, push: true },
      reminder: { inApp: true, sound: true, push: true },
      assigned: { inApp: true, sound: true, push: true },
    },
    calls: {
      missed: { inApp: true, sound: true, push: true },
      voicemail: { inApp: true, sound: true, push: true },
    },
  }
}

// -------------------------------------------------------------------
// Persistence helpers
// -------------------------------------------------------------------

function loadPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return defaultPreferences()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPreferences()
    const parsed = JSON.parse(raw) as NotificationPreferences
    // Merge with defaults to handle newly added categories/sub-types
    const defaults = defaultPreferences()
    for (const cat of Object.keys(defaults) as (keyof NotificationPreferences)[]) {
      if (!parsed[cat]) {
        parsed[cat] = defaults[cat]
      } else {
        for (const sub of Object.keys(defaults[cat])) {
          if (!parsed[cat][sub]) {
            parsed[cat][sub] = defaults[cat][sub]
          }
        }
      }
    }
    return parsed
  } catch {
    return defaultPreferences()
  }
}

function savePreferences(prefs: NotificationPreferences) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

// -------------------------------------------------------------------
// Public helper: read a specific preference at runtime
// -------------------------------------------------------------------

export function getNotificationPreference(
  category: keyof NotificationPreferences,
  subType: string,
  channel: keyof ChannelPreference,
): boolean {
  const prefs = loadPreferences()
  return prefs[category]?.[subType]?.[channel] ?? true
}

// -------------------------------------------------------------------
// Map notification_type strings (e.g. "ticket_assigned") to category + subType
// -------------------------------------------------------------------

const NOTIFICATION_TYPE_MAP: Record<string, { category: keyof NotificationPreferences; subType: string }> = {
  // Tickets
  ticket_assigned: { category: 'tickets', subType: 'assigned' },
  ticket_commented: { category: 'tickets', subType: 'commented' },
  ticket_mentioned: { category: 'tickets', subType: 'mentioned' },
  ticket_status_changed: { category: 'tickets', subType: 'status_changed' },
  ticket_updated: { category: 'tickets', subType: 'status_changed' },
  ticket_due_soon: { category: 'tickets', subType: 'status_changed' },

  // Messages
  message_received: { category: 'messages', subType: 'new_message' },
  message_assigned: { category: 'messages', subType: 'message_assigned' },
  team_chat_message: { category: 'messages', subType: 'team_chat' },
  auto_post_draft: { category: 'messages', subType: 'social_admin' },
  auto_post_failed: { category: 'messages', subType: 'social_admin' },
  whatsapp_template_status: { category: 'messages', subType: 'social_admin' },

  // Invoices
  invoice_created: { category: 'invoices', subType: 'created' },
  invoice_paid: { category: 'invoices', subType: 'paid' },
  invoice_overdue: { category: 'invoices', subType: 'overdue' },

  // Leave
  leave_request_submitted: { category: 'leave', subType: 'submitted' },
  leave_request_approved: { category: 'leave', subType: 'approved' },
  leave_request_rejected: { category: 'leave', subType: 'rejected' },
  leave_request_progress: { category: 'leave', subType: 'progress' },
  leave_request_awaiting_approval: { category: 'leave', subType: 'awaiting_approval' },
  leave_request_cancelled: { category: 'leave', subType: 'cancelled' },

  // Bookings
  // booking_created / booking_rescheduled (online bookings by customers)
  // are not mapped: they are always shown.
  booking_confirmed: { category: 'bookings', subType: 'confirmed' },
  booking_cancelled: { category: 'bookings', subType: 'cancelled' },
  booking_reminder: { category: 'bookings', subType: 'reminder' },
  booking_assigned: { category: 'bookings', subType: 'assigned' },

  // Calls
  call_missed: { category: 'calls', subType: 'missed' },
  call_voicemail: { category: 'calls', subType: 'voicemail' },
}

/**
 * Get all channel preferences for a notification_type string (e.g. "ticket_assigned").
 * Returns { inApp, sound, push } — defaults to all true for unknown types.
 */
export function getNotificationPreferenceByType(notificationType: string): ChannelPreference {
  const mapping = NOTIFICATION_TYPE_MAP[notificationType]
  if (!mapping) {
    return { inApp: true, sound: true, push: true }
  }

  const prefs = loadPreferences()
  const catPref = prefs[mapping.category]?.[mapping.subType]
  return catPref ?? { inApp: true, sound: true, push: true }
}

// -------------------------------------------------------------------
// Category metadata
// -------------------------------------------------------------------

interface CategoryMeta {
  key: keyof NotificationPreferences
  labelKey: string
  icon: React.ElementType
  subTypes: { key: string }[]
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: 'tickets',
    labelKey: 'tickets',
    icon: Bell,
    subTypes: [
      { key: 'assigned' },
      { key: 'commented' },
      { key: 'mentioned' },
      { key: 'status_changed' },
    ],
  },
  {
    key: 'messages',
    labelKey: 'messages',
    icon: MessageCircle,
    subTypes: [
      { key: 'new_message' },
      { key: 'message_assigned' },
      { key: 'team_chat' },
      { key: 'social_admin' },
    ],
  },
  {
    key: 'invoices',
    labelKey: 'invoices',
    icon: Receipt,
    subTypes: [
      { key: 'created' },
      { key: 'paid' },
      { key: 'overdue' },
    ],
  },
  {
    key: 'leave',
    labelKey: 'leave',
    icon: CalendarDays,
    subTypes: [
      { key: 'submitted' },
      { key: 'approved' },
      { key: 'rejected' },
      { key: 'progress' },
      { key: 'awaiting_approval' },
      { key: 'cancelled' },
    ],
  },
  {
    key: 'bookings',
    labelKey: 'bookings',
    icon: Calendar,
    subTypes: [
      { key: 'confirmed' },
      { key: 'cancelled' },
      { key: 'reminder' },
      { key: 'assigned' },
    ],
  },
  {
    key: 'calls',
    labelKey: 'calls',
    icon: Phone,
    subTypes: [
      { key: 'missed' },
      { key: 'voicemail' },
    ],
  },
]

const CHANNELS: { key: keyof ChannelPreference; labelKey: string }[] = [
  { key: 'inApp', labelKey: 'inApp' },
  { key: 'sound', labelKey: 'sound' },
  { key: 'push', labelKey: 'push' },
]

// -------------------------------------------------------------------
// API sync helpers
// -------------------------------------------------------------------

interface ApiNotificationPreference {
  notification_type: string
  in_app: boolean
  sound: boolean
  push: boolean
}

/** Fetch preferences from the backend API */
async function fetchPreferencesFromApi(): Promise<ApiNotificationPreference[] | null> {
  try {
    const response = await axiosInstance.get('/api/notification-preferences/')
    return response.data
  } catch {
    return null
  }
}

/** Save preferences to the backend API */
async function savePreferencesToApi(prefs: ApiNotificationPreference[]): Promise<void> {
  try {
    await axiosInstance.put('/api/notification-preferences/bulk/', prefs)
  } catch {
    // Silently fail — localStorage still has the data
  }
}

/** Convert our internal structure into the flat API format */
function prefsToApiFormat(prefs: NotificationPreferences): ApiNotificationPreference[] {
  const result: ApiNotificationPreference[] = []
  for (const [notificationType, mapping] of Object.entries(NOTIFICATION_TYPE_MAP)) {
    const catPref = prefs[mapping.category]?.[mapping.subType]
    if (catPref) {
      result.push({
        notification_type: notificationType,
        in_app: catPref.inApp,
        sound: catPref.sound,
        push: catPref.push,
      })
    }
  }
  return result
}

/** Merge API preferences into local preferences (API takes priority) */
function mergeApiPreferences(
  local: NotificationPreferences,
  apiPrefs: ApiNotificationPreference[],
): NotificationPreferences {
  const merged = { ...local }
  for (const apiPref of apiPrefs) {
    const mapping = NOTIFICATION_TYPE_MAP[apiPref.notification_type]
    if (!mapping) continue

    if (!merged[mapping.category]) continue
    if (!merged[mapping.category][mapping.subType]) continue

    merged[mapping.category] = {
      ...merged[mapping.category],
      [mapping.subType]: {
        inApp: apiPref.in_app,
        sound: apiPref.sound,
        push: apiPref.push,
      },
    }
  }
  return merged
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function NotificationPreferences({
  variant = 'card',
}: {
  /** `settings`: design form section (settings shell); `card`: standalone card (preferences page). */
  variant?: 'card' | 'settings'
} = {}) {
  const t = useTranslations('notificationPreferences')
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced API save (500ms after last change)
  const debouncedApiSave = useCallback((nextPrefs: NotificationPreferences) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      savePreferencesToApi(prefsToApiFormat(nextPrefs))
    }, 500)
  }, [])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  // Load from localStorage on mount, then merge with API data
  useEffect(() => {
    const localPrefs = loadPreferences()
    setPrefs(localPrefs)

    // Fetch from API and merge (API takes priority)
    fetchPreferencesFromApi().then((apiPrefs) => {
      if (apiPrefs && apiPrefs.length > 0) {
        const merged = mergeApiPreferences(localPrefs, apiPrefs)
        setPrefs(merged)
        savePreferences(merged) // Update localStorage with merged result
      }
    })
  }, [])

  const toggle = useCallback(
    (
      category: keyof NotificationPreferences,
      subType: string,
      channel: keyof ChannelPreference,
    ) => {
      setPrefs((prev) => {
        const next = {
          ...prev,
          [category]: {
            ...prev[category],
            [subType]: {
              ...prev[category][subType],
              [channel]: !prev[category][subType][channel],
            },
          },
        }
        savePreferences(next)
        debouncedApiSave(next)
        return next
      })
    },
    [debouncedApiSave],
  )

  // Toggle an entire channel column for a category
  const toggleCategoryChannel = useCallback(
    (category: keyof NotificationPreferences, channel: keyof ChannelPreference) => {
      setPrefs((prev) => {
        const catPrefs = prev[category]
        const allEnabled = Object.values(catPrefs).every((sub) => sub[channel])
        const newValue = !allEnabled
        const updated: CategoryPreference = {}
        for (const sub of Object.keys(catPrefs)) {
          updated[sub] = { ...catPrefs[sub], [channel]: newValue }
        }
        const next = { ...prev, [category]: updated }
        savePreferences(next)
        debouncedApiSave(next)
        return next
      })
    },
    [debouncedApiSave],
  )

  const matrix = (
    <div role="group" aria-label={t('title')} data-testid="notification-preferences-matrix">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon
        const catPrefs = prefs[cat.key]

        return (
          <div key={cat.key} className="border-b last:border-b-0" data-testid={`notification-category-${cat.key}`}>
            {/* Category header with bulk toggles */}
            <div className="flex min-h-10 items-center gap-2 bg-muted/20 py-1.5 pe-2 ps-4">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t(cat.labelKey)}</span>
              <div className="flex shrink-0 items-center">
                {CHANNELS.map((ch) => {
                  const allOn = Object.values(catPrefs).every((s) => s[ch.key])
                  return (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => toggleCategoryChannel(cat.key, ch.key)}
                      aria-pressed={allOn}
                      className="flex w-14 flex-col items-center gap-1 rounded-md py-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="max-w-full truncate px-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t(ch.labelKey)}
                      </span>
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${
                          allOn ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sub-type rows */}
            {cat.subTypes.map((sub) => {
              const subPref = catPrefs[sub.key]
              const subLabel = t(`types.${cat.key}.${sub.key}`)
              return (
                <div
                  key={sub.key}
                  className="flex min-h-10 items-center gap-2 border-t border-border/60 py-1.5 pe-2 ps-4 sm:ps-[38px]"
                >
                  <span className="min-w-0 flex-1 text-[13px] text-muted-foreground">
                    {subLabel}
                  </span>
                  <div className="flex shrink-0 items-center">
                    {CHANNELS.map((ch) => (
                      <span key={ch.key} className="flex w-14 justify-center">
                        <SettingsToggle
                          size="sm"
                          checked={subPref[ch.key]}
                          onCheckedChange={() => toggle(cat.key, sub.key, ch.key)}
                          aria-label={`${subLabel} ${t(ch.labelKey)}`}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )

  // Inside the settings shell: a design form section. Elsewhere
  // (/preferences/notifications): the same matrix in the original card.
  if (variant === 'settings') {
    return (
      <SettingsSection title={t('title')} hint={t('subtitle')} testId="notification-preferences">
        {matrix}
      </SettingsSection>
    )
  }

  return (
    <Card data-testid="notification-preferences">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="border-t p-0">{matrix}</CardContent>
    </Card>
  )
}
