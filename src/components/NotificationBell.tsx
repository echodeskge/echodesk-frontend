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
import { notificationsList, notificationsUnreadCountRetrieve } from '@/api/generated/api'
import type { Notification } from '@/api/generated/interfaces'
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications'

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const previousUnreadCount = useRef(0)
  const { showNotification, canShowNotifications, requestPermission } = useBrowserNotifications()

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsUnreadCountRetrieve()
      const newUnreadCount = response.count || 0

      // Check if there are new notifications
      if (newUnreadCount > previousUnreadCount.current && previousUnreadCount.current > 0) {
        // Fetch latest notifications to show browser notification
        const notifs = await notificationsList({ limit: 5 })
        const latestUnread = notifs.results?.find(n => !n.is_read)

        if (latestUnread && canShowNotifications) {
          showNotification(latestUnread, () => {
            if (latestUnread.ticket_id) {
              onNotificationClick?.(latestUnread)
            }
          })
        }
      }

      previousUnreadCount.current = newUnreadCount
      setUnreadCount(newUnreadCount)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

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
      const response = await notificationsList({ limit: 20 })
      setNotifications(response.results || [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchUnreadCount()

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Fetch notifications when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const handleNotificationUpdate = () => {
    // Refresh both count and list
    fetchUnreadCount()
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
        />
      </PopoverContent>
    </Popover>
  )
}
