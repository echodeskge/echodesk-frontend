import { useEffect, useRef, useCallback, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseMessagesWebSocketOptions {
  onNewMessage?: (data: any) => void;
  onConversationUpdate?: (data: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useMessagesWebSocket({
  onNewMessage,
  onConversationUpdate,
  onConnectionChange,
  autoReconnect = true,
  reconnectInterval = 3000,
}: UseMessagesWebSocketOptions = {}) {
  const { tenant } = useTenant();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);

  // Store callbacks in refs to avoid reconnection on callback changes
  const onNewMessageRef = useRef(onNewMessage);
  const onConversationUpdateRef = useRef(onConversationUpdate);
  const onConnectionChangeRef = useRef(onConnectionChange);

  // Update refs when callbacks change
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onConversationUpdateRef.current = onConversationUpdate;
    onConnectionChangeRef.current = onConnectionChange;
  }, [onNewMessage, onConversationUpdate, onConnectionChange]);

  // Store tenant in ref to avoid recreating connect when tenant object changes
  const tenantRef = useRef(tenant);
  useEffect(() => {
    tenantRef.current = tenant;
  }, [tenant]);

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
      // Determine WebSocket protocol and host from tenant API URL
      const apiUrl = new URL(currentTenant.api_url);
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = apiUrl.host;

      // Get auth token from localStorage (same key as authService)
      const token = localStorage.getItem('echodesk_auth_token');
      const wsUrl = token
        ? `${protocol}//${host}/ws/messages/${currentTenant.schema_name}/?token=${token}`
        : `${protocol}//${host}/ws/messages/${currentTenant.schema_name}/`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedSchemaRef.current = currentTenant.schema_name;
        setIsConnected(true);
        onConnectionChangeRef.current?.(true);

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

          switch (data.type) {
            case 'connection':
              break;

            case 'new_message':
              onNewMessageRef.current?.(data);
              break;

            case 'conversation_update':
              onConversationUpdateRef.current?.(data);
              break;

            case 'read_receipt':
              onConversationUpdateRef.current?.(data);
              break;

            case 'delivery_receipt':
              onConversationUpdateRef.current?.(data);
              break;

            case 'pong':
              break;

            case 'error':
              console.error('[WebSocket] Server error:', data.message);
              break;

            default:
              break;
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect if enabled and component is still mounted
        if (autoReconnect && shouldConnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setIsConnected(false);
      onConnectionChangeRef.current?.(false);
    }
  }, [autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    connectedSchemaRef.current = null;

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
    return false;
  }, []);

  const subscribeToConversation = useCallback((conversationId: string) => {
    return sendMessage({
      type: 'subscribe_conversation',
      conversation_id: conversationId,
    });
  }, [sendMessage]);

  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    return sendMessage({
      type: 'unsubscribe_conversation',
      conversation_id: conversationId,
    });
  }, [sendMessage]);

  // Connect on mount and when tenant schema changes
  useEffect(() => {
    const schemaName = tenant?.schema_name;

    if (!schemaName) {
      return;
    }

    // Check if we're already connected to this schema
    if (connectedSchemaRef.current === schemaName && wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    shouldConnectRef.current = true;
    connect();

    // Cleanup on unmount or tenant change
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.schema_name]);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    subscribeToConversation,
    unsubscribeFromConversation,
  };
}
