import type { ReactNode } from "react"
import type { ChatType } from "@/components/chat/types"

import { ChatProvider } from "@/components/chat/contexts/chat-context"
import { ChatSidebar } from "./chat-sidebar"

export function ChatWrapper({
  chatsData,
  children,
}: {
  chatsData: ChatType[]
  children: ReactNode
}) {
  return (
    <ChatProvider chatsData={chatsData}>
      <div className="container relative w-full flex gap-x-4 p-4">
        <ChatSidebar />
        {children}
      </div>
    </ChatProvider>
  )
}
