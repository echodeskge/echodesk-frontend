import { Skeleton } from '@/components/ui/skeleton';

export default function ContactLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="max-w-2xl mx-auto text-center space-y-3 mb-10">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-11 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
