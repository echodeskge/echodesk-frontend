"use client"

import React, { useEffect, useState } from 'react'
import { X, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotificationToastProps {
  id: number
  title: string
  message: string
  type?: string
  onClose: () => void
  onClick: () => void
  duration?: number
}

export function NotificationToast({
  id,
  title,
  message,
  type = 'default',
  onClose,
  onClick,
  duration = 5000
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Slide in animation
  useEffect(() => {
    // Trigger enter animation after mount
    setTimeout(() => setIsVisible(true), 10)

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 300) // Match animation duration
  }

  const getTypeColor = () => {
    switch (type) {
      case 'ticket_assigned':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
      case 'ticket_mentioned':
        return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950'
      case 'ticket_commented':
        return 'border-l-green-500 bg-green-50 dark:bg-green-950'
      case 'ticket_status_changed':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950'
      case 'ticket_due_soon':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950'
      default:
        return 'border-l-gray-500 bg-white dark:bg-gray-950'
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]',
        'transform transition-all duration-300 ease-out',
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border-l-4 shadow-lg',
          'backdrop-blur-sm bg-white/95 dark:bg-gray-900/95',
          getTypeColor(),
          'cursor-pointer hover:shadow-xl transition-shadow'
        )}
        onClick={() => {
          onClick()
          handleClose()
        }}
      >
        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 h-1 bg-primary/30"
          style={{
            animation: `shrink ${duration}ms linear`,
            width: '100%'
          }}
        />

        {/* Content */}
        <div className="p-4 pr-12">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 rounded-full"
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}

// Container for managing multiple toasts
interface NotificationToastContainerProps {
  toasts: Array<{
    id: number
    title: string
    message: string
    type?: string
    ticketId?: number
  }>
  onRemove: (id: number) => void
  onToastClick: (ticketId?: number) => void
}

export function NotificationToastContainer({
  toasts,
  onRemove,
  onToastClick
}: NotificationToastContainerProps) {
  return (
    <div className="fixed bottom-0 right-0 z-50 pointer-events-none">
      <div className="flex flex-col-reverse gap-2 p-4 pointer-events-auto">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{
              transform: `translateY(${index * -8}px)`,
              transition: 'transform 0.3s ease-out'
            }}
          >
            <NotificationToast
              id={toast.id}
              title={toast.title}
              message={toast.message}
              type={toast.type}
              onClose={() => onRemove(toast.id)}
              onClick={() => onToastClick(toast.ticketId)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
