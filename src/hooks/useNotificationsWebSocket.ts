import { useEffect, useRef, useCallback, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { getNotificationBroadcast } from '@/utils/notificationBroadcast';
import { getNotificationQueue } from '@/utils/notificationQueue';
import { useOnlineStatus } from './useOnlineStatus';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  ticket_id?: number;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

interface UseNotificationsWebSocketOptions {
  onNotificationCreated?: (notification: Notification, unreadCount: number) => void;
  onNotificationRead?: (notificationId: number, unreadCount: number) => void;
  onUnreadCountUpdate?: (count: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
}

export function useNotificationsWebSocket({
  onNotificationCreated,
  onNotificationRead,
  onUnreadCountUpdate,
  onConnectionChange,
  autoReconnect = true,
  reconnectInterval = 3000,
  maxReconnectInterval = 30000,
}: UseNotificationsWebSocketOptions = {}) {
  const { tenant } = useTenant();
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const broadcastManager = useRef(getNotificationBroadcast());
  const notificationQueue = useRef(getNotificationQueue());

  // Store callbacks in refs to avoid reconnection on callback changes
  const onNotificationCreatedRef = useRef(onNotificationCreated);
  const onNotificationReadRef = useRef(onNotificationRead);
  const onUnreadCountUpdateRef = useRef(onUnreadCountUpdate);
  const onConnectionChangeRef = useRef(onConnectionChange);

  // Update refs when callbacks change
  useEffect(() => {
    onNotificationCreatedRef.current = onNotificationCreated;
    onNotificationReadRef.current = onNotificationRead;
    onUnreadCountUpdateRef.current = onUnreadCountUpdate;
    onConnectionChangeRef.current = onConnectionChange;
  }, [onNotificationCreated, onNotificationRead, onUnreadCountUpdate, onConnectionChange]);

  // Store tenant in ref to avoid recreating connect when tenant object changes
  const tenantRef = useRef(tenant);
  useEffect(() => {
    tenantRef.current = tenant;
  }, [tenant]);

  // Sync queued notifications when back online
  const syncQueuedNotifications = useCallback(async () => {
    const queue = notificationQueue.current;
    const unsynced = await queue.getUnsynced();

    for (const queued of unsynced) {
      onNotificationCreatedRef.current?.(queued.notification, 0);
      await queue.markSynced(queued.id);
    }
  }, []);

  // Monitor online/offline status
  const { isOnline } = useOnlineStatus({
    onOnline: () => {
      syncQueuedNotifications();
      if (!isConnected && shouldConnectRef.current) {
        connect();
      }
    },
  });

  // Setup broadcast listeners for cross-tab communication
  useEffect(() => {
    const broadcast = broadcastManager.current;

    const unsubNotification = broadcast.on('notification_received', (data) => {
      setUnreadCount(data.count);
      onNotificationCreatedRef.current?.(data.notification, data.count);
    });

    const unsubRead = broadcast.on('notification_read', (data) => {
      setUnreadCount(data.count);
      onNotificationReadRef.current?.(data.notificationId, data.count);
    });

    const unsubCount = broadcast.on('count_updated', (data) => {
      setUnreadCount(data.count);
      onUnreadCountUpdateRef.current?.(data.count);
    });

    return () => {
      unsubNotification();
      unsubRead();
      unsubCount();
    };
  }, []);

  // Track the schema name we're connected to
  const connectedSchemaRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    const currentTenant = tenantRef.current;

    if (!currentTenant?.schema_name) {
      return;
    }

    if (!shouldConnectRef.current) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const apiUrl = new URL(currentTenant.api_url);
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = apiUrl.host;

      const token = localStorage.getItem('echodesk_auth_token');

      if (!token) {
        return;
      }

      const wsUrl = `${protocol}//${host}/ws/notifications/${currentTenant.schema_name}/?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedSchemaRef.current = currentTenant.schema_name;
        setIsConnected(true);
        onConnectionChangeRef.current?.(true);
        reconnectAttemptsRef.current = 0;

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now(),
            }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);

          switch (data.type) {
            case 'connection':
              if (data.unread_count !== undefined) {
                setUnreadCount(data.unread_count);
                onUnreadCountUpdateRef.current?.(data.unread_count);
              }
              break;

            case 'notification_created':
              if (data.notification) {
                setUnreadCount(data.unread_count || 0);
                onNotificationCreatedRef.current?.(data.notification, data.unread_count || 0);
                onUnreadCountUpdateRef.current?.(data.unread_count || 0);
                notificationQueue.current.enqueue(data.notification);
                broadcastManager.current.broadcastNotificationReceived(
                  data.notification,
                  data.unread_count || 0
                );
              }
              break;

            case 'notification_read':
              if (data.notification_id) {
                setUnreadCount(data.unread_count || 0);
                onNotificationReadRef.current?.(data.notification_id, data.unread_count || 0);
                onUnreadCountUpdateRef.current?.(data.unread_count || 0);
                broadcastManager.current.broadcastNotificationRead(
                  data.notification_id,
                  data.unread_count || 0
                );
              }
              break;

            case 'all_notifications_read':
              setUnreadCount(0);
              onUnreadCountUpdateRef.current?.(0);
              broadcastManager.current.broadcastCountUpdated(0);
              break;

            case 'unread_count_update':
              setUnreadCount(data.count);
              onUnreadCountUpdateRef.current?.(data.count);
              broadcastManager.current.broadcastCountUpdated(data.count);
              break;

            case 'pong':
              break;

            case 'error':
              console.error('[NotificationWS] Server error:', data.message);
              if (data.code === 'UNAUTHENTICATED') {
                shouldConnectRef.current = false;
              }
              break;

            default:
              break;
          }
        } catch (error) {
          console.error('[NotificationWS] Error parsing message:', error);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (autoReconnect && shouldConnectRef.current) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
            maxReconnectInterval
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[NotificationWS] Connection error:', error);
      setIsConnected(false);
      onConnectionChangeRef.current?.(false);
    }
  }, [autoReconnect, reconnectInterval, maxReconnectInterval]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    connectedSchemaRef.current = null;
    reconnectAttemptsRef.current = 0;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    onConnectionChangeRef.current?.(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const markAsRead = useCallback((notificationId: number) => {
    return sendMessage({
      type: 'mark_read',
      notification_id: notificationId,
    });
  }, [sendMessage]);

  const markAllAsRead = useCallback(() => {
    return sendMessage({
      type: 'mark_all_read',
    });
  }, [sendMessage]);

  const getUnreadCount = useCallback(() => {
    return sendMessage({
      type: 'get_unread_count',
    });
  }, [sendMessage]);

  // Connect on mount and when tenant schema changes
  useEffect(() => {
    const schemaName = tenant?.schema_name;

    if (!schemaName) {
      return;
    }

    if (connectedSchemaRef.current === schemaName && wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    shouldConnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.schema_name]);

  return {
    isConnected,
    isOnline,
    unreadCount,
    connect,
    disconnect,
    sendMessage,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
  };
}
