/**
 * Hook for real-time collaboration on ticket boards via WebSocket.
 * Handles ticket movements, updates, user presence, and live editing indicators.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTenant } from '@/contexts/TenantContext'

interface ActiveUser {
  user_id: number
  user_name: string
  user_email: string
}

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

interface UseTicketBoardWebSocketOptions {
  boardId: string | number
  onTicketMoved?: (event: TicketMovedEvent) => void
  onTicketUpdated?: (event: TicketUpdatedEvent) => void
  onTicketCreated?: (ticket: any) => void
  onTicketDeleted?: (ticketId: number) => void
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

  useEffect(() => {
    if (tenant?.schema_name && !tenantSchema) {
      setTenantSchema(tenant.schema_name)
    }
  }, [tenant?.schema_name, tenantSchema])

  const onTicketMovedRef = useRef(onTicketMoved)
  const onTicketUpdatedRef = useRef(onTicketUpdated)
  const onTicketCreatedRef = useRef(onTicketCreated)
  const onTicketDeletedRef = useRef(onTicketDeleted)
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

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Switching boards')
      }
      wsRef.current = null
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

      ws.onopen = () => {
        setIsConnected(true)
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
        try {
          const data = JSON.parse(event.data)

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
              onTicketDeletedRef.current?.(data.ticket_id)
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
              setActiveUsers(prev => [...prev, {
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
        setIsConnected(false)
        onConnectionChangeRef.current?.(false)

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        if (autoReconnect && event.code !== 1000) {
          setReconnectAttempts(prev => {
            const currentAttempt = prev + 1
            const delay = Math.min(reconnectInterval * Math.pow(2, currentAttempt - 1), maxReconnectInterval)

            reconnectTimeoutRef.current = setTimeout(() => {
              connect()
            }, delay)

            return currentAttempt
          })
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

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounted')
      wsRef.current = null
    }

    currentBoardIdRef.current = null

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

  const notifyTicketEditing = useCallback((ticketId: number) => {
    send({ type: 'ticket_editing', ticket_id: ticketId })
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
    disconnect,
    reconnect: connect,
  }
}
