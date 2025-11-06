/**
 * Floating badges showing real-time user actions on tickets
 * Shows "User X is moving/editing ticket #Y"
 */

'use client'

import { useState } from 'react'
import { useTicketBoardWebSocket } from '@/hooks/useTicketBoardWebSocket'
import { useBoardCollaboration } from '@/contexts/BoardCollaborationContext'
import { Badge } from '@/components/ui/badge'

export function CollaborativeBadges() {
  const { boardId } = useBoardCollaboration()
  const [ticketsBeingMoved, setTicketsBeingMoved] = useState<Map<number, string>>(new Map())
  const [ticketsBeingEdited, setTicketsBeingEdited] = useState<Map<number, string>>(new Map())

  // Subscribe to WebSocket events for visual feedback
  // Note: The main WebSocket connection is initialized at layout level
  // This just listens for the visual feedback events
  useTicketBoardWebSocket({
    boardId: boardId || 'none',

    // Visual Feedback: Someone is dragging a ticket
    onTicketBeingMoved: (event) => {
      console.log('[CollaborativeBadges] Ticket being moved by:', event.user_name)
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

    // Conflict Prevention: Someone is editing a ticket
    onTicketBeingEdited: (event) => {
      console.log('[CollaborativeBadges] Ticket being edited by:', event.user_name)
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
  })

  // Don't render if no board selected or no active badges
  if (!boardId || (ticketsBeingMoved.size === 0 && ticketsBeingEdited.size === 0)) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {Array.from(ticketsBeingMoved.entries()).map(([ticketId, userName]) => (
        <Badge
          key={`moving-${ticketId}`}
          variant="default"
          className="animate-pulse shadow-lg"
        >
          {userName} is moving ticket #{ticketId}
        </Badge>
      ))}
      {Array.from(ticketsBeingEdited.entries()).map(([ticketId, userName]) => (
        <Badge
          key={`editing-${ticketId}`}
          variant="secondary"
          className="animate-pulse shadow-lg"
        >
          {userName} is editing ticket #{ticketId}
        </Badge>
      ))}
    </div>
  )
}
