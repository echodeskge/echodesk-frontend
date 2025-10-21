"use client"

import { useEffect, useState, useCallback } from 'react'
import type { Notification } from '@/api/generated/interfaces'

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if browser supports notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Browser notifications are not supported')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [isSupported])

  const showNotification = useCallback((
    notification: Notification,
    onClick?: () => void
  ) => {
    if (!isSupported || permission !== 'granted') {
      return
    }

    try {
      const browserNotification = new window.Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `notification-${notification.id}`,
        requireInteraction: false,
        silent: false,
      })

      browserNotification.onclick = () => {
        window.focus()
        onClick?.()
        browserNotification.close()
      }

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close()
      }, 5000)
    } catch (error) {
      console.error('Error showing browser notification:', error)
    }
  }, [isSupported, permission])

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    canShowNotifications: isSupported && permission === 'granted',
  }
}
