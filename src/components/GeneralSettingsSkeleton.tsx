"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state of a settings FORM PAGE (design: 40px icon tile + title, then
 * sections with a 44px muted header and field rows: label + help left,
 * control right). `sections` lists the number of rows per section.
 */
export function SettingsFormSkeleton({ sections = [1, 1, 2] }: { sections?: number[] }) {
  return (
    <section className="w-full p-4 sm:p-6" aria-busy="true" data-testid="settings-form-skeleton">
      <div className="flex w-full max-w-[720px] flex-col gap-5">
        <div className="flex items-start gap-3.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-[10px]" />
          <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-full max-w-72" />
          </div>
        </div>
        {sections.map((rows, i) => (
          <div key={i} className="overflow-hidden rounded-[10px] border bg-card">
            <div className="flex min-h-11 items-center border-b bg-muted/35 px-4">
              <Skeleton className="h-3.5 w-36" />
            </div>
            {Array.from({ length: rows }).map((_, j) => (
              <div key={j} className="flex flex-col gap-3 border-b px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-full max-w-64" />
                </div>
                <Skeleton className="h-[30px] w-full rounded-md sm:w-40" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function GeneralSettingsSkeleton() {
  return <SettingsFormSkeleton sections={[1, 1, 2]} />;
}
