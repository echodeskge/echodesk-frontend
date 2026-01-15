"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function TicketDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background w-full">
      {/* Header */}
      <div className="border-b">
        <div className="w-full max-w-7xl mx-auto flex h-14 items-center gap-4 px-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                </div>

                {/* Checklist */}
                <div>
                  <Skeleton className="h-4 w-24 mb-3" />
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachments */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>

            {/* Comments Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Comment input */}
                <Skeleton className="h-24 w-full" />
                <div className="flex justify-end">
                  <Skeleton className="h-9 w-32" />
                </div>

                {/* Comment list */}
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions Card */}
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>

                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>

                <Separator />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-10" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-16" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Skeleton className="h-3 w-20 mb-1" />
                  <div className="flex items-center gap-2 mt-1">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>

                <Separator />

                <div>
                  <Skeleton className="h-3 w-24 mb-1" />
                  <Skeleton className="h-4 w-40 mt-1" />
                </div>

                <Separator />

                <div>
                  <Skeleton className="h-3 w-24 mb-1" />
                  <Skeleton className="h-4 w-40 mt-1" />
                </div>

                <Separator />

                <div>
                  <Skeleton className="h-3 w-20 mb-1" />
                  <div className="space-y-1 mt-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>

                <Separator />

                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>

            {/* Time Tracking Card */}
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
