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

  console.log('[useMessagesWebSocket] Hook initialized');
  console.log('[useMessagesWebSocket] Tenant:', tenant);

  // Store tenant in ref to avoid recreating connect when tenant object changes
  const tenantRef = useRef(tenant);
  useEffect(() => {
    tenantRef.current = tenant;
  }, [tenant]);

  const connect = useCallback(() => {
    const currentTenant = tenantRef.current;

    console.log('[useMessagesWebSocket] connect() called');
    console.log('[useMessagesWebSocket] tenant:', currentTenant);
    console.log('[useMessagesWebSocket] shouldConnectRef.current:', shouldConnectRef.current);

    if (!currentTenant?.schema_name) {
      console.warn('[WebSocket] Cannot connect - no tenant schema name');
      return;
    }

    if (!shouldConnectRef.current) {
      console.warn('[WebSocket] Cannot connect - shouldConnect is false');
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
      const host = apiUrl.host; // This will be like 'groot.api.echodesk.ge' or 'localhost:8000'

      const wsUrl = `${protocol}//${host}/ws/messages/${currentTenant.schema_name}/`;

      console.log('[WebSocket] ========================================');
      console.log('[WebSocket] Attempting to connect...');
      console.log('[WebSocket] Protocol:', protocol);
      console.log('[WebSocket] Host:', host);
      console.log('[WebSocket] Tenant Schema:', currentTenant.schema_name);
      console.log('[WebSocket] Full URL:', wsUrl);
      console.log('[WebSocket] ========================================');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      console.log('[WebSocket] WebSocket object created:', ws);

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
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
          console.log('[WebSocket] Message received:', data.type);

          switch (data.type) {
            case 'connection':
              console.log('[WebSocket] Connection confirmed:', data);
              break;

            case 'new_message':
              console.log('[WebSocket] New message:', data);
              onNewMessageRef.current?.(data);
              break;

            case 'conversation_update':
              console.log('[WebSocket] Conversation update:', data);
              onConversationUpdateRef.current?.(data);
              break;

            case 'pong':
              // Pong response to ping - connection is alive
              break;

            case 'error':
              console.error('[WebSocket] Server error:', data.message);
              break;

            default:
              console.log('[WebSocket] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect if enabled and component is still mounted
        if (autoReconnect && shouldConnectRef.current) {
          console.log(`[WebSocket] Reconnecting in ${reconnectInterval}ms...`);
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
  }, [autoReconnect, reconnectInterval]); // Removed tenant dependency - using ref instead

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;

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
    console.warn('[WebSocket] Cannot send message - not connected');
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

  // Connect on mount and when tenant changes
  useEffect(() => {
    if (!tenant?.schema_name) {
      console.log('[useMessagesWebSocket] Skipping connect - no tenant schema');
      return;
    }

    console.log('[useMessagesWebSocket] useEffect running - preparing to connect');
    console.log('[useMessagesWebSocket] tenant in useEffect:', tenant);

    shouldConnectRef.current = true;
    connect();

    // Cleanup on unmount or tenant change
    return () => {
      console.log('[useMessagesWebSocket] useEffect cleanup - disconnecting');
      disconnect();
    };
  }, [tenant?.schema_name, connect, disconnect]); // Reconnect when tenant schema changes

  console.log('[useMessagesWebSocket] Rendering - isConnected:', isConnected);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
    subscribeToConversation,
    unsubscribeFromConversation,
  };
}
