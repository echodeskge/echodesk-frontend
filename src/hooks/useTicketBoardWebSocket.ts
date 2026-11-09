/**
 * Hook for real-time collaboration on ticket boards via WebSocket.
 * Handles ticket movements, updates, user presence, and live editing indicators.
 *
 * Close codes (plan E7, FE-02):
 * - 1000: normal close, no reconnect;
 * - 4001: not authenticated, no reconnect (retrying cannot help);
 * - 4403: no access to this board, no reconnect, and `onAccessDenied` fires;
 * - anything else: reconnect with exponential backoff and jitter.
 *
 * Events from a socket that is no longer the current one (a board switch while
 * the old socket was still closing) are ignored, so a late close can never
 * schedule a reconnect to the previous board.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTenant } from '@/contexts/TenantContext'

interface ActiveUser {
  user_id: number
  user_name: string
  user_email: string
}

/** Close codes after which the hook never reconnects. */
export const BOARD_WS_NO_RECONNECT_CODES: readonly number[] = [1000, 4001, 4403]
export const BOARD_WS_ACCESS_DENIED_CODE = 4403

interface TicketMovedEvent {
  ticket_id: number
  from_column_id: number | null
  to_column_id: number
  position: number
  updated_by_id: number | null
  updated_by_name: string
}

interface TicketUpdatedEvent {
  ticket_id: number
  changes: Record<string, any>
  updated_by_id: number | null
  updated_by_name: string
}

interface TicketBeingMovedEvent {
  ticket_id: number
  from_column: number
  user_id: number
  user_name: string
}

interface TicketBeingEditedEvent {
  ticket_id: number
  user_id: number
  user_name: string
}

interface UserJoinedEvent {
  user_id: number
  user_name: string
  user_email: string
}

interface TicketDeletedEvent {
  type: 'ticket_deleted'
  ticket_id: number
  deleted_by_id?: number | null
  deleted_by_name?: string | null
  reason?: 'deleted' | 'transferred'
  to_board_id?: number | null
  client_mutation_id?: string | null
}

interface TicketActivityEvent {
  type: 'ticket_activity'
  ticket_id: number
  kind: string
  actor_id?: number | null
  client_mutation_id?: string | null
}

interface UseTicketBoardWebSocketOptions {
  boardId: string | number
  onTicketMoved?: (event: TicketMovedEvent) => void
  onTicketUpdated?: (event: TicketUpdatedEvent) => void
  onTicketCreated?: (ticket: any) => void
  /** The second argument carries `reason` ('deleted' | 'transferred') and `to_board_id`. */
  onTicketDeleted?: (ticketId: number, event: TicketDeletedEvent) => void
  onTicketCommented?: (event: Record<string, unknown> & { ticket_id: number }) => void
  onTicketActivity?: (event: TicketActivityEvent) => void
  /** Every parsed frame, before the typed callbacks (unknown types included). */
  onMessage?: (data: Record<string, unknown>) => void
  /** Close code 4403: the user cannot access this board. No reconnect follows. */
  onAccessDenied?: (boardId: string | number) => void
  onTicketBeingMoved?: (event: TicketBeingMovedEvent) => void
  onTicketBeingEdited?: (event: TicketBeingEditedEvent) => void
  onTicketEditingStopped?: (ticketId: number, userId: number) => void
  onUserJoined?: (user: UserJoinedEvent) => void
  onUserLeft?: (userId: number, userName: string) => void
  onConnectionChange?: (connected: boolean) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectInterval?: number
}

