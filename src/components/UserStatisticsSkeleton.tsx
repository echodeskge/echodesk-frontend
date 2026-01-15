"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function UserStatisticsSkeleton() {
  return (
    <div>
      {/* Header */}
      <Card className="mb-6 shadow-none border border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-64" />
          </div>
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shadow-none border border-gray-200">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <Skeleton className="h-8 w-8 rounded-full mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Statistics Table */}
      <Card className="shadow-none border border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="[&_tr]:border-b [&_tr]:border-gray-100">
              <TableRow className="border-b border-gray-100 hover:bg-transparent">
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0 [&_tr]:border-b [&_tr]:border-gray-100">
              {[...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <TableCell>
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-4 shadow-none border border-gray-200">
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
