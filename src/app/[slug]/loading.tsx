import { Skeleton } from '@/components/ui/skeleton';

export default function LandingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14 space-y-10">
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-12 w-5/6" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
