"use client"

import { useState } from "react"
import { FolderOpen, ChevronDown, Plus, Mail } from "lucide-react"
import { CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChatSidebarActionButtons } from "./chat-sidebar-action-buttons"
import { ChatSidebarSearchInput } from "./chat-sidebar-search-input"
import { useChatContext } from "@/components/chat/hooks/use-chat-context"
import { useEmailFolders, useEmailStatus } from "@/hooks/api/useSocial"
import { ComposeEmailDialog } from "@/components/email/ComposeEmailDialog"

export function ChatSidebarHeader() {
  const {
    platforms,
    selectedEmailFolder,
    setSelectedEmailFolder,
    selectedEmailConnectionId,
    setSelectedEmailConnectionId,
  } = useChatContext()
  const isEmailOnly = platforms.length === 1 && platforms[0] === 'email'
  const [composeOpen, setComposeOpen] = useState(false)

  // Only fetch folders when on email page
  const { data: folders, isLoading: foldersLoading } = useEmailFolders()

  // Fetch email connections/accounts
  const { data: emailStatus } = useEmailStatus({ enabled: isEmailOnly })
  const emailConnections = emailStatus?.connections || []
  const hasMultipleAccounts = emailConnections.length > 1

  // Get display name for current folder selection
  const getSelectedFolderDisplayName = () => {
    if (selectedEmailFolder === 'All') return 'All Folders'
    const folder = folders?.find(f => f.name === selectedEmailFolder)
    return folder?.display_name || selectedEmailFolder
  }

  // Get email address for current account selection
  const getSelectedAccountDisplayName = () => {
    if (!selectedEmailConnectionId) return 'All Accounts'
    const connection = emailConnections.find(c => c.id === selectedEmailConnectionId)
    return connection?.email_address || 'Unknown'
  }

  return (
    <CardHeader className="flex flex-col space-y-2 p-3 border-b border-border">
      <div className="grow flex justify-between items-center gap-2">
        <ChatSidebarSearchInput />
        {/* Compose button as + icon next to search for email view */}
        {isEmailOnly && (
          <>
            <Button
              variant="default"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setComposeOpen(true)}
              title="Compose"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <ComposeEmailDialog open={composeOpen} onOpenChange={setComposeOpen} />
          </>
        )}
        <ChatSidebarActionButtons />
      </div>

      {/* Email account switcher (only show when multiple accounts) */}
      {isEmailOnly && hasMultipleAccounts && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2 truncate">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{getSelectedAccountDisplayName()}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setSelectedEmailConnectionId(null)}>
              All Accounts
            </DropdownMenuItem>
            {emailConnections.map((connection) => (
              <DropdownMenuItem
                key={connection.id}
                onClick={() => setSelectedEmailConnectionId(connection.id)}
              >
                <span className="truncate">
                  {connection.email_address}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Folder dropdown for email view */}
      {isEmailOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {getSelectedFolderDisplayName()}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setSelectedEmailFolder('All')}>
              All Folders
            </DropdownMenuItem>
            {foldersLoading ? (
              <DropdownMenuItem disabled>Loading folders...</DropdownMenuItem>
            ) : folders && folders.length > 0 ? (
              folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.name}
                  onClick={() => setSelectedEmailFolder(folder.name)}
                >
                  {folder.display_name}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>No folders found</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </CardHeader>
  )
}
