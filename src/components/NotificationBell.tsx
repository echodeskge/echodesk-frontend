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

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const previousUnreadCount = useRef(0)
  const { showNotification, canShowNotifications, requestPermission } = useBrowserNotifications()

  // Use React Query hook for unread count
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useNotificationsUnreadCount()

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

  // Show browser notification when unread count increases
  useEffect(() => {
    if (unreadCount > previousUnreadCount.current && previousUnreadCount.current > 0) {
      // Only show if we have permission and there's an actual increase
      if (canShowNotifications) {
        // Use browser Notification API directly for generic count notification
        try {
          const notification = new window.Notification('New Notification', {
            body: `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`,
            icon: '/favicon.ico'
          })
          setTimeout(() => notification.close(), 5000)
        } catch (error) {
          console.error('Failed to show notification:', error)
        }
      }
    }
    previousUnreadCount.current = unreadCount
  }, [unreadCount, canShowNotifications])

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
        />
      </PopoverContent>
    </Popover>
  )
}
