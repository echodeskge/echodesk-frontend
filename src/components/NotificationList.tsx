"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Trash2, MessageCircle, UserPlus, FileEdit, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  notificationsMarkReadCreate,
  notificationsMarkAllReadCreate,
  notificationsClearAllDestroy
} from '@/api/generated/api'
import type { Notification } from '@/api/generated/interfaces'

interface NotificationListProps {
  notifications: Notification[]
  loading?: boolean
  onNotificationClick?: (notification: Notification) => void
  onUpdate?: () => void
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
    default:
      return 'text-gray-600'
  }
}

export function NotificationList({
  notifications,
  loading = false,
  onNotificationClick,
  onUpdate
}: NotificationListProps) {
  const router = useRouter()

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await notificationsMarkReadCreate(notification.id.toString())
        onUpdate?.()
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    // Navigate to ticket if ticket_id exists
    if (notification.ticket_id) {
      router.push(`/tickets/${notification.ticket_id}`)
    }

    onNotificationClick?.(notification)
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsMarkAllReadCreate({})
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
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
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
                    getNotificationColor(notification.notification_type)
                  )}>
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium mb-1',
                      !notification.is_read && 'font-semibold'
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
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
            ))}
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
