import { useEffect, useRef, useCallback, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import type { TeamChatMessage, TeamChatUser, WSMessage } from './types';

interface UseTeamChatWebSocketOptions {
  onNewMessage?: (message: TeamChatMessage, conversationId: number) => void;
  onTypingIndicator?: (userId: number, userName: string, isTyping: boolean) => void;
  onReadReceipt?: (messageIds: number[], readBy: number, conversationId: number) => void;
  onUserOnline?: (userId: number, isOnline: boolean, userName: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  autoReconnect?: boolean;
}

export function useTeamChatWebSocket({
  onNewMessage,
  onTypingIndicator,
  onReadReceipt,
  onUserOnline,
  onConnectionChange,
  autoReconnect = true,
}: UseTeamChatWebSocketOptions = {}) {
  const { tenant } = useTenant();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Map<number, string>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  // Store callbacks in refs
  const onNewMessageRef = useRef(onNewMessage);
  const onTypingIndicatorRef = useRef(onTypingIndicator);
  const onReadReceiptRef = useRef(onReadReceipt);
  const onUserOnlineRef = useRef(onUserOnline);
  const onConnectionChangeRef = useRef(onConnectionChange);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onTypingIndicatorRef.current = onTypingIndicator;
    onReadReceiptRef.current = onReadReceipt;
    onUserOnlineRef.current = onUserOnline;
    onConnectionChangeRef.current = onConnectionChange;
  }, [onNewMessage, onTypingIndicator, onReadReceipt, onUserOnline, onConnectionChange]);

  const tenantRef = useRef(tenant);
  useEffect(() => {
    tenantRef.current = tenant;
  }, [tenant]);

  const connectedSchemaRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    const currentTenant = tenantRef.current;

    if (!currentTenant?.schema_name) {
      return;
    }

    if (!shouldConnectRef.current) {
      return;
    }

    // Prevent multiple concurrent connections
    if (isConnectingRef.current) {
      return;
    }

    // Already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;

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

      const wsUrl = `${protocol}//${host}/ws/team-chat/${currentTenant.schema_name}/?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
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
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'connection':
              // Initial connection with online users list
              if (data.online_users) {
                const users = new Map<number, string>();
                data.online_users.forEach((u: { user_id: number; user_name: string }) => {
                  users.set(u.user_id, u.user_name);
                });
                setOnlineUsers(users);
              }
              break;

            case 'new_message':
              if (data.message) {
                onNewMessageRef.current?.(data.message, data.conversation_id);
              }
              break;

            case 'message_sent':
              // Confirmation of our sent message
              if (data.message) {
                onNewMessageRef.current?.(data.message, data.conversation_id);
              }
              break;

            case 'typing_indicator':
              onTypingIndicatorRef.current?.(
                data.user_id,
                data.user_name,
                data.is_typing
              );
              break;

            case 'read_receipt':
              onReadReceiptRef.current?.(
                data.message_ids,
                data.read_by,
                data.conversation_id
              );
              break;

            case 'user_online':
              setOnlineUsers((prev) => {
                const next = new Map(prev);
                if (data.is_online) {
                  next.set(data.user_id, data.user_name);
                } else {
                  next.delete(data.user_id);
                }
                return next;
              });
              onUserOnlineRef.current?.(
                data.user_id,
                data.is_online,
                data.user_name
              );
              break;

            case 'pong':
              break;

            case 'error':
              console.error('[TeamChatWS] Server error:', data.message);
              if (data.code === 'UNAUTHENTICATED') {
                shouldConnectRef.current = false;
              }
              break;

            default:
              break;
          }
        } catch (error) {
          console.error('[TeamChatWS] Error parsing message:', error);
        }
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (autoReconnect && shouldConnectRef.current) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(
            3000 * Math.pow(2, reconnectAttemptsRef.current - 1),
            30000
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      console.error('[TeamChatWS] Connection error:', error);
      setIsConnected(false);
      onConnectionChangeRef.current?.(false);
    }
  }, [autoReconnect]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    connectedSchemaRef.current = null;
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;

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

  const sendMessage = useCallback((recipientId: number, text: string, messageType: string = 'text') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        recipient_id: recipientId,
        text,
        message_type: messageType,
      }));
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback((recipientId: number, isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        recipient_id: recipientId,
        is_typing: isTyping,
      }));
      return true;
    }
    return false;
  }, []);

  const sendReadReceipt = useCallback((messageIds: number[], conversationId: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'read',
        message_ids: messageIds,
        conversation_id: conversationId,
      }));
      return true;
    }
    return false;
  }, []);

  // Connect on mount and when tenant changes
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
    onlineUsers,
    connect,
    disconnect,
    sendMessage,
    sendTyping,
    sendReadReceipt,
  };
}
