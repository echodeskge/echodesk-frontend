"use client"

import { FolderOpen, ChevronDown } from "lucide-react"
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
import { useEmailFolders } from "@/hooks/api/useSocial"

export function ChatSidebarHeader() {
  const { platforms, selectedEmailFolder, setSelectedEmailFolder } = useChatContext()
  const isEmailOnly = platforms.length === 1 && platforms[0] === 'email'

  // Only fetch folders when on email page
  const { data: folders, isLoading: foldersLoading } = useEmailFolders()

  // Get display name for current folder selection
  const getSelectedFolderDisplayName = () => {
    if (selectedEmailFolder === 'All') return 'All Folders'
    const folder = folders?.find(f => f.name === selectedEmailFolder)
    return folder?.display_name || selectedEmailFolder
  }

  return (
    <CardHeader className="flex flex-col space-y-2 p-3 border-b border-border">
      <div className="grow flex justify-between items-center gap-2">
        <ChatSidebarSearchInput />
        <ChatSidebarActionButtons />
      </div>

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
