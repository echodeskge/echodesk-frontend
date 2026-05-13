/**
 * Tests for ChatProvider's dirty-chat tracking.
 *
 * Bug guarded against: when the user was viewing chat A and a WebSocket
 * message arrived for chat B, clicking chat B would show stale content
 * because handleSelectChat skipped the refetch (messagesLoaded was true,
 * or the React Query cache returned a pre-WS prefetch hit). The dirty-set
 * forces a fresh fetch on next select for any chat that received WS
 * messages while inactive.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React, { useRef } from "react"

import type { ChatType, MessageType } from "@/components/chat/types"

vi.mock("@/hooks/api/useSocial", () => ({
  useSocialSettings: () => ({ data: { chat_assignment_enabled: false } }),
  useMyAssignments: () => ({ data: [] }),
}))

import { ChatProvider } from "@/components/chat/contexts/chat-context"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"

function makeMessage(overrides: Partial<MessageType> = {}): MessageType {
  return {
    id: "msg-1",
    senderId: "sender_1",
    text: "Hi",
    status: "SENT",
    createdAt: new Date("2024-06-01T10:00:00Z"),
    ...overrides,
  }
}

function makeChat(overrides: Partial<ChatType> = {}): ChatType {
  return {
    id: "chat-1",
    name: "John",
    lastMessage: { content: "Hi", createdAt: new Date("2024-06-01T10:00:00Z") },
    messages: [],
    users: [],
    typingUsers: [],
    unreadCount: 0,
    platform: "facebook",
    messagesLoaded: true,
    ...overrides,
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
}

type ContextHandle = ReturnType<typeof useChatContext>

interface HarnessProps {
  chats: ChatType[]
  loadChatMessages: (chatId: string) => Promise<MessageType[]>
  contextRef: React.MutableRefObject<ContextHandle | null>
  wsRef: React.MutableRefObject<
    ((chatId: string, message: MessageType, senderName?: string) => void) | null
  >
}

function CaptureContext({
  contextRef,
}: {
  contextRef: React.MutableRefObject<ContextHandle | null>
}) {
  contextRef.current = useChatContext()
  return null
}

function Harness({ chats, loadChatMessages, contextRef, wsRef }: HarnessProps) {
  const addIncomingMessageRef = useRef<
    ((chatId: string, message: MessageType, senderName?: string) => void) | null
  >(null)

  // Bridge the provider's internal ref to the test-supplied ref so the test
  // can simulate WebSocket frames.
  React.useEffect(() => {
    wsRef.current = (chatId, message, senderName) => {
      addIncomingMessageRef.current?.(chatId, message, senderName)
    }
    return () => {
      wsRef.current = null
    }
  }, [wsRef])

  return (
    <ChatProvider
      chatsData={chats}
      loadChatMessages={loadChatMessages}
      onAddIncomingMessageRef={addIncomingMessageRef}
    >
      <CaptureContext contextRef={contextRef} />
    </ChatProvider>
  )
}

describe("ChatProvider dirty-chat tracking", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = makeQueryClient()
  })

  it("forces a refetch on select when a WS message arrived while the chat was inactive", async () => {
    const chatA = makeChat({ id: "A", messages: [makeMessage({ id: "a1" })] })
    const chatB = makeChat({ id: "B", messages: [makeMessage({ id: "b1" })] })

    const loadChatMessages = vi.fn(async (chatId: string) => {
      // Returns the "fresh" server response — what we expect to land after the
      // forced refetch on re-select.
      return [
        makeMessage({ id: `${chatId}-historic` }),
        makeMessage({ id: `${chatId}-fresh-from-server` }),
      ] satisfies MessageType[]
    })

    const contextRef: React.MutableRefObject<ContextHandle | null> = { current: null }
    const wsRef: React.MutableRefObject<
      ((chatId: string, message: MessageType, senderName?: string) => void) | null
    > = { current: null }

    render(
      <QueryClientProvider client={queryClient}>
        <Harness
          chats={[chatA, chatB]}
          loadChatMessages={loadChatMessages}
          contextRef={contextRef}
          wsRef={wsRef}
        />
      </QueryClientProvider>
    )

    // Make A the active chat. It's already messagesLoaded:true, so selecting
    // it should NOT trigger any fetch.
    await act(async () => {
      contextRef.current?.handleSelectChat(chatA)
    })
    expect(loadChatMessages).not.toHaveBeenCalled()

    // While the user is on A, a WS message arrives for inactive chat B.
    await act(async () => {
      wsRef.current?.(
        "B",
        makeMessage({ id: "ws-fresh", text: "While you were away" })
      )
    })

    // Selecting B must now trigger a refetch — even though messagesLoaded was
    // already true — because the dirty flag was set above.
    await act(async () => {
      contextRef.current?.handleSelectChat(chatB)
    })

    await waitFor(() => {
      expect(loadChatMessages).toHaveBeenCalledWith("B")
    })

    // After the fetch resolves, the chat's messages should match the server
    // response (proves updateChatMessages ran with the fresh data).
    await waitFor(() => {
      const updatedB = contextRef.current?.chatState.chats.find((c) => c.id === "B")
      expect(updatedB?.messages.map((m) => m.id)).toEqual([
        "B-historic",
        "B-fresh-from-server",
      ])
    })

    // A subsequent re-select of B (with no WS traffic in between) must NOT
    // trigger another fetch — the dirty flag was cleared by the previous load.
    loadChatMessages.mockClear()
    await act(async () => {
      contextRef.current?.handleSelectChat(chatB)
    })
    expect(loadChatMessages).not.toHaveBeenCalled()
  })

  it("does NOT mark the active chat dirty when WS messages arrive for it", async () => {
    const chatA = makeChat({ id: "A", messages: [makeMessage({ id: "a1" })] })

    const loadChatMessages = vi.fn(async () => [] as MessageType[])

    const contextRef: React.MutableRefObject<ContextHandle | null> = { current: null }
    const wsRef: React.MutableRefObject<
      ((chatId: string, message: MessageType, senderName?: string) => void) | null
    > = { current: null }

    render(
      <QueryClientProvider client={queryClient}>
        <Harness
          chats={[chatA]}
          loadChatMessages={loadChatMessages}
          contextRef={contextRef}
          wsRef={wsRef}
        />
      </QueryClientProvider>
    )

    await act(async () => {
      contextRef.current?.handleSelectChat(chatA)
    })

    // WS message for the currently-selected chat — reducer appends it live;
    // the dirty set must NOT mark it (we'd force a needless refetch next select).
    await act(async () => {
      wsRef.current?.("A", makeMessage({ id: "live", text: "live update" }))
    })

    // Re-select A — no fetch should fire.
    loadChatMessages.mockClear()
    await act(async () => {
      contextRef.current?.handleSelectChat(chatA)
    })
    expect(loadChatMessages).not.toHaveBeenCalled()
  })
})
