"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, MessageCircle, Receipt, CalendarDays, Calendar, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
    },
    bookings: {
      confirmed: { inApp: true, sound: true, push: true },
      cancelled: { inApp: true, sound: true, push: true },
      reminder: { inApp: true, sound: true, push: true },
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
// Category metadata
// -------------------------------------------------------------------

interface CategoryMeta {
  key: keyof NotificationPreferences
  labelKey: string
  icon: React.ElementType
  subTypes: { key: string; label: string }[]
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: 'tickets',
    labelKey: 'tickets',
    icon: Bell,
    subTypes: [
      { key: 'assigned', label: 'Assigned' },
      { key: 'commented', label: 'Commented' },
      { key: 'mentioned', label: 'Mentioned' },
      { key: 'status_changed', label: 'Status Changed' },
    ],
  },
  {
    key: 'messages',
    labelKey: 'messages',
    icon: MessageCircle,
    subTypes: [
      { key: 'new_message', label: 'New Message' },
      { key: 'message_assigned', label: 'Message Assigned' },
    ],
  },
  {
    key: 'invoices',
    labelKey: 'invoices',
    icon: Receipt,
    subTypes: [
      { key: 'created', label: 'Created' },
      { key: 'paid', label: 'Paid' },
      { key: 'overdue', label: 'Overdue' },
    ],
  },
  {
    key: 'leave',
    labelKey: 'leave',
    icon: CalendarDays,
    subTypes: [
      { key: 'submitted', label: 'Submitted' },
      { key: 'approved', label: 'Approved' },
      { key: 'rejected', label: 'Rejected' },
    ],
  },
  {
    key: 'bookings',
    labelKey: 'bookings',
    icon: Calendar,
    subTypes: [
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'cancelled', label: 'Cancelled' },
      { key: 'reminder', label: 'Reminder' },
    ],
  },
  {
    key: 'calls',
    labelKey: 'calls',
    icon: Phone,
    subTypes: [
      { key: 'missed', label: 'Missed' },
      { key: 'voicemail', label: 'Voicemail' },
    ],
  },
]

const CHANNELS: { key: keyof ChannelPreference; labelKey: string }[] = [
  { key: 'inApp', labelKey: 'inApp' },
  { key: 'sound', labelKey: 'sound' },
  { key: 'push', labelKey: 'push' },
]

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function NotificationPreferences() {
  const t = useTranslations('notificationPreferences')
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPreferences)

  // Load from localStorage on mount
  useEffect(() => {
    setPrefs(loadPreferences())
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
        return next
      })
    },
    [],
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
        return next
      })
    },
    [],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          const catPrefs = prefs[cat.key]

          return (
            <div key={cat.key} className="space-y-3">
              {/* Category header with bulk toggles */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-semibold">{t(cat.labelKey)}</Label>
                </div>
                <div className="flex items-center gap-4">
                  {CHANNELS.map((ch) => {
                    const allOn = Object.values(catPrefs).every((s) => s[ch.key])
                    return (
                      <button
                        key={ch.key}
                        type="button"
                        onClick={() => toggleCategoryChannel(cat.key, ch.key)}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {t(ch.labelKey)}
                        </span>
                        <span
                          className={`h-2 w-2 rounded-full ${
                            allOn ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sub-type rows */}
              <div className="ml-6 space-y-2">
                {cat.subTypes.map((sub) => {
                  const subPref = catPrefs[sub.key]
                  return (
                    <div
                      key={sub.key}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm text-muted-foreground">
                        {sub.label}
                      </span>
                      <div className="flex items-center gap-4">
                        {CHANNELS.map((ch) => (
                          <Switch
                            key={ch.key}
                            checked={subPref[ch.key]}
                            onCheckedChange={() => toggle(cat.key, sub.key, ch.key)}
                            className="scale-75"
                            aria-label={`${sub.label} ${t(ch.labelKey)}`}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
