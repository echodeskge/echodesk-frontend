"use client"

import { useMemo, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { ChatSidebarItem } from "./chat-sidebar-item"
import { ChatListSkeleton } from "./ChatListSkeleton"
import { Loader2 } from "lucide-react"

const MESSAGES_LOADED_KEY = 'echodesk_messages_loaded'

export function ChatSidebarList() {
  const {
    chatState,
    chatListSearchQuery,
    assignmentTab,
    assignedChatIds,
    assignmentEnabled,
    isInitialLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isSearchLoading,
    showArchived,
  } = useChatContext()

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevSelectedId = useRef<string | undefined>(undefined)

  const params = useParams()
  const selectedId = params.id?.[0] as string | undefined

  // Handle scroll to load more
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const scrolledToBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100

    if (scrolledToBottom && hasNextPage && !isFetchingNextPage && fetchNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const hasEverLoaded = typeof window !== 'undefined' && sessionStorage.getItem(MESSAGES_LOADED_KEY) === 'true'

  useEffect(() => {
    if (chatState.chats.length > 0 && typeof window !== 'undefined') {
      sessionStorage.setItem(MESSAGES_LOADED_KEY, 'true')
    }
  }, [chatState.chats.length])

  const showLoading = isInitialLoading && chatState.chats.length === 0 && !hasEverLoaded
  const isRefetching = isInitialLoading && chatState.chats.length === 0 && hasEverLoaded

  // Scroll to top when selected chat changes
  useEffect(() => {
    if (selectedId && selectedId !== prevSelectedId.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0 })
    }
    prevSelectedId.current = selectedId
  }, [selectedId])

  // Filter and sort chats
  const filteredChats = useMemo(() => {
    let chats = chatState.chats

    if (assignmentEnabled) {
      if (assignmentTab === 'assigned') {
        chats = chats.filter((chat) => assignedChatIds.has(chat.id))
      } else {
        chats = chats.filter((chat) => !assignedChatIds.has(chat.id))
      }
    }

    if (chatListSearchQuery.trim()) {
      const query = chatListSearchQuery.toLowerCase().trim()
      chats = chats.filter((chat) => {
        if (chat.name.toLowerCase().includes(query)) return true
        if (chat.lastMessage?.content?.toLowerCase().includes(query)) return true
        if (chat.platform?.toLowerCase().includes(query)) return true
        return false
      })
    }

    return [...chats].sort((a, b) => {
      if (selectedId) {
        if (a.id === selectedId) return -1
        if (b.id === selectedId) return 1
      }
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [chatState.chats, selectedId, chatListSearchQuery, assignmentTab, assignedChatIds, assignmentEnabled])

  const getEmptyMessage = () => {
    if (chatListSearchQuery) return "No conversations found"
    if (showArchived) return "No archived conversations"
    if (assignmentEnabled && assignmentTab === 'assigned') return "No assigned conversations"
    return "No conversations yet"
  }

  const scrollHeight = "h-full"

  if (showLoading || isRefetching || isSearchLoading) {
    return (
      <div className={`${scrollHeight} overflow-auto`}>
        <ChatListSkeleton />
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className={`${scrollHeight} overflow-auto`}
      onScroll={handleScroll}
    >
      <ul className="p-3 space-y-1.5">
        {filteredChats.length === 0 ? (
          <li className="text-center text-muted-foreground py-8">
            {getEmptyMessage()}
          </li>
        ) : (
          <>
            {filteredChats.map((chat) => (
              <li key={chat.id}>
                <ChatSidebarItem chat={chat} />
              </li>
            ))}
            {hasNextPage && (
              <li className="flex justify-center py-4">
                {isFetchingNextPage ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">Scroll for more</span>
                )}
              </li>
            )}
          </>
        )}
      </ul>
    </div>
  )
}
