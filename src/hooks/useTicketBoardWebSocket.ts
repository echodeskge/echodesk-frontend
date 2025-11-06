/**
 * Hook for real-time collaboration on ticket boards via WebSocket.
 * Handles ticket movements, updates, user presence, and live editing indicators.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import Cookies from 'js-cookie'

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

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentBoardIdRef = useRef<string | number | null>(null)

  // Store callbacks in refs to avoid recreating WebSocket on callback changes
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
      console.log('[BoardWS] Missing tenant or boardId, skipping connection')
      return
    }

    // If already connected to this board, don't reconnect
    if (currentBoardIdRef.current === boardId && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[BoardWS] Already connected to board', boardId)
      return
    }

    // Close existing connection if any before opening a new one
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        console.log('[BoardWS] Closing existing connection before reconnecting')
        wsRef.current.close(1000, 'Switching boards')
      }
      wsRef.current = null
    }

    // Store the current board ID we're connecting to
    currentBoardIdRef.current = boardId

    try {
      // Get auth token from localStorage (consistent with notifications)
      const token = localStorage.getItem('echodesk_auth_token')
      if (!token) {
        console.error('[BoardWS] No auth token found')
        return
      }

      // Construct WebSocket URL using tenant API URL (like notifications WebSocket)
      // tenant.api_url example: https://groot.echodesk.ge/api/v1
      const apiUrl = new URL(tenant.api_url)
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = apiUrl.host
      const wsUrl = `${protocol}//${host}/ws/boards/${tenant.schema_name}/${boardId}/?token=${token}`

      console.log('[BoardWS] ========================================')
      console.log('[BoardWS] Protocol:', protocol)
      console.log('[BoardWS] Host:', host)
      console.log('[BoardWS] Tenant Schema:', tenant.schema_name)
      console.log('[BoardWS] Board ID:', boardId)
      console.log('[BoardWS] Full URL:', wsUrl.replace(token, '[TOKEN]'))
      console.log('[BoardWS] ========================================')

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[BoardWS] Connected successfully')
        setIsConnected(true)
        setReconnectAttempts(0)
        onConnectionChangeRef.current?.(true)

        // Start ping interval to keep connection alive
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
          }
        }, 30000) // Ping every 30 seconds
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[BoardWS] Message received:', data.type)

          switch (data.type) {
            case 'connection':
              console.log('[BoardWS] Connection confirmed:', data)
              setActiveUsers(data.active_users || [])
              break

            case 'ticket_moved':
              console.log('[BoardWS] Ticket moved:', data)
              onTicketMovedRef.current?.(data)
              break

            case 'ticket_updated':
              console.log('[BoardWS] Ticket updated:', data)
              onTicketUpdatedRef.current?.(data)
              break

            case 'ticket_created':
              console.log('[BoardWS] Ticket created:', data)
              onTicketCreatedRef.current?.(data.ticket)
              break

            case 'ticket_deleted':
              console.log('[BoardWS] Ticket deleted:', data)
              onTicketDeletedRef.current?.(data.ticket_id)
              break

            case 'ticket_being_moved':
              console.log('[BoardWS] Ticket being moved:', data)
              onTicketBeingMovedRef.current?.(data)
              break

            case 'ticket_being_edited':
              console.log('[BoardWS] Ticket being edited:', data)
              onTicketBeingEditedRef.current?.(data)
              break

            case 'ticket_editing_stopped':
              console.log('[BoardWS] Ticket editing stopped:', data)
              onTicketEditingStoppedRef.current?.(data.ticket_id, data.user_id)
              break

            case 'user_joined':
              console.log('[BoardWS] User joined:', data)
              setActiveUsers(prev => [...prev, {
                user_id: data.user_id,
                user_name: data.user_name,
                user_email: data.user_email
              }])
              onUserJoinedRef.current?.(data)
              break

            case 'user_left':
              console.log('[BoardWS] User left:', data)
              setActiveUsers(prev => prev.filter(u => u.user_id !== data.user_id))
              onUserLeftRef.current?.(data.user_id, data.user_name)
              break

            case 'active_users':
              console.log('[BoardWS] Active users:', data)
              setActiveUsers(data.users || [])
              break

            case 'pong':
              // Heartbeat response
              break

            case 'error':
              console.error('[BoardWS] Error from server:', data.message)
              break

            default:
              console.log('[BoardWS] Unknown message type:', data.type)
          }
        } catch (error) {
          console.error('[BoardWS] Error parsing message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[BoardWS] WebSocket error:', error)
      }

      ws.onclose = (event) => {
        console.log(`[BoardWS] Disconnected (code: ${event.code}, reason: ${event.reason})`)
        setIsConnected(false)
        onConnectionChangeRef.current?.(false)

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // Attempt to reconnect if autoReconnect is enabled
        if (autoReconnect && event.code !== 1000) { // 1000 = normal closure
          setReconnectAttempts(prev => {
            const currentAttempt = prev + 1

            // Exponential backoff
            const delay = Math.min(reconnectInterval * Math.pow(2, currentAttempt - 1), maxReconnectInterval)
            console.log(`[BoardWS] Reconnecting in ${delay}ms (attempt ${currentAttempt})`)

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
    console.log('[BoardWS] Disconnecting...')

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounted')
      wsRef.current = null
    }

    // Clear current board reference
    currentBoardIdRef.current = null

    setIsConnected(false)
    setActiveUsers([])
  }, [])

  // Send message to server
  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
      return true
    }
    console.warn('[BoardWS] Cannot send message, not connected')
    return false
  }, [])

  // Notify server that user is moving a ticket
  const notifyTicketMoving = useCallback((ticketId: number, fromColumn: number) => {
    send({ type: 'ticket_moving', ticket_id: ticketId, from_column: fromColumn })
  }, [send])

  // Notify server that user started editing a ticket
  const notifyTicketEditing = useCallback((ticketId: number) => {
    send({ type: 'ticket_editing', ticket_id: ticketId })
  }, [send])

  // Notify server that user stopped editing a ticket
  const notifyTicketEditingStopped = useCallback((ticketId: number) => {
    send({ type: 'ticket_editing_stopped', ticket_id: ticketId })
  }, [send])

  // Request active users list
  const requestActiveUsers = useCallback(() => {
    send({ type: 'get_active_users' })
  }, [send])

  // Connect when boardId or tenant loads, disconnect on unmount
  useEffect(() => {
    if (!tenant || !boardId || boardId === 'none') {
      // Disconnect if no valid board
      if (wsRef.current) {
        console.log('[BoardWS] No valid board, disconnecting')
        disconnect()
      }
      return
    }

    // Connect to the board
    connect()

    // Cleanup on unmount or when boardId changes
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, tenant?.schema_name]) // Depend on boardId and tenant schema (for initial load)

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
