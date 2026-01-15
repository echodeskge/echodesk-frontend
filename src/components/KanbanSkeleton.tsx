"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 p-6 h-full overflow-x-auto">
      {/* Generate 4 column skeletons */}
      {[...Array(4)].map((_, colIndex) => (
        <div key={colIndex} className="w-72 flex-shrink-0 flex flex-col">
          {/* Column Header */}
          <div className="bg-muted/50 rounded-t-lg p-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
          </div>

          {/* Column Content */}
          <div className="bg-muted/30 rounded-b-lg p-3 flex-1 space-y-3 min-h-[400px]">
            {/* Generate varying number of cards per column */}
            {[...Array(colIndex === 0 ? 4 : colIndex === 1 ? 3 : colIndex === 2 ? 2 : 3)].map((_, cardIndex) => (
              <div key={cardIndex} className="bg-background rounded-lg p-3 shadow-sm border">
                {/* Card Title */}
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-3" />

                {/* Card Labels */}
                <div className="flex gap-1 mb-3">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  {cardIndex % 2 === 0 && <Skeleton className="h-5 w-16 rounded-full" />}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex -space-x-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    {cardIndex % 3 === 0 && <Skeleton className="h-6 w-6 rounded-full" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                </div>
              </div>
            ))}

            {/* Add task button skeleton */}
            <Skeleton className="h-9 w-full rounded-md opacity-50" />
          </div>
        </div>
      ))}
    </div>
  );
}
