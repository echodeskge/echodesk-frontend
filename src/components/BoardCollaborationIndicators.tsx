/**
 * Compact collaboration indicators for header/navbar
 * Shows WiFi connection status and active users with hover tooltips
 */

'use client'

import { Users, Wifi, WifiOff } from 'lucide-react'
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
}

interface BoardCollaborationIndicatorsProps {
  isConnected: boolean
  activeUsers: ActiveUser[]
  className?: string
}

export function BoardCollaborationIndicators({
  isConnected,
  activeUsers,
  className,
}: BoardCollaborationIndicatorsProps) {
  const activeUsersCount = activeUsers.length

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {/* WiFi Connection Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center size-9 rounded-md hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              aria-label={isConnected ? 'Live updates active' : 'Reconnecting...'}
            >
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500 animate-pulse" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isConnected ? 'Live updates active' : 'Reconnecting...'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Active Users Count with Hover Names */}
        {activeUsersCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 px-2 h-9 rounded-md hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
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
                  {activeUsersCount} {activeUsersCount === 1 ? 'person' : 'people'} viewing:
                </p>
                {activeUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      {user.user_name.substring(0, 2).toUpperCase()}
                    </div>
                    <span>{user.user_name}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
