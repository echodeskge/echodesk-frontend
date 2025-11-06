/**
 * Active users indicator for header/navbar
 * Shows number of people viewing the board with hover tooltips
 */

'use client'

import { Users } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ActiveUser {
  user_id: number
  user_name: string
  user_email: string
  is_superuser?: boolean
}

interface BoardCollaborationIndicatorsProps {
  activeUsers: ActiveUser[]
  className?: string
}

export function BoardCollaborationIndicators({
  activeUsers,
  className,
}: BoardCollaborationIndicatorsProps) {
  // Debug logging
  console.log('[BoardCollaborationIndicators] activeUsers:', activeUsers)

  // Don't show indicator if no active users at all
  if (!activeUsers || activeUsers.length === 0) {
    console.log('[BoardCollaborationIndicators] No active users, returning null')
    return null
  }

  // Filter out superadmin users for display
  const filteredUsers = activeUsers.filter(user => !user.is_superuser && !user.user_email.includes('superadmin'))
  const activeUsersCount = activeUsers.length // Show total count, not filtered

  console.log('[BoardCollaborationIndicators] filteredUsers:', filteredUsers)
  console.log('[BoardCollaborationIndicators] activeUsersCount:', activeUsersCount)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-2 h-9 rounded-md hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              className
            )}
            aria-label={`${activeUsersCount} ${activeUsersCount === 1 ? 'person' : 'people'} viewing`}
          >
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {activeUsersCount}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-xs text-muted-foreground mb-2">
              {activeUsersCount} {activeUsersCount === 1 ? 'person' : 'people'} viewing
            </p>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div key={user.user_id} className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    {user.user_name.substring(0, 2).toUpperCase()}
                  </div>
                  <span>{user.user_name}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">All viewers are administrators</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
