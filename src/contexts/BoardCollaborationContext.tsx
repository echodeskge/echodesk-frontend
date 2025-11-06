/**
 * Context for sharing board collaboration state (WebSocket connection, active users)
 * across components, particularly for header indicators
 */

'use client'

import { createContext, useContext, ReactNode } from 'react'

interface ActiveUser {
  user_id: number
  user_name: string
  user_email: string
}

interface BoardCollaborationContextType {
  isConnected: boolean
  activeUsers: ActiveUser[]
  activeUsersCount: number
  boardId: string | number | null
  ticketsBeingMoved: Map<number, string>
  ticketsBeingEdited: Map<number, string>
}

const BoardCollaborationContext = createContext<BoardCollaborationContextType | null>(null)

export function BoardCollaborationProvider({
  children,
  isConnected,
  activeUsers,
  boardId,
  ticketsBeingMoved = new Map(),
  ticketsBeingEdited = new Map(),
}: {
  children: ReactNode
  isConnected: boolean
  activeUsers: ActiveUser[]
  boardId: string | number | null
  ticketsBeingMoved?: Map<number, string>
  ticketsBeingEdited?: Map<number, string>
}) {
  return (
    <BoardCollaborationContext.Provider
      value={{
        isConnected,
        activeUsers,
        activeUsersCount: activeUsers.length,
        boardId,
        ticketsBeingMoved,
        ticketsBeingEdited,
      }}
    >
      {children}
    </BoardCollaborationContext.Provider>
  )
}

export function useBoardCollaboration() {
  const context = useContext(BoardCollaborationContext)
  // Return null state if not in a collaboration context (not on tickets page)
  if (!context) {
    return {
      isConnected: false,
      activeUsers: [],
      activeUsersCount: 0,
      boardId: null,
    }
  }
  return context
}
