"use client"

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Trash2, MessageCircle, UserPlus, FileEdit, AlertCircle, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  notificationsMarkReadCreate,
  notificationsMarkAllReadCreate,
  notificationsClearAllDestroy
} from '@/api/generated/api'
import type { Notification } from '@/api/generated/interfaces'
import { useTranslations } from 'next-intl'

// -------------------------------------------------------------------
// Grouping logic
// -------------------------------------------------------------------

interface GroupedNotification extends Notification {
  _groupCount?: number
  _groupItems?: Notification[]
}

function groupNotifications(notifications: Notification[]): GroupedNotification[] {
  const groups: Map<string, Notification[]> = new Map()

  for (const notif of notifications) {
    // Group by ticket_id if present, otherwise by notification_type + 1-hour time bucket
    const key = notif.ticket_id
      ? `ticket-${notif.ticket_id}`
      : `${notif.notification_type}-${Math.floor(new Date(notif.created_at).getTime() / 3600000)}`

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(notif)
  }

  return Array.from(groups.values()).map((group) => {
    if (group.length === 1) return group[0]
    // Return the most recent notification but with count
    const sorted = [...group].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    return { ...sorted[0], _groupCount: group.length, _groupItems: sorted }
  })
}

// -------------------------------------------------------------------
// Component types
// -------------------------------------------------------------------

interface NotificationListProps {
  notifications: Notification[]
  loading?: boolean
  onNotificationClick?: (notification: Notification) => void
  onUpdate?: () => void
  onMarkAllRead?: () => void
  wsMarkAsRead?: (notificationId: number) => boolean
  wsMarkAllAsRead?: () => boolean
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'ticket_assigned':
      return <UserPlus className="h-4 w-4" />
    case 'ticket_mentioned':
      return <MessageCircle className="h-4 w-4" />
    case 'ticket_commented':
      return <MessageCircle className="h-4 w-4" />
    case 'ticket_status_changed':
      return <FileEdit className="h-4 w-4" />
    case 'ticket_updated':
      return <FileEdit className="h-4 w-4" />
    case 'ticket_due_soon':
      return <AlertCircle className="h-4 w-4" />
    case 'bug_report_update':
      return <Bug className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'ticket_assigned':
      return 'text-blue-600'
    case 'ticket_mentioned':
      return 'text-purple-600'
    case 'ticket_commented':
      return 'text-green-600'
    case 'ticket_status_changed':
      return 'text-orange-600'
    case 'ticket_due_soon':
      return 'text-red-600'
    case 'bug_report_update':
      return 'text-green-600'
    default:
      return 'text-gray-600'
  }
}

export function NotificationList({
  notifications,
  loading = false,
  onNotificationClick,
  onUpdate,
  onMarkAllRead,
  wsMarkAsRead,
  wsMarkAllAsRead
}: NotificationListProps) {
  const router = useRouter()
  const t = useTranslations('notificationList')
  const tPrefs = useTranslations('notificationPreferences')
  const now = Date.now()
  // Short relative time with our own strings (browsers ship no Georgian relative-time data).
  const ago = (iso?: string | null) => {
    if (!iso) return ''
    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
    if (minutes < 1) return t('justNow')
    if (minutes < 60) return t('minutesAgo', { count: minutes })
    const hours = Math.round(minutes / 60)
    if (hours < 24) return t('hoursAgo', { count: hours })
    return t('daysAgo', { count: Math.round(hours / 24) })
  }

  // Memoize grouped notifications
  const groupedNotifications = useMemo(
    () => groupNotifications(notifications),
    [notifications],
  )

  const getBugReportText = (notification: Notification) => {
    if ((notification.notification_type as unknown as string) !== 'bug_report_update') return null
    const status = (notification.metadata as any)?.status as string | undefined
    if (!status) return null
    try {
      return {
        title: t(`bugReport.${status}.title`),
        message: t(`bugReport.${status}.message`),
      }
    } catch {
      return null
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read - try WebSocket first, fallback to API
    if (!notification.is_read) {
      try {
        // Try WebSocket first (instant)
        const wsSent = wsMarkAsRead?.(notification.id)

        // If WebSocket not available or failed, use API
        if (!wsSent) {
          await notificationsMarkReadCreate(notification.id.toString(), {} as any)
          onUpdate?.()
        }
        // If WebSocket succeeded, the onNotificationRead callback in NotificationBell will handle the update
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    // Callback will handle navigation
    onNotificationClick?.(notification)
  }

  const handleMarkAllRead = async () => {
    try {
      // Try WebSocket first (instant)
      const wsSent = wsMarkAllAsRead?.()

      // If WebSocket not available or failed, use API
      if (!wsSent) {
        await notificationsMarkAllReadCreate({} as any)
      }

      // Always call the callback to update local state
      onMarkAllRead?.()
      onUpdate?.()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleClearAll = async () => {
    try {
      await notificationsClearAllDestroy()
      onUpdate?.()
    } catch (error) {
      console.error('Failed to clear notifications:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="flex max-h-[460px] flex-col">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
        <h3 className="text-[13px] font-semibold">{t('title')}</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={handleMarkAllRead}
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Notification List */}
      <ScrollArea className="max-h-[360px] flex-1">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">{t('loading')}</div>
        ) : groupedNotifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-xs text-muted-foreground">{t('empty')}</p>
          </div>
        ) : (
          <div className="flex flex-col p-1">
            {groupedNotifications.map((notification) => {
              const grouped = notification as GroupedNotification
              const bugText = getBugReportText(notification)
              const groupCount = grouped._groupCount
              const unread = !notification.is_read
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex w-full gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-muted',
                    unread && 'bg-primary/[0.04] dark:bg-primary/[0.08]'
                  )}
                >
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted [&>svg]:h-[13px] [&>svg]:w-[13px]',
                    getNotificationColor(notification.notification_type as any)
                  )}>
                    {getNotificationIcon(notification.notification_type as any)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5">
                      <span className={cn('truncate text-xs leading-4', unread ? 'font-semibold' : 'font-medium')}>
                        {bugText?.title ?? notification.title}
                      </span>
                      {groupCount && groupCount > 1 && (
                        <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
                          {tPrefs('groupedUpdates', { count: groupCount })}
                        </Badge>
                      )}
                    </span>
                    <span className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                      {bugText?.message ?? notification.message}
                    </span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[10px] leading-4 text-muted-foreground">
                    {ago(notification.created_at)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-center text-xs text-muted-foreground"
              onClick={handleClearAll}
            >
              <Trash2 className="me-1 h-3 w-3" />
              {t('clearRead')}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
