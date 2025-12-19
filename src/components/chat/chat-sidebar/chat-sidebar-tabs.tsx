"use client"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ChatSidebarTabs() {
  const { assignmentEnabled, assignmentTab, setAssignmentTab, assignedChatIds } = useChatContext()

  // Only show tabs when assignment mode is enabled
  if (!assignmentEnabled) {
    return null
  }

  const assignedCount = assignedChatIds.size

  return (
    <div className="px-3 py-2 border-b border-border">
      <Tabs value={assignmentTab} onValueChange={(value) => setAssignmentTab(value as 'all' | 'assigned')}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            All Chats
          </TabsTrigger>
          <TabsTrigger value="assigned" className="flex-1">
            Assigned to Me
            {assignedCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-medium">
                {assignedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
