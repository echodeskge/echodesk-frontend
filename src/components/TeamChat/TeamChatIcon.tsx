'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface TeamChatIconProps {
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}

const CORNER_OFFSET = 24; // Distance from edge

const cornerStyles: Record<Corner, { right?: number; left?: number; top?: number; bottom?: number }> = {
  'bottom-right': { right: CORNER_OFFSET, bottom: CORNER_OFFSET },
  'bottom-left': { left: CORNER_OFFSET, bottom: CORNER_OFFSET },
  'top-right': { right: CORNER_OFFSET, top: CORNER_OFFSET },
  'top-left': { left: CORNER_OFFSET, top: CORNER_OFFSET },
};

export function TeamChatIcon({ unreadCount, onClick, isOpen }: TeamChatIconProps) {
  const [corner, setCorner] = useState<Corner>('bottom-right');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasDraggedRef = useRef(false);

  // Load corner from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('teamChatCorner');
    if (saved && ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(saved)) {
      setCorner(saved as Corner);
    }
  }, []);

  // Save corner to localStorage
  const saveCorner = (newCorner: Corner) => {
    localStorage.setItem('teamChatCorner', newCorner);
    setCorner(newCorner);
  };

  // Calculate nearest corner based on position
  const getNearestCorner = (x: number, y: number): Corner => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const isRight = x > centerX;
    const isBottom = y > centerY;

    if (isRight && isBottom) return 'bottom-right';
    if (!isRight && isBottom) return 'bottom-left';
    if (isRight && !isBottom) return 'top-right';
    return 'top-left';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    hasDraggedRef.current = false;
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
      const deltaY = Math.abs(e.clientY - dragStartRef.current.y);

      if (deltaX > 5 || deltaY > 5) {
        hasDraggedRef.current = true;
        setDragPosition({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!hasDraggedRef.current) {
        // It was a click
        onClick();
      } else {
        // It was a drag - snap to nearest corner
        const nearestCorner = getNearestCorner(e.clientX, e.clientY);
        saveCorner(nearestCorner);
      }

      setIsDragging(false);
      setDragPosition(null);
      dragStartRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    hasDraggedRef.current = false;
    setIsDragging(true);

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current) return;
      const touch = e.touches[0];

      const deltaX = Math.abs(touch.clientX - dragStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - dragStartRef.current.y);

      if (deltaX > 5 || deltaY > 5) {
        hasDraggedRef.current = true;
        setDragPosition({ x: touch.clientX, y: touch.clientY });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!hasDraggedRef.current) {
        // It was a tap
        onClick();
      } else {
        // It was a drag - snap to nearest corner
        const lastTouch = e.changedTouches[0];
        const nearestCorner = getNearestCorner(lastTouch.clientX, lastTouch.clientY);
        saveCorner(nearestCorner);
      }

      setIsDragging(false);
      setDragPosition(null);
      dragStartRef.current = null;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Calculate style based on whether dragging or snapped to corner
  const getPositionStyle = () => {
    if (dragPosition) {
      // While dragging, follow the cursor
      return {
        left: dragPosition.x - 28, // Center the icon (28 = half of 56px)
        top: dragPosition.y - 28,
        right: 'auto',
        bottom: 'auto',
        transition: 'none',
      };
    }
    return {
      ...cornerStyles[corner],
      transition: 'all 0.3s ease-out',
    };
  };

  return (
    <div
      className={cn(
        'fixed z-50 cursor-pointer select-none touch-none',
        isDragging && 'cursor-grabbing'
      )}
      style={getPositionStyle()}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className={cn(
          'relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform duration-200',
          isOpen
            ? 'bg-primary/90 scale-95'
            : 'bg-primary hover:bg-primary/90 hover:scale-105',
          isDragging && 'scale-110 shadow-xl opacity-80'
        )}
      >
        <MessageCircle className="h-6 w-6 text-primary-foreground" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </div>
  );
}
