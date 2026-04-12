"use client"

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Trash2, MessageCircle, UserPlus, FileEdit, AlertCircle, Bug } from 'lucide-react'
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
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : groupedNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {groupedNotifications.map((notification) => {
              const grouped = notification as GroupedNotification
              const bugText = getBugReportText(notification)
              const groupCount = grouped._groupCount
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full text-left p-4 hover:bg-muted/50 transition-colors',
                    !notification.is_read && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      'flex-shrink-0 mt-1',
                      getNotificationColor(notification.notification_type as any)
                    )}>
                      {getNotificationIcon(notification.notification_type as any)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={cn(
                          'text-sm font-medium',
                          !notification.is_read && 'font-semibold'
                        )}>
                          {bugText?.title ?? notification.title}
                        </p>
                        {groupCount && groupCount > 1 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {tPrefs('groupedUpdates', { count: groupCount })}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {bugText?.message ?? notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.time_ago} ago
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                      </div>
                    )}
                  </div>
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
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={handleClearAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear read notifications
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
