import { useEffect, useRef, useCallback, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';

interface TypingUser {
  user_id: string;
  user_name: string;
}

interface UseTypingWebSocketOptions {
  conversationId?: string;
  onTypingUsersChange?: (users: TypingUser[]) => void;
}

export function useTypingWebSocket({
  conversationId,
  onTypingUsersChange,
}: UseTypingWebSocketOptions = {}) {
  const { tenant } = useTenant();
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const tenantRef = useRef(tenant);
  const conversationIdRef = useRef(conversationId);
  const onTypingUsersChangeRef = useRef(onTypingUsersChange);

  useEffect(() => {
    tenantRef.current = tenant;
    conversationIdRef.current = conversationId;
    onTypingUsersChangeRef.current = onTypingUsersChange;
  }, [tenant, conversationId, onTypingUsersChange]);

  const connect = useCallback(() => {
    const currentTenant = tenantRef.current;
    const currentConversationId = conversationIdRef.current;

    if (!currentTenant?.schema_name || !currentConversationId) {
      return;
    }

    if (!shouldConnectRef.current) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const apiUrl = new URL(currentTenant.api_url);
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = apiUrl.host;

      const token = localStorage.getItem('echodesk_auth_token');
      const wsUrl = token
        ? `${protocol}//${host}/ws/typing/${currentTenant.schema_name}/${currentConversationId}/?token=${token}`
        : `${protocol}//${host}/ws/typing/${currentTenant.schema_name}/${currentConversationId}/`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'error') {
            console.error('[TypingWebSocket] Server error:', data.message, data.code);
            if (data.code === 'UNAUTHENTICATED') {
              shouldConnectRef.current = false;
            }
          } else if (data.type === 'pong') {
            // Pong received
          } else if (data.type === 'connection') {
            // Connection confirmed
          } else if (data.type === 'typing_start') {
            setTypingUsers((prev) => {
              if (prev.some(u => u.user_id === data.user_id)) {
                return prev;
              }
              const updated = [...prev, { user_id: data.user_id, user_name: data.user_name }];
              onTypingUsersChangeRef.current?.(updated);
              return updated;
            });
          } else if (data.type === 'typing_stop') {
            setTypingUsers((prev) => {
              const updated = prev.filter(u => u.user_id !== data.user_id);
              onTypingUsersChangeRef.current?.(updated);
              return updated;
            });
          }
        } catch (error) {
          console.error('[TypingWebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setTypingUsers([]);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (shouldConnectRef.current && currentConversationId && event.code !== 4001) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    } catch (error) {
      console.error('[TypingWebSocket] Connection error:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
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
    setTypingUsers([]);
  }, []);

  const sendTypingStart = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing_start' }));
      return true;
    }
    return false;
  }, []);

  const sendTypingStop = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing_stop' }));
      return true;
    }
    return false;
  }, []);

  const notifyTyping = useCallback(() => {
    if (!isConnected) return;

    sendTypingStart();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 3000);
  }, [isConnected, sendTypingStart, sendTypingStop]);

  useEffect(() => {
    if (!conversationId) {
      disconnect();
      return;
    }

    shouldConnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [conversationId, connect, disconnect]);

  return {
    isConnected,
    typingUsers,
    notifyTyping,
    sendTypingStart,
    sendTypingStop,
  };
}
