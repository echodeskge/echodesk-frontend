/**
 * Hook for managing Web Push notification subscriptions.
 * Handles service worker registration, push subscription, and backend sync.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

interface UseWebPushOptions {
  /**
   * Whether to automatically subscribe on mount if permission is granted
   */
  autoSubscribe?: boolean
  /**
   * Callback when subscription status changes
   */
  onSubscriptionChange?: (isSubscribed: boolean) => void
  /**
   * Callback when errors occur
   */
  onError?: (error: Error) => void
}

interface UseWebPushReturn {
  /**
   * Whether push notifications are supported in this browser
   */
  isSupported: boolean
  /**
   * Current notification permission status
   */
  permission: NotificationPermission
  /**
   * Whether the user is currently subscribed to push notifications
   */
  isSubscribed: boolean
  /**
   * Whether an operation is in progress
   */
  isLoading: boolean
  /**
   * Request notification permission from the user
   */
  requestPermission: () => Promise<NotificationPermission>
  /**
   * Subscribe to push notifications
   */
  subscribe: () => Promise<boolean>
  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: () => Promise<boolean>
  /**
   * Send a test notification
   */
  sendTestNotification: () => Promise<boolean>
  /**
   * Last error that occurred
   */
  error: Error | null
}

/**
 * Base64 to Uint8Array converter for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Hook for managing Web Push notifications
 */
export function useWebPush(options: UseWebPushOptions = {}): UseWebPushReturn {
  const { autoSubscribe = false, onSubscriptionChange, onError } = options

  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const serviceWorkerRef = useRef<ServiceWorkerRegistration | null>(null)
  const vapidPublicKeyRef = useRef<string | null>(null)

  // Check if push notifications are supported
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
    }
  }, [])

  // Register service worker on mount
  useEffect(() => {
    if (!isSupported) return

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        console.log('[useWebPush] Service Worker registered:', registration)
        serviceWorkerRef.current = registration

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription()
        if (existingSubscription) {
          setIsSubscribed(true)
          console.log('[useWebPush] Already subscribed to push notifications')
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to register service worker')
        console.error('[useWebPush] Service Worker registration failed:', error)
        setError(error)
        onError?.(error)
      }
    }

    registerServiceWorker()
  }, [isSupported, onError])

  // Auto-subscribe if enabled - will request permission if needed
  useEffect(() => {
    if (autoSubscribe && !isSubscribed && !isLoading) {
      // If permission is default, request it first
      if (permission === 'default') {
        requestPermission().then((result) => {
          if (result === 'granted') {
            subscribe()
          }
        })
      } else if (permission === 'granted') {
        // Permission already granted, just subscribe
        subscribe()
      }
    }
  }, [autoSubscribe, permission, isSubscribed, isLoading])

  /**
   * Get VAPID public key from backend
   */
  const getVapidPublicKey = useCallback(async (): Promise<string> => {
    if (vapidPublicKeyRef.current) {
      return vapidPublicKeyRef.current
    }

    try {
      const response = await axios.get('/notifications/vapid-public-key/')
      const publicKey = response.data.public_key
      vapidPublicKeyRef.current = publicKey
      return publicKey
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get VAPID public key')
      console.error('[useWebPush] Failed to get VAPID public key:', error)
      throw error
    }
  }, [])

  /**
   * Request notification permission from user
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      const error = new Error('Push notifications are not supported in this browser')
      setError(error)
      onError?.(error)
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      console.log('[useWebPush] Permission result:', result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to request permission')
      console.error('[useWebPush] Failed to request permission:', error)
      setError(error)
      onError?.(error)
      return 'denied'
    }
  }, [isSupported, onError])

  /**
   * Subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      const error = new Error('Push notifications are not supported')
      setError(error)
      onError?.(error)
      return false
    }

    if (isSubscribed) {
      console.log('[useWebPush] Already subscribed')
      return true
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request permission if not granted
      if (permission !== 'granted') {
        const result = await requestPermission()
        if (result !== 'granted') {
          throw new Error('Notification permission denied')
        }
      }

      // Get service worker registration
      if (!serviceWorkerRef.current) {
        const registration = await navigator.serviceWorker.ready
        serviceWorkerRef.current = registration
      }

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey()
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

      // Subscribe to push notifications
      const subscription = await serviceWorkerRef.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      console.log('[useWebPush] Push subscription created:', subscription)

      // Send subscription to backend
      const subscriptionJson = subscription.toJSON()
      await axios.post('/notifications/subscribe/', {
        subscription: subscriptionJson,
      })

      console.log('[useWebPush] Subscription saved to backend')

      setIsSubscribed(true)
      onSubscriptionChange?.(true)
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to push notifications')
      console.error('[useWebPush] Subscription failed:', error)
      setError(error)
      onError?.(error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, isSubscribed, permission, requestPermission, getVapidPublicKey, onSubscriptionChange, onError])

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isSubscribed) {
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get service worker registration
      if (!serviceWorkerRef.current) {
        const registration = await navigator.serviceWorker.ready
        serviceWorkerRef.current = registration
      }

      // Get current subscription
      const subscription = await serviceWorkerRef.current.pushManager.getSubscription()
      if (!subscription) {
        setIsSubscribed(false)
        return true
      }

      // Unsubscribe from browser
      await subscription.unsubscribe()
      console.log('[useWebPush] Push subscription removed')

      // Notify backend
      const subscriptionJson = subscription.toJSON()
      await axios.post('/notifications/unsubscribe/', {
        endpoint: subscriptionJson.endpoint,
      })

      console.log('[useWebPush] Subscription removed from backend')

      setIsSubscribed(false)
      onSubscriptionChange?.(false)
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unsubscribe from push notifications')
      console.error('[useWebPush] Unsubscribe failed:', error)
      setError(error)
      onError?.(error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, isSubscribed, onSubscriptionChange, onError])

  /**
   * Send a test notification
   */
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    if (!isSubscribed) {
      const error = new Error('Not subscribed to push notifications')
      setError(error)
      onError?.(error)
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await axios.post('/notifications/test/')
      console.log('[useWebPush] Test notification sent:', response.data)
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send test notification')
      console.error('[useWebPush] Test notification failed:', error)
      setError(error)
      onError?.(error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isSubscribed, onError])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    error,
  }
}
