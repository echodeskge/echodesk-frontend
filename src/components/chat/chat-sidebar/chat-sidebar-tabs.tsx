"use client"

import { motion } from "framer-motion"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { cn } from "@/lib/utils"

type Tab = {
  value: 'all' | 'assigned'
  label: string
  badge?: number
}

export function ChatSidebarTabs() {
  const {
    assignmentEnabled,
    assignmentTab,
    setAssignmentTab,
    assignedChatIds,
    showArchived,
    setSelectedChatId,
  } = useChatContext()

  // Hide tabs when assignment mode is disabled or when viewing history
  if (!assignmentEnabled || showArchived) {
    return null
  }

  const assignedCount = assignedChatIds.size

  const tabs: Tab[] = [
    { value: 'all', label: 'All Chats' },
    { value: 'assigned', label: 'Assigned to Me', badge: assignedCount > 0 ? assignedCount : undefined },
  ]

  const handleSelect = (tab: 'all' | 'assigned') => {
    if (tab === assignmentTab) return
    setSelectedChatId(null)
    setAssignmentTab(tab)
  }

  return (
    <div className="px-3 py-2 border-b border-border">
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="relative grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
      >
        {tabs.map((tab) => {
          const isActive = assignmentTab === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelect(tab.value)}
              className={cn(
                "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="chat-sidebar-tab-indicator"
                  className="absolute inset-0 z-0 rounded-sm bg-background shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.8 }}
                />
              )}
              <span className="relative z-10 flex items-center">
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-medium">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
