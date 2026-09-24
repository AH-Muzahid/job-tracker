import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-full">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (Main Cockpit: ~75% on desktop / 9 cols) */}
        <div className="xl:col-span-9 flex flex-col space-y-5 min-w-0">
          {/* 1. Header Greeting Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 pb-1">
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-56 rounded-lg bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-4 w-72 rounded-md bg-slate-100 dark:bg-slate-800" />
            </div>
            <Skeleton className="hidden sm:block h-12 w-64 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>

          {/* 2. Top 4 Core Career KPIs Skeleton (Moved above insights) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-4 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20 rounded-md bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-7 w-14 rounded-md bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-3 w-24 rounded-md bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>

          {/* 3. Daily Strategic Briefing Card Skeleton */}
          <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6.5 rounded-md bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-4.5 w-40 rounded-md bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-4 w-16 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
              <Skeleton className="h-3.5 w-20 rounded-md bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center pb-0.5">
                  <Skeleton className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-2.5 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60" />
                <Skeleton className="h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60" />
                <Skeleton className="h-10 w-full rounded-lg bg-slate-50 dark:bg-slate-800/60" />
              </div>
              <div className="space-y-2 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                  <Skeleton className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <Skeleton className="h-3.5 w-48 rounded bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-8 w-full rounded-md bg-slate-100/70 dark:bg-slate-800/60" />
                <Skeleton className="h-7 w-full rounded-md bg-slate-100/70 dark:bg-slate-800/60" />
              </div>
            </div>
          </div>

          {/* 3. Recommended Opportunities Skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48 rounded-md bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-4 w-16 rounded-md bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-28 rounded-md bg-slate-100 dark:bg-slate-800" />
                      <Skeleton className="h-3 w-20 rounded-md bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full rounded-xl bg-slate-50 dark:bg-slate-800/60" />
                  <Skeleton className="h-8 w-full rounded-xl bg-slate-50 dark:bg-slate-800/60" />
                </div>
              ))}
            </div>
          </div>

          {/* 4. Recent Applications & Upcoming Interviews Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <Skeleton className="h-4 w-36 rounded-md bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-3 w-16 rounded-md bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-xl bg-slate-50 dark:bg-slate-800/60" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <Skeleton className="h-4 w-36 rounded-md bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-3 w-16 rounded-md bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl bg-slate-50 dark:bg-slate-800/60" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail Column (~25% on desktop / 3 cols) */}
        <div className="xl:col-span-3 flex flex-col space-y-4 min-w-0">
          {/* AI Career Copilot Card Skeleton */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-4 w-36 rounded-md bg-slate-100 dark:bg-slate-800" />
            </div>
            <Skeleton className="h-14 w-full rounded-xl bg-slate-50 dark:bg-slate-800/60" />
            <Skeleton className="h-8 w-full rounded-xl bg-slate-50 dark:bg-slate-800/60" />
          </div>

          {/* Today's Tasks Skeleton */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3">
            <Skeleton className="h-4 w-28 rounded-md bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-xl bg-slate-50 dark:bg-slate-800/60" />
              ))}
            </div>
          </div>

          {/* Stay Consistent Skeleton */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-3">
            <Skeleton className="h-4 w-28 rounded-md bg-slate-100 dark:bg-slate-800" />
            <div className="flex items-center justify-between gap-1 pt-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="size-7 rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
