import { Skeleton } from '@/components/ui/skeleton';

export default function IntegrationsLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14 space-y-10">
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
      </div>
      {Array.from({ length: 3 }).map((_, block) => (
        <div key={block} className="space-y-4">
          <Skeleton className="h-7 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
