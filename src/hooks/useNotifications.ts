"use client";

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  notificationsVapidPublicKeyRetrieve,
  notificationsTestCreate,
} from '@/api/generated';
import axios from '@/api/axios';

export interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<NotificationPermissionState>({
    permission: 'default',
    isSupported: false,
    isSubscribed: false,
  });

  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
      }));

      // Check if already subscribed
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState(prev => ({ ...prev, isSubscribed: !!subscription }));
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  // Query for VAPID public key
  const { data: vapidKey } = useQuery({
    queryKey: ['vapid-public-key'],
    queryFn: notificationsVapidPublicKeyRetrieve,
    enabled: false, // Only fetch when needed
    staleTime: Infinity, // VAPID key doesn't change
  });

  // Mutation for subscribing
  const subscribeMutation = useMutation({
    mutationFn: async (subscriptionData: any) => {
      const response = await axios.post('/api/notifications/subscribe/', { subscription: subscriptionData });
      return response.data;
    },
    onSuccess: () => {
      setState(prev => ({ ...prev, isSubscribed: true }));
      queryClient.invalidateQueries({ queryKey: ['notification-subscriptions'] });
    },
  });

  // Mutation for unsubscribing
  const unsubscribeMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const response = await axios.post('/api/notifications/unsubscribe/', { endpoint });
      return response.data;
    },
    onSuccess: () => {
      setState(prev => ({ ...prev, isSubscribed: false }));
      queryClient.invalidateQueries({ queryKey: ['notification-subscriptions'] });
    },
  });

  // Mutation for sending test notification
  const testNotificationMutation = useMutation({
    mutationFn: notificationsTestCreate,
  });

  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted') {
        await subscribe();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const subscribe = async (): Promise<PushSubscription | null> => {
    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        await navigator.serviceWorker.ready;
      }

      // Get or create push subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Get VAPID public key from backend
        const data = await notificationsVapidPublicKeyRetrieve();
        const vapidPublicKey = data.public_key;

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Send subscription to backend using React Query mutation
      await subscribeMutation.mutateAsync(subscription.toJSON());

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify backend using React Query mutation
        await unsubscribeMutation.mutateAsync(subscription.endpoint);

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  };

  const sendTestNotification = async () => {
    if (state.permission === 'granted') {
      try {
        await testNotificationMutation.mutateAsync();
      } catch (error) {
        console.error('Error sending test notification:', error);
      }
    }
  };

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    isSendingTest: testNotificationMutation.isPending,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
