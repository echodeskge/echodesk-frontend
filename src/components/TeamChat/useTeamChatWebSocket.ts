import { useEffect, useLayoutEffect, useRef, useCallback, useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import type { TeamChatMessage, TeamChatUser, WSMessage } from './types';

/** Extra info for a `message_sent` echo of one of our own messages. */
export interface SentMessageMeta {
  /** Who we sent it to (from the server frame, or the local send queue). */
  recipientId?: number;
  /** Client id passed to `sendMessage`, for reconciling the optimistic copy. */
  clientId?: string;
}

interface PendingSend {
  recipientId: number;
  clientId?: string;
}

/** Close the socket if no pong arrived for this long (2+ ping intervals). */
const PONG_TIMEOUT_MS = 70000;
const PING_INTERVAL_MS = 30000;

/**
 * Pop the send-queue entry a `message_sent` / send `error` frame refers to.
 * Prefers an exact client_id match; otherwise FIFO (the consumer processes a
 * connection's frames in order, so the oldest pending send is the one).
 */
export function takePendingSend(queue: PendingSend[], clientId?: string | null): PendingSend | undefined {
  if (clientId) {
    const idx = queue.findIndex((p) => p.clientId === clientId);
    if (idx !== -1) return queue.splice(idx, 1)[0];
  }
  return queue.shift();
}

interface UseTeamChatWebSocketOptions {
  /**
   * Called for incoming messages (`new_message`) and for the server's echo of
   * our own messages (`message_sent`, with `meta`).
   */
  onNewMessage?: (message: TeamChatMessage, conversationId: number, meta?: SentMessageMeta) => void;
  /** A message we sent over the socket was rejected by the server. */
  onSendError?: (pending: SentMessageMeta, errorMessage: string) => void;
  /** The socket re-opened after having been connected before: resync state. */
  onReconnect?: () => void;
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
  onSendError,
  onReconnect,
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
  const hasConnectedOnceRef = useRef(false);
  const lastPongRef = useRef(Date.now());
  // Sends awaiting their `message_sent` / `error` frame, oldest first.
  const pendingSendsRef = useRef<PendingSend[]>([]);

  // Store callbacks in refs
  const onNewMessageRef = useRef(onNewMessage);
  const onTypingIndicatorRef = useRef(onTypingIndicator);
  const onReadReceiptRef = useRef(onReadReceipt);
  const onUserOnlineRef = useRef(onUserOnline);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onSendErrorRef = useRef(onSendError);
  const onReconnectRef = useRef(onReconnect);

  // Layout effect: the refs are current before any socket event can run the
  // previous render's callbacks.
  useLayoutEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onTypingIndicatorRef.current = onTypingIndicator;
    onReadReceiptRef.current = onReadReceipt;
    onUserOnlineRef.current = onUserOnline;
    onConnectionChangeRef.current = onConnectionChange;
    onSendErrorRef.current = onSendError;
    onReconnectRef.current = onReconnect;
  }, [onNewMessage, onTypingIndicator, onReadReceipt, onUserOnline, onConnectionChange, onSendError, onReconnect]);

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
        isConnectingRef.current = false;
        return;
      }

      const wsUrl = `${protocol}//${host}/ws/team-chat/${currentTenant.schema_name}/?token=${token}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        isConnectingRef.current = false;
        connectedSchemaRef.current = currentTenant.schema_name;
        setIsConnected(true);
        onConnectionChangeRef.current?.(true);
        reconnectAttemptsRef.current = 0;
        lastPongRef.current = Date.now();
        // Anything still pending belongs to a dead socket; its timeout in the
        // widget marks it failed.
        pendingSendsRef.current = [];

        const isReconnect = hasConnectedOnceRef.current;
        hasConnectedOnceRef.current = true;
        if (isReconnect) {
          // Group sends are not persisted per client: catch up on anything
          // that arrived while we were offline.
          onReconnectRef.current?.();
        }

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          if (Date.now() - lastPongRef.current > PONG_TIMEOUT_MS) {
            // Half-open socket: readyState still says OPEN but nothing comes
            // back. Force a reconnect instead of silently losing messages.
            ws.close();
            return;
          }
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now(),
          }));
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return;
        // Any frame proves the connection is alive.
        lastPongRef.current = Date.now();
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
                // `recipient_id` lets a copy of our OWN message (sent from
                // another tab / device, or over REST) find its window even
                // before that window knows its conversation id.
                onNewMessageRef.current?.(
                  data.message,
                  data.conversation_id ?? data.conversation,
                  data.recipient_id != null ? { recipientId: data.recipient_id } : undefined
                );
              }
              break;

            case 'message_sent': {
              // Confirmation of our sent message. The frame may not say who
              // it went to, so pair it with the matching local send.
              const pending = takePendingSend(pendingSendsRef.current, data.client_id);
              if (data.message) {
                onNewMessageRef.current?.(data.message, data.conversation_id, {
                  recipientId: data.recipient_id ?? pending?.recipientId,
                  clientId: data.client_id ?? pending?.clientId,
                });
              }
              break;
            }

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
              if (data.client_id || data.message === 'Message could not be sent') {
                const pending = takePendingSend(pendingSendsRef.current, data.client_id);
                if (pending) {
                  onSendErrorRef.current?.(
                    { recipientId: pending.recipientId, clientId: pending.clientId },
                    data.message
                  );
                }
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
        if (wsRef.current !== ws) return;
        isConnectingRef.current = false;
        setIsConnected(false);
        onConnectionChangeRef.current?.(false);
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        pendingSendsRef.current = [];
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

  const sendMessage = useCallback((
    recipientId: number,
    text: string,
    messageType: string = 'text',
    clientId?: string
  ) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        recipient_id: recipientId,
        text,
        message_type: messageType,
        ...(clientId ? { client_id: clientId } : {}),
      }));
      pendingSendsRef.current.push({ recipientId, clientId });
      return true;
    }
    return false;
  }, []);

  /**
   * Drop the current socket and connect again right away. Used when a send
   * is not confirmed in time (the socket is probably half-open) and when the
   * browser comes back online / the tab becomes visible with a dead socket.
   */
  const reconnectNow = useCallback(() => {
    if (!shouldConnectRef.current) return;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    const old = wsRef.current;
    wsRef.current = null;
    pendingSendsRef.current = [];
    isConnectingRef.current = false;
    if (old) {
      old.onopen = old.onmessage = old.onerror = old.onclose = null;
      try {
        old.close();
      } catch {
        // ignore
      }
      setIsConnected(false);
      onConnectionChangeRef.current?.(false);
    }
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Reconnect immediately when the network returns or the tab is shown again
  // with a dead socket, instead of waiting out the backoff.
  useEffect(() => {
    const revive = () => {
      if (document.visibilityState === 'hidden') return;
      const ws = wsRef.current;
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        reconnectNow();
      }
    };
    window.addEventListener('online', revive);
    document.addEventListener('visibilitychange', revive);
    return () => {
      window.removeEventListener('online', revive);
      document.removeEventListener('visibilitychange', revive);
    };
  }, [reconnectNow]);

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
    reconnectNow,
    sendMessage,
    sendTyping,
    sendReadReceipt,
  };
}
