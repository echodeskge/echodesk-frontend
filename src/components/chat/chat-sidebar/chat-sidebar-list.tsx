"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { motion } from "framer-motion"
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
  const prevPinnedId = useRef<string | undefined>(undefined)

  const params = useParams()
  const urlSelectedId = params.id?.[0] as string | undefined

  // Local state for pinned chat - updates synchronously on click (not deferred like useParams)
  const [pinnedChatId, setPinnedChatId] = useState<string | undefined>(urlSelectedId)

  // Sync with URL for initial load / browser back-forward
  useEffect(() => {
    setPinnedChatId(urlSelectedId)
  }, [urlSelectedId])

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

  // Scroll to top after layout animation completes
  useEffect(() => {
    if (pinnedChatId && pinnedChatId !== prevPinnedId.current && scrollContainerRef.current) {
      const timeout = setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 50)
      prevPinnedId.current = pinnedChatId
      return () => clearTimeout(timeout)
    }
    prevPinnedId.current = pinnedChatId
  }, [pinnedChatId])

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
      if (pinnedChatId) {
        if (a.id === pinnedChatId) return -1
        if (b.id === pinnedChatId) return 1
      }
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [chatState.chats, pinnedChatId, chatListSearchQuery, assignmentTab, assignedChatIds, assignmentEnabled])

  const handleSelectChat = useCallback((chatId: string) => {
    setPinnedChatId(chatId)
  }, [])

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
    <motion.div
      ref={scrollContainerRef}
      className={`${scrollHeight} overflow-auto`}
      onScroll={handleScroll}
      layoutScroll
    >
      <div className="p-3 flex flex-col gap-1.5">
        {filteredChats.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {getEmptyMessage()}
          </div>
        ) : (
          <>
            {filteredChats.map((chat) => (
              <motion.div
                key={chat.id}
                layout
                transition={{ type: "spring", stiffness: 5000, damping: 120 }}
              >
                <ChatSidebarItem chat={chat} onSelect={handleSelectChat} />
              </motion.div>
            ))}
            {hasNextPage && (
              <div className="flex justify-center py-4">
                {isFetchingNextPage ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-xs text-muted-foreground">Scroll for more</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
