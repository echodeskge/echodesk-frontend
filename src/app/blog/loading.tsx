import { Skeleton } from '@/components/ui/skeleton';

export default function BlogLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16 space-y-12">
      <div className="max-w-3xl mx-auto space-y-4 text-center">
        <Skeleton className="h-6 w-24 mx-auto" />
        <Skeleton className="h-10 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
