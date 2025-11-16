/**
 * Example integration component for collaborative ticket board with WebSocket
 * This shows how to integrate useTicketBoardWebSocket with your existing ticket board
 */

'use client'

import { useState, useEffect } from 'react'
import { useTicketBoardWebSocket } from '@/hooks/useTicketBoardWebSocket'
import { BoardCollaborationProvider } from '@/contexts/BoardCollaborationContext'
import { Badge } from '@/components/ui/badge'
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
      // Update your local state to reflect the movement
      onTicketUpdate?.(event.ticket_id, {
        column_id: event.to_column_id,
        position_in_column: event.position
      })
    },

    // 2. Real-time Collaboration: When someone updates ticket fields
    onTicketUpdated: (event) => {
      // Update your local state with the changes
      onTicketUpdate?.(event.ticket_id, event.changes)
    },

    // 3. Visual Feedback: Someone is dragging a ticket
    onTicketBeingMoved: (event) => {
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
      // Optional: Show toast notification
    },

    onUserLeft: (userId, userName) => {
      // Optional: Show toast notification
    },

    onConnectionChange: (connected) => {
      // Connection status changed
    },
  })

  return (
    <BoardCollaborationProvider
      isConnected={isConnected}
      activeUsers={activeUsers}
      boardId={boardId}
    >
      <div className="relative">
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
    </BoardCollaborationProvider>
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
