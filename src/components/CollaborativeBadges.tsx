/**
 * Floating badges showing real-time user actions on tickets
 * Shows "User X is moving/editing ticket #Y"
 * Reads state from BoardCollaborationContext (populated by layout WebSocket)
 */

'use client'

import { useBoardCollaboration } from '@/contexts/BoardCollaborationContext'
import { Badge } from '@/components/ui/badge'

export function CollaborativeBadges() {
  const { boardId, ticketsBeingMoved, ticketsBeingEdited } = useBoardCollaboration()

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
