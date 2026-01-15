"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function GeneralSettingsSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Logo Settings Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-80 mt-1" />
            </div>

            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <Skeleton className="w-32 h-32 rounded-lg flex-shrink-0" />

              {/* Upload Button */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Management Settings Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Minimum Users Per Ticket */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Only Superadmin Can Delete Tickets */}
          <div className="flex items-start space-x-3">
            <Skeleton className="h-4 w-4" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
