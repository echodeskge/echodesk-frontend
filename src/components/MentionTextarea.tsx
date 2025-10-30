"use client"

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { apiUsersList } from '@/api/generated/api'
import type { User } from '@/api/generated/interfaces'
import { cn } from '@/lib/utils'

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  className,
  disabled
}: MentionTextareaProps) {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionStartRef = useRef<number>(0)

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiUsersList()
        setUsers(response.results || [])
      } catch (error) {
        console.error('Failed to fetch users:', error)
      }
    }
    fetchUsers()
  }, [])

  // Filter users based on mention search
  useEffect(() => {
    if (mentionSearch) {
      const search = mentionSearch.toLowerCase()
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(search) ||
        user.first_name?.toLowerCase().includes(search) ||
        user.last_name?.toLowerCase().includes(search)
      ).slice(0, 10) // Limit to 10 suggestions
      setFilteredUsers(filtered)
      setSelectedIndex(0)
    } else {
      setFilteredUsers(users.slice(0, 10))
      setSelectedIndex(0)
    }
  }, [mentionSearch, users])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0

    onChange(newValue)
    setCursorPosition(cursorPos)

    // Check if user typed @ and show mention dropdown
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if there's no space after @ (still in mention mode)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        mentionStartRef.current = lastAtIndex
        setMentionSearch(textAfterAt)
        setShowMentions(true)

        // Calculate position for dropdown
        if (textareaRef.current) {
          const coords = getCaretCoordinates(textareaRef.current, cursorPos)
          setMentionPosition({
            top: coords.top + 20,
            left: coords.left
          })
        }
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (user: User) => {
    const beforeMention = value.substring(0, mentionStartRef.current)
    const afterCursor = value.substring(cursorPosition)
    const mention = `@${user.email} `
    const newValue = beforeMention + mention + afterCursor
    const newCursorPos = beforeMention.length + mention.length

    onChange(newValue)
    setShowMentions(false)

    // Set cursor position after mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredUsers.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % filteredUsers.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length)
    } else if (e.key === 'Enter' && filteredUsers.length > 0) {
      e.preventDefault()
      insertMention(filteredUsers[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowMentions(false)
    }
  }

  // Get caret coordinates for positioning dropdown
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div')
    const style = window.getComputedStyle(element)
    const properties = [
      'font-family', 'font-size', 'font-weight', 'letter-spacing',
      'line-height', 'padding', 'border', 'white-space', 'word-wrap'
    ]

    properties.forEach(prop => {
      div.style[prop as any] = style[prop as any]
    })

    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    div.style.whiteSpace = 'pre-wrap'
    div.style.width = element.offsetWidth + 'px'

    const text = element.value.substring(0, position)
    div.textContent = text

    const span = document.createElement('span')
    span.textContent = element.value.substring(position) || '.'
    div.appendChild(span)

    document.body.appendChild(div)

    const coordinates = {
      top: span.offsetTop,
      left: span.offsetLeft
    }

    document.body.removeChild(div)
    return coordinates
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />

      {showMentions && filteredUsers.length > 0 && (
        <div
          className="absolute z-50 bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
          style={{
            top: `${mentionPosition.top}px`,
            left: `${mentionPosition.left}px`,
            minWidth: '250px'
          }}
        >
          <Command>
            <CommandList>
              {filteredUsers.length === 0 && (
                <CommandEmpty>No users found</CommandEmpty>
              )}
              <CommandGroup>
                {filteredUsers.map((user, index) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => insertMention(user)}
                    className={cn(
                      'cursor-pointer',
                      index === selectedIndex && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