export function useTicketBoardWebSocket({
  boardId,
  onTicketMoved,
  onTicketUpdated,
  onTicketCreated,
  onTicketDeleted,
  onTicketCommented,
  onTicketActivity,
  onMessage,
  onAccessDenied,
  onTicketBeingMoved,
  onTicketBeingEdited,
  onTicketEditingStopped,
  onUserJoined,
  onUserLeft,
  onConnectionChange,
  autoReconnect = true,
  reconnectInterval = 3000,
  maxReconnectInterval = 30000,
}: UseTicketBoardWebSocketOptions) {
  const { tenant } = useTenant()
  const [isConnected, setIsConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [tenantSchema, setTenantSchema] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentBoardIdRef = useRef<string | number | null>(null)
  const reconnectAttemptsRef = useRef(0)

  useEffect(() => {
    if (tenant?.schema_name && !tenantSchema) {
      setTenantSchema(tenant.schema_name)
    }
  }, [tenant?.schema_name, tenantSchema])

  const onTicketMovedRef = useRef(onTicketMoved)
  const onTicketUpdatedRef = useRef(onTicketUpdated)
  const onTicketCreatedRef = useRef(onTicketCreated)
  const onTicketDeletedRef = useRef(onTicketDeleted)
  const onTicketCommentedRef = useRef(onTicketCommented)
  const onTicketActivityRef = useRef(onTicketActivity)
  const onMessageRef = useRef(onMessage)
  const onAccessDeniedRef = useRef(onAccessDenied)
  const onTicketBeingMovedRef = useRef(onTicketBeingMoved)
  const onTicketBeingEditedRef = useRef(onTicketBeingEdited)
  const onTicketEditingStoppedRef = useRef(onTicketEditingStopped)
  const onUserJoinedRef = useRef(onUserJoined)
  const onUserLeftRef = useRef(onUserLeft)
  const onConnectionChangeRef = useRef(onConnectionChange)

  useEffect(() => {
    onTicketMovedRef.current = onTicketMoved
    onTicketUpdatedRef.current = onTicketUpdated
    onTicketCreatedRef.current = onTicketCreated
    onTicketDeletedRef.current = onTicketDeleted
    onTicketCommentedRef.current = onTicketCommented
    onTicketActivityRef.current = onTicketActivity
    onMessageRef.current = onMessage
    onAccessDeniedRef.current = onAccessDenied
    onTicketBeingMovedRef.current = onTicketBeingMoved
    onTicketBeingEditedRef.current = onTicketBeingEdited
    onTicketEditingStoppedRef.current = onTicketEditingStopped
    onUserJoinedRef.current = onUserJoined
    onUserLeftRef.current = onUserLeft
    onConnectionChangeRef.current = onConnectionChange
  })

  const connect = useCallback(() => {
    if (!tenant || !boardId || boardId === 'none') {
      return
    }

    const currentState = wsRef.current?.readyState
    if (currentBoardIdRef.current === boardId &&
        (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING)) {
      setIsConnected(currentState === WebSocket.OPEN)
      return
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      const previous = wsRef.current
      // Detach first: events from the old socket are ignored from here on.
      wsRef.current = null
      if (previous.readyState === WebSocket.OPEN || previous.readyState === WebSocket.CONNECTING) {
        previous.close(1000, 'Switching boards')
      }
    }

    currentBoardIdRef.current = boardId

    try {
      const token = localStorage.getItem('echodesk_auth_token')
      if (!token) {
        console.error('[BoardWS] No auth token found')
        return
      }

      const apiUrl = new URL(tenant.api_url)
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = apiUrl.host
      const wsUrl = `${protocol}//${host}/ws/boards/${tenant.schema_name}/${boardId}/?token=${token}`

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      const isCurrent = () => wsRef.current === ws

      ws.onopen = () => {
        if (!isCurrent()) return
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        setReconnectAttempts(0)
        onConnectionChangeRef.current?.(true)

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        if (!isCurrent()) return
        try {
          const data = JSON.parse(event.data)
          if (!data || typeof data !== 'object') return
          onMessageRef.current?.(data)

          switch (data.type) {
            case 'connection':
              setActiveUsers(data.active_users || [])
              break

            case 'ticket_moved':
              onTicketMovedRef.current?.(data)
              break

            case 'ticket_updated':
              onTicketUpdatedRef.current?.(data)
              break

            case 'ticket_created':
              onTicketCreatedRef.current?.(data.ticket)
              break

            case 'ticket_deleted':
              onTicketDeletedRef.current?.(data.ticket_id, data)
              break

            case 'ticket_commented':
              onTicketCommentedRef.current?.(data)
              break

            case 'ticket_activity':
              onTicketActivityRef.current?.(data)
              break

            case 'ticket_being_moved':
              onTicketBeingMovedRef.current?.(data)
              break

            case 'ticket_being_edited':
              onTicketBeingEditedRef.current?.(data)
              break

            case 'ticket_editing_stopped':
              onTicketEditingStoppedRef.current?.(data.ticket_id, data.user_id)
              break

            case 'user_joined':
              // The same user in a second tab joins again: keep one entry.
              setActiveUsers(prev => [...prev.filter(u => u.user_id !== data.user_id), {
                user_id: data.user_id,
                user_name: data.user_name,
                user_email: data.user_email
              }])
              onUserJoinedRef.current?.(data)
              break

            case 'user_left':
              setActiveUsers(prev => prev.filter(u => u.user_id !== data.user_id))
              onUserLeftRef.current?.(data.user_id, data.user_name)
              break

            case 'active_users':
              setActiveUsers(data.users || [])
              break

            case 'pong':
              break

            case 'error':
              console.error('[BoardWS] Error from server:', data.message)
              break

            default:
              break
          }
        } catch (error) {
          console.error('[BoardWS] Error parsing message:', error)
        }
      }

      ws.onerror = () => {
        // Error handled in onclose
      }

      ws.onclose = (event) => {
        if (!isCurrent()) return
        wsRef.current = null
        setIsConnected(false)
        onConnectionChangeRef.current?.(false)

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        if (event.code === BOARD_WS_ACCESS_DENIED_CODE) {
          onAccessDeniedRef.current?.(boardId)
        }

        if (autoReconnect && !BOARD_WS_NO_RECONNECT_CODES.includes(event.code)) {
          // The attempt counter lives in a ref: scheduling inside a state
          // updater would run twice under StrictMode and leak a timer.
          const currentAttempt = reconnectAttemptsRef.current + 1
          reconnectAttemptsRef.current = currentAttempt
          setReconnectAttempts(currentAttempt)
          const baseDelay = Math.min(reconnectInterval * Math.pow(2, currentAttempt - 1), maxReconnectInterval)
          // Add jitter: 50%-150% of calculated delay to avoid thundering herd
          const delay = baseDelay * (0.5 + Math.random())

          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            // Board switched or unmounted meanwhile: nothing to resume.
            if (currentBoardIdRef.current !== boardId) return
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.error('[BoardWS] Error creating WebSocket:', error)
    }
  }, [tenant, boardId, autoReconnect, reconnectInterval, maxReconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    const wasOpen = wsRef.current !== null
    if (wsRef.current) {
      const previous = wsRef.current
      wsRef.current = null
      previous.close(1000, 'Component unmounted')
    }

    currentBoardIdRef.current = null
    reconnectAttemptsRef.current = 0
    setReconnectAttempts(0)
    if (wasOpen) onConnectionChangeRef.current?.(false)

    setIsConnected(false)
    setActiveUsers([])
  }, [])

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }
    return false
  }, [])

  const notifyTicketMoving = useCallback((ticketId: number, fromColumn: number) => {
    send({ type: 'ticket_moving', ticket_id: ticketId, from_column: fromColumn })
  }, [send])

  const notifyTicketEditing = useCallback((ticketId: number, field?: string) => {
    // `field` is informational; today's consumer ignores it.
    send(field ? { type: 'ticket_editing', ticket_id: ticketId, field } : { type: 'ticket_editing', ticket_id: ticketId })
  }, [send])

  const notifyTicketEditingStopped = useCallback((ticketId: number) => {
    send({ type: 'ticket_editing_stopped', ticket_id: ticketId })
  }, [send])

  const requestActiveUsers = useCallback(() => {
    send({ type: 'get_active_users' })
  }, [send])

  useEffect(() => {
    if (!tenantSchema || !boardId || boardId === 'none') {
      if (wsRef.current) {
        disconnect()
      }
      return
    }

    connect()

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, tenantSchema])

  return {
    isConnected,
    activeUsers,
    activeUsersCount: activeUsers.length,
    reconnectAttempts,
    notifyTicketMoving,
    notifyTicketEditing,
    notifyTicketEditingStopped,
    requestActiveUsers,
    send,
    disconnect,
    reconnect: connect,
  }
}
