/**
 * Example integration component for collaborative ticket board with WebSocket
 * This shows how to integrate useTicketBoardWebSocket with your existing ticket board
 */

'use client'

import { useState, useEffect } from 'react'
import { useTicketBoardWebSocket } from '@/hooks/useTicketBoardWebSocket'
import { Badge } from '@/components/ui/badge'
import { Users, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollaborativeTicketBoardProps {
  boardId: string | number
  children: React.ReactNode
  onTicketUpdate?: (ticketId: number, changes: any) => void
}

export function CollaborativeTicketBoard({
  boardId,
  children,
  onTicketUpdate,
}: CollaborativeTicketBoardProps) {
  const [ticketsBeingMoved, setTicketsBeingMoved] = useState<Map<number, string>>(new Map())
  const [ticketsBeingEdited, setTicketsBeingEdited] = useState<Map<number, string>>(new Map())

  const {
    isConnected,
    activeUsers,
    activeUsersCount,
    notifyTicketMoving,
    notifyTicketEditing,
    notifyTicketEditingStopped,
  } = useTicketBoardWebSocket({
    boardId,

    // 1. Real-time Collaboration: When someone moves a ticket
    onTicketMoved: (event) => {
      console.log('[CollaborativeBoard] Ticket moved:', event)
      // Update your local state to reflect the movement
      onTicketUpdate?.(event.ticket_id, {
        column_id: event.to_column_id,
        position_in_column: event.position
      })
    },

    // 2. Real-time Collaboration: When someone updates ticket fields
    onTicketUpdated: (event) => {
      console.log('[CollaborativeBoard] Ticket updated:', event)
      // Update your local state with the changes
      onTicketUpdate?.(event.ticket_id, event.changes)
    },

    // 3. Visual Feedback: Someone is dragging a ticket
    onTicketBeingMoved: (event) => {
      console.log('[CollaborativeBoard] Ticket being moved by:', event.user_name)
      setTicketsBeingMoved(prev => new Map(prev).set(event.ticket_id, event.user_name))

      // Remove after 3 seconds (in case drag is abandoned)
      setTimeout(() => {
        setTicketsBeingMoved(prev => {
          const next = new Map(prev)
          next.delete(event.ticket_id)
          return next
        })
      }, 3000)
    },

    // 4. Conflict Prevention: Someone is editing a ticket
    onTicketBeingEdited: (event) => {
      console.log('[CollaborativeBoard] Ticket being edited by:', event.user_name)
      setTicketsBeingEdited(prev => new Map(prev).set(event.ticket_id, event.user_name))
    },

    // Conflict Prevention: Someone stopped editing
    onTicketEditingStopped: (ticketId) => {
      setTicketsBeingEdited(prev => {
        const next = new Map(prev)
        next.delete(ticketId)
        return next
      })
    },

    // 5. Live Presence: User joined/left notifications
    onUserJoined: (user) => {
      console.log('[CollaborativeBoard] User joined:', user.user_name)
      // Optional: Show toast notification
    },

    onUserLeft: (userId, userName) => {
      console.log('[CollaborativeBoard] User left:', userName)
      // Optional: Show toast notification
    },

    onConnectionChange: (connected) => {
      console.log('[CollaborativeBoard] Connection status:', connected ? 'connected' : 'disconnected')
    },
  })

  return (
    <div className="relative">
      {/* Connection Status & Active Users Bar */}
      <div className="flex items-center justify-between gap-4 mb-4 p-4 bg-card border rounded-lg">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Live updates active</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Reconnecting...</span>
            </>
          )}
        </div>

        {/* Active Users (Live Presence) */}
        {activeUsersCount > 0 && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {activeUsersCount} {activeUsersCount === 1 ? 'person' : 'people'} viewing
            </span>

            {/* Show user avatars/names */}
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 3).map((user) => (
                <div
                  key={user.user_id}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-background"
                  title={user.user_name}
                >
                  {user.user_name.substring(0, 2).toUpperCase()}
                </div>
              ))}
              {activeUsersCount > 3 && (
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium border-2 border-background">
                  +{activeUsersCount - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Your existing board component */}
      <div className="relative">
        {children}
      </div>

      {/* Floating indicators for tickets being edited/moved */}
      {(ticketsBeingMoved.size > 0 || ticketsBeingEdited.size > 0) && (
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {Array.from(ticketsBeingMoved.entries()).map(([ticketId, userName]) => (
            <Badge
              key={`moving-${ticketId}`}
              variant="default"
              className="animate-pulse"
            >
              {userName} is moving ticket #{ticketId}
            </Badge>
          ))}
          {Array.from(ticketsBeingEdited.entries()).map(([ticketId, userName]) => (
            <Badge
              key={`editing-${ticketId}`}
              variant="secondary"
              className="animate-pulse"
            >
              {userName} is editing ticket #{ticketId}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * INTEGRATION INSTRUCTIONS:
 *
 * 1. Wrap your existing TicketsNew component with CollaborativeTicketBoard
 * 2. Pass the boardId and handle ticket updates
 * 3. When user drags a ticket, call notifyTicketMoving()
 * 4. When user opens ticket modal, call notifyTicketEditing()
 * 5. When user closes ticket modal, call notifyTicketEditingStopped()
 *
 * Example:
 *
 * <CollaborativeTicketBoard
 *   boardId={selectedBoardId}
 *   onTicketUpdate={(ticketId, changes) => {
 *     // Update your local tickets state
 *     setTickets(prev => prev.map(t =>
 *       t.id === ticketId ? { ...t, ...changes } : t
 *     ))
 *   }}
 * >
 *   <TicketsNew selectedBoardId={selectedBoardId} />
 * </CollaborativeTicketBoard>
 */
