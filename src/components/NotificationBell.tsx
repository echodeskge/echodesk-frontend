"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { NotificationList } from '@/components/NotificationList'
import { apiNotificationsList } from '@/api/generated/api'
import type { Notification } from '@/api/generated/interfaces'
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications'
import { useNotificationsUnreadCount } from '@/hooks/useNotifications'
import { useNotificationsWebSocket } from '@/hooks/useNotificationsWebSocket'
import { getNotificationSound } from '@/utils/notificationSound'

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const previousUnreadCount = useRef(0)
  const { showNotification, canShowNotifications, requestPermission } = useBrowserNotifications()
  const notificationSound = useRef(getNotificationSound())

  // WebSocket for real-time notifications
  const {
    isConnected: wsConnected,
    unreadCount: wsUnreadCount,
    markAsRead: wsMarkAsRead,
    markAllAsRead: wsMarkAllAsRead,
  } = useNotificationsWebSocket({
    onNotificationCreated: (notification, count) => {
      console.log('[NotificationBell] New notification received:', notification)

      // Play notification sound
      notificationSound.current.play()

      // Add to notifications list if popover is open
      setNotifications(prev => [notification as Notification, ...prev])

      // Show browser notification
      if (canShowNotifications) {
        try {
          const browserNotification = new window.Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: `notification-${notification.id}`, // Prevent duplicates
            data: { ticketId: notification.ticket_id }, // Store ticket ID in notification data
          })

          // Close after 5 seconds
          setTimeout(() => browserNotification.close(), 5000)

          // Handle click to navigate to ticket
          browserNotification.onclick = () => {
            window.focus()
            browserNotification.close()

            // Navigate to ticket if ticket_id exists
            if (notification.ticket_id) {
              // Use window.location to navigate (works even when app is not focused)
              window.location.href = `/tickets/${notification.ticket_id}`
            }
          }
        } catch (error) {
          console.error('[NotificationBell] Failed to show browser notification:', error)
        }
      }
    },
    onNotificationRead: (notificationId, count) => {
      console.log('[NotificationBell] Notification marked as read:', notificationId)
      // Update local notifications list
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
    },
    onUnreadCountUpdate: (count) => {
      console.log('[NotificationBell] Unread count updated:', count)
    },
    onConnectionChange: (connected) => {
      console.log('[NotificationBell] WebSocket connection:', connected ? 'connected' : 'disconnected')
    }
  })

  // Fallback to React Query polling when WebSocket is disconnected
  const { data: pollingUnreadCount = 0, refetch: refetchUnreadCount } = useNotificationsUnreadCount({
    // Only enable polling when WebSocket is disconnected
    refetchInterval: wsConnected ? false : 30000,
  })

  // Use WebSocket count if connected, otherwise use polling count
  const unreadCount = wsConnected ? wsUnreadCount : pollingUnreadCount

  // Request notification permission on first render
  useEffect(() => {
    if (!canShowNotifications) {
      requestPermission()
    }
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await apiNotificationsList()
      setNotifications(response.results || [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const handleNotificationUpdate = () => {
    // Refresh both count and list
    refetchUnreadCount()
    fetchNotifications()
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[400px] p-0"
        sideOffset={8}
      >
        <NotificationList
          notifications={notifications}
          loading={loading}
          onNotificationClick={(notification) => {
            setIsOpen(false)
            onNotificationClick?.(notification)
          }}
          onUpdate={handleNotificationUpdate}
          wsMarkAsRead={wsMarkAsRead}
          wsMarkAllAsRead={wsMarkAllAsRead}
        />
      </PopoverContent>
    </Popover>
  )
}
