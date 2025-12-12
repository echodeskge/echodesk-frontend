"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Search, X } from "lucide-react"

import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ChatMessageSearchProps {
  onClose: () => void
  matchCount: number
  currentMatchIndex: number
  onPrevMatch: () => void
  onNextMatch: () => void
}

export function ChatMessageSearch({
  onClose,
  matchCount,
  currentMatchIndex,
  onPrevMatch,
  onNextMatch,
}: ChatMessageSearchProps) {
  const { messageSearchQuery, setMessageSearchQuery } = useChatContext()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle escape key to close search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
      // Navigate with Enter/Shift+Enter
      if (e.key === "Enter" && matchCount > 0) {
        if (e.shiftKey) {
          onPrevMatch()
        } else {
          onNextMatch()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, matchCount, onPrevMatch, onNextMatch])

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        ref={inputRef}
        className="h-8 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
        placeholder="Search in conversation..."
        value={messageSearchQuery}
        onChange={(e) => setMessageSearchQuery(e.target.value)}
      />
      {messageSearchQuery && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {matchCount > 0
              ? `${currentMatchIndex + 1} of ${matchCount}`
              : "No results"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPrevMatch}
            disabled={matchCount === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNextMatch}
            disabled={matchCount === 0}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
