import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders sized like the real thing, so nothing jumps when data
 * arrives. A card with a one-line title is 1 + 8 + 18 + 6 + 18 + 6 + 20 + 8 + 1
 * = 86px; a list row is 40px; a list group row 34px.
 */
export const SKELETON_HEIGHTS = { card: 86, row: 40, groupRow: 34 } as const;

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="card-skeleton"
      className={cn("flex h-[86px] flex-col gap-1.5 rounded-md border bg-card px-2.5 py-2", className)}
    >
      <div className="flex h-[18px] items-center gap-1.5">
        <Skeleton className="h-3 w-9" />
        <Skeleton className="h-[18px] w-14 rounded" />
      </div>
      <Skeleton className="h-[18px] w-4/5" />
      <div className="flex h-5 items-center gap-2.5">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="ml-auto h-3 w-6" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}

export function RowSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="row-skeleton"
      className={cn(
        "grid h-10 grid-cols-[36px_64px_minmax(0,1fr)] items-center border-b px-4 md:grid-cols-[36px_64px_minmax(0,1fr)_200px_90px_56px_90px]",
        className,
      )}
    >
      <Skeleton className="size-[15px] rounded" />
      <Skeleton className="h-3 w-10" />
      <Skeleton className="h-3.5 w-3/5" />
      <Skeleton className="hidden h-5 w-24 rounded md:block" />
      <Skeleton className="hidden size-[22px] rounded-full md:block" />
      <Skeleton className="hidden h-3 w-6 justify-self-end md:block" />
      <Skeleton className="hidden h-3 w-12 justify-self-end md:block" />
    </div>
  );
}

export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" data-slot="detail-skeleton" className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex h-[41px] shrink-0 border-b bg-muted/30">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-w-[120px] flex-1 items-center gap-2 border-r px-4">
            <Skeleton className="size-[18px] rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-[22px] p-4 md:px-10 md:py-6">
          <div className="flex max-w-[780px] flex-col gap-2.5">
            <div className="flex gap-1.5">
              <Skeleton className="h-[22px] w-16 rounded-md" />
              <Skeleton className="h-[22px] w-14 rounded-md" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-2 h-24 w-full" />
            <Skeleton className="mt-3 h-11 w-full rounded-[10px]" />
            <Skeleton className="h-11 w-full rounded-[10px]" />
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col border-t px-3 py-2 md:w-[300px] md:border-l md:border-t-0">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid min-h-[38px] grid-cols-[92px_minmax(0,1fr)] items-center gap-2 border-b py-[7px]">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
