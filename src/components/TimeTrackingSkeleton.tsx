"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function TimeTrackingSkeleton() {
  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Summary Stats - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-card border rounded-lg p-5 text-center"
          >
            <Skeleton className="h-10 w-24 mx-auto mb-2" />
            <Skeleton className="h-4 w-28 mx-auto" />
          </div>
        ))}
      </div>

      {/* Time by Column Section */}
      <div className="bg-card border rounded-lg p-5 mb-6">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-3 w-32 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Activity Section */}
      <div className="bg-card border rounded-lg p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="bg-muted/50 rounded-md p-3 text-center"
            >
              <Skeleton className="h-3 w-12 mx-auto mb-2" />
              <Skeleton className="h-5 w-14 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
