"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ChatBoxSkeleton() {
  return (
    <Card className="grow flex flex-col h-full overflow-hidden">
      {/* Header Skeleton */}
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      {/* Messages Skeleton */}
      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-4">
        {/* Incoming message */}
        <div className="flex items-start gap-2">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-16 w-64 rounded-lg" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-48 rounded-lg" />
        </div>

        {/* Incoming message */}
        <div className="flex items-start gap-2">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
        </div>

        {/* Outgoing message */}
        <div className="flex justify-end">
          <Skeleton className="h-20 w-56 rounded-lg" />
        </div>

        {/* Incoming message */}
        <div className="flex items-start gap-2">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-14 w-52 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="shrink-0 border-t p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

export function ChatBoxInitialSkeleton() {
  return (
    <Card className="grow grid place-items-center">
      <div className="p-8 space-y-4 w-full max-w-md">
        <div className="flex items-center gap-3 justify-center">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
          <Skeleton className="h-4 w-4/6 mx-auto" />
        </div>
      </div>
    </Card>
  );
}
