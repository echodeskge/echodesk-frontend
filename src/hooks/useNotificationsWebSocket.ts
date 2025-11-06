import { useEffect, useRef, useCallback, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { getNotificationBroadcast } from '@/utils/notificationBroadcast';

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

  console.log('[useNotificationsWebSocket] Hook initialized');
  console.log('[useNotificationsWebSocket] Tenant:', tenant);
  console.log('[useNotificationsWebSocket] Tab ID:', broadcastManager.current.getTabId());
  console.log('[useNotificationsWebSocket] Is leader:', broadcastManager.current.isLeaderTab());

  // Store tenant in ref to avoid recreating connect when tenant object changes
  const tenantRef = useRef(tenant);
  useEffect(() => {
    tenantRef.current = tenant;
  }, [tenant]);

  // Setup broadcast listeners for cross-tab communication
  useEffect(() => {
    const broadcast = broadcastManager.current;

    // Listen for notifications from other tabs
    const unsubNotification = broadcast.on('notification_received', (data) => {
      console.log('[useNotificationsWebSocket] Received notification from another tab:', data);
      setUnreadCount(data.count);
      onNotificationCreatedRef.current?.(data.notification, data.count);
    });

    const unsubRead = broadcast.on('notification_read', (data) => {
      console.log('[useNotificationsWebSocket] Notification read in another tab:', data);
      setUnreadCount(data.count);
      onNotificationReadRef.current?.(data.notificationId, data.count);
    });

    const unsubCount = broadcast.on('count_updated', (data) => {
      console.log('[useNotificationsWebSocket] Count updated in another tab:', data);
      setUnreadCount(data.count);
      onUnreadCountUpdateRef.current?.(data.count);
    });

    // Cleanup
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

    console.log('[NotificationWS] connect() called');
    console.log('[NotificationWS] tenant:', currentTenant);
    console.log('[NotificationWS] shouldConnectRef.current:', shouldConnectRef.current);

    if (!currentTenant?.schema_name) {
      console.warn('[NotificationWS] Cannot connect - no tenant schema name');
      return;
    }

    if (!shouldConnectRef.current) {
      console.warn('[NotificationWS] Cannot connect - shouldConnect is false');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // Determine WebSocket protocol and host from tenant API URL
      const apiUrl = new URL(currentTenant.api_url);
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = apiUrl.host;

      // Get auth token from localStorage
      const token = localStorage.getItem('echodesk_auth_token');

      if (!token) {
        console.warn('[NotificationWS] No auth token found - cannot connect');
        return;
      }

      const wsUrl = `${protocol}//${host}/ws/notifications/${currentTenant.schema_name}/?token=${token}`;

      console.log('[NotificationWS] ========================================');
      console.log('[NotificationWS] Attempting to connect...');
      console.log('[NotificationWS] Protocol:', protocol);
      console.log('[NotificationWS] Host:', host);
      console.log('[NotificationWS] Tenant Schema:', currentTenant.schema_name);
      console.log('[NotificationWS] Full URL:', wsUrl.replace(token, '[TOKEN]'));
      console.log('[NotificationWS] ========================================');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      console.log('[NotificationWS] WebSocket object created:', ws);

      ws.onopen = () => {
        console.log('[NotificationWS] Connected successfully');
        connectedSchemaRef.current = currentTenant.schema_name;
        setIsConnected(true);
        onConnectionChangeRef.current?.(true);

        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;

        // Start ping interval to keep connection alive
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
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('[NotificationWS] Message received:', data.type);

          switch (data.type) {
            case 'connection':
              console.log('[NotificationWS] Connection confirmed:', data);
              if (data.unread_count !== undefined) {
                setUnreadCount(data.unread_count);
                onUnreadCountUpdateRef.current?.(data.unread_count);
              }
              break;

            case 'notification_created':
              console.log('[NotificationWS] New notification:', data);
              if (data.notification) {
                setUnreadCount(data.unread_count || 0);
                onNotificationCreatedRef.current?.(data.notification, data.unread_count || 0);
                onUnreadCountUpdateRef.current?.(data.unread_count || 0);

                // Broadcast to other tabs
                broadcastManager.current.broadcastNotificationReceived(
                  data.notification,
                  data.unread_count || 0
                );
              }
              break;

            case 'notification_read':
              console.log('[NotificationWS] Notification marked as read:', data);
              if (data.notification_id) {
                setUnreadCount(data.unread_count || 0);
                onNotificationReadRef.current?.(data.notification_id, data.unread_count || 0);
                onUnreadCountUpdateRef.current?.(data.unread_count || 0);

                // Broadcast to other tabs
                broadcastManager.current.broadcastNotificationRead(
                  data.notification_id,
                  data.unread_count || 0
                );
              }
              break;

            case 'all_notifications_read':
              console.log('[NotificationWS] All notifications marked as read');
              setUnreadCount(0);
              onUnreadCountUpdateRef.current?.(0);

              // Broadcast to other tabs
              broadcastManager.current.broadcastCountUpdated(0);
              break;

            case 'unread_count_update':
              console.log('[NotificationWS] Unread count update:', data.count);
              setUnreadCount(data.count);
              onUnreadCountUpdateRef.current?.(data.count);

              // Broadcast to other tabs
              broadcastManager.current.broadcastCountUpdated(data.count);
              break;

            case 'pong':
              // Pong response to ping - connection is alive
              break;

            case 'error':
              console.error('[NotificationWS] Server error:', data.message);
              if (data.code === 'UNAUTHENTICATED') {
                // Authentication failed - don't try to reconnect
                shouldConnectRef.current = false;
              }
              break;

            default:
              console.log('[NotificationWS] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[NotificationWS] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[NotificationWS] Error:', error);
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);
      };

      ws.onclose = (event) => {
        console.log('[NotificationWS] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect if enabled and component is still mounted
        if (autoReconnect && shouldConnectRef.current) {
          reconnectAttemptsRef.current += 1;

          // Exponential backoff with max interval
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1),
            maxReconnectInterval
          );

          console.log(`[NotificationWS] Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current})`);
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

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket connection
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
    console.warn('[NotificationWS] Cannot send message - not connected');
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
      console.log('[useNotificationsWebSocket] Skipping connect - no tenant schema');
      return;
    }

    // Check if we're already connected to this schema
    if (connectedSchemaRef.current === schemaName && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[useNotificationsWebSocket] Already connected to schema:', schemaName);
      return;
    }

    console.log('[useNotificationsWebSocket] useEffect running - preparing to connect');
    console.log('[useNotificationsWebSocket] tenant in useEffect:', tenant);
    console.log('[useNotificationsWebSocket] Previous schema:', connectedSchemaRef.current, 'New schema:', schemaName);

    shouldConnectRef.current = true;
    connect();

    // Cleanup on unmount or tenant change
    return () => {
      console.log('[useNotificationsWebSocket] useEffect cleanup - disconnecting');
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.schema_name]);

  console.log('[useNotificationsWebSocket] Rendering - isConnected:', isConnected, 'unreadCount:', unreadCount);

  return {
    isConnected,
    unreadCount,
    connect,
    disconnect,
    sendMessage,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
  };
}
