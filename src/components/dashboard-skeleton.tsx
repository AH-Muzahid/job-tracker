import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/primitives/PageContainer";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";

export function DashboardSkeleton() {
  return (
    <PageContainer maxWidth="full">
      {/* 2-Column Master Layout matching Reference Standard */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column (Main Cockpit: ~75% on desktop / 9 cols) */}
        <div className="xl:col-span-9 flex flex-col space-y-5 sm:space-y-6 min-w-0">
          {/* 1. Header Greeting Skeleton */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1 pb-1">
            <div className="space-y-1.5 min-w-0">
              <Skeleton className="h-3 w-24 rounded-xs bg-muted" />
              <Skeleton className="h-7 w-56 rounded-sm bg-muted" />
              <Skeleton className="h-4 w-80 max-w-full rounded-sm bg-muted/60" />
            </div>
            <Skeleton className="hidden sm:block h-8 w-28 rounded-sm bg-muted shrink-0" />
          </div>

          {/* 2. Top 4 Core Career KPIs Skeleton (Horizontal 80px cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <BlueprintCard key={i} className="p-3.5 sm:p-4 flex items-center gap-3">
                <Skeleton className="size-10 rounded-sm bg-muted shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <Skeleton className="h-3 w-16 rounded-xs bg-muted" />
                    <Skeleton className="h-4 w-10 rounded-xs bg-muted/60" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-sm bg-muted" />
                  <Skeleton className="h-2.5 w-20 rounded-xs bg-muted/60" />
                </div>
              </BlueprintCard>
            ))}
          </div>

          {/* 3. Daily Strategic Briefing Card Skeleton */}
          <BlueprintCard className="p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-sm bg-muted" />
                <Skeleton className="h-4 w-40 rounded-sm bg-muted" />
                <Skeleton className="h-4 w-16 rounded-xs bg-muted" />
              </div>
              <Skeleton className="h-3.5 w-24 rounded-xs bg-muted" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-0.5">
                  <Skeleton className="h-3 w-28 rounded-xs bg-muted" />
                  <Skeleton className="h-2.5 w-16 rounded-xs bg-muted" />
                </div>
                <Skeleton className="h-10 w-full rounded-sm bg-muted/60" />
                <Skeleton className="h-10 w-full rounded-sm bg-muted/60" />
              </div>
              <div className="space-y-2 p-3 rounded-[6px] border border-border/60 bg-muted/20">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-24 rounded-xs bg-muted" />
                  <Skeleton className="h-3 w-16 rounded-xs bg-muted" />
                </div>
                <Skeleton className="h-4 w-48 rounded-sm bg-muted" />
                <Skeleton className="h-8 w-full rounded-sm bg-muted/60" />
                <Skeleton className="h-7 w-full rounded-sm bg-muted/60" />
              </div>
            </div>
          </BlueprintCard>

          {/* 4. Recommended Opportunities Skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-48 rounded-sm bg-muted" />
                <Skeleton className="h-3 w-64 rounded-xs bg-muted/60" />
              </div>
              <Skeleton className="h-3.5 w-16 rounded-xs bg-muted" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <BlueprintCard key={i} className="p-4 sm:p-4.5 flex flex-col justify-between h-[240px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="size-7 rounded-sm bg-muted" />
                        <Skeleton className="h-4 w-14 rounded-xs bg-muted" />
                      </div>
                      <Skeleton className="size-6 rounded-sm bg-muted/60" />
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded-sm bg-muted" />
                      <Skeleton className="h-3 w-20 rounded-xs bg-muted/60" />
                      <Skeleton className="h-3 w-24 rounded-xs bg-muted/60" />
                    </div>
                    <div className="mt-2.5 flex gap-1.5">
                      <Skeleton className="h-4 w-12 rounded-xs bg-muted/40" />
                      <Skeleton className="h-4 w-14 rounded-xs bg-muted/40" />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <Skeleton className="h-2.5 w-12 rounded-xs bg-muted/60 mb-2" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-8 w-full rounded-sm bg-muted/60" />
                      <Skeleton className="h-8 w-full rounded-sm bg-muted" />
                    </div>
                  </div>
                </BlueprintCard>
              ))}
            </div>
          </div>

          {/* 5. Recent Applications & Upcoming Interviews Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            <BlueprintCard className="p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <Skeleton className="h-4 w-36 rounded-sm bg-muted" />
                  <Skeleton className="h-3 w-16 rounded-xs bg-muted" />
                </div>
                <div className="space-y-2 mt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-sm bg-muted/50" />
                  ))}
                </div>
              </div>
            </BlueprintCard>

            <BlueprintCard className="p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <Skeleton className="h-4 w-36 rounded-sm bg-muted" />
                  <Skeleton className="h-3 w-16 rounded-xs bg-muted" />
                </div>
                <div className="space-y-2 mt-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-sm bg-muted/50" />
                  ))}
                </div>
              </div>
            </BlueprintCard>
          </div>
        </div>

        {/* Right Rail Column (~25% on desktop / 3 cols) */}
        <div className="xl:col-span-3 flex flex-col space-y-4 sm:space-y-5 min-w-0">
          {/* AI Career Copilot Card Skeleton */}
          <BlueprintCard className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-6 rounded-sm bg-muted" />
              <Skeleton className="h-4 w-36 rounded-sm bg-muted" />
            </div>
            <Skeleton className="h-8 w-full rounded-sm bg-muted/60" />
            <Skeleton className="h-9 w-full rounded-sm bg-muted" />
            <div className="space-y-1.5 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-[4px] bg-muted/40" />
              ))}
            </div>
          </BlueprintCard>

          {/* Today's Tasks Skeleton */}
          <BlueprintCard className="p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center gap-2 pb-1">
              <Skeleton className="h-4 w-28 rounded-sm bg-muted" />
              <Skeleton className="size-5 rounded-sm bg-muted" />
            </div>
            <div className="space-y-2 mt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <Skeleton className="size-4 rounded-xs bg-muted shrink-0" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3.5 w-3/4 rounded-xs bg-muted" />
                    <Skeleton className="h-2.5 w-1/2 rounded-xs bg-muted/60" />
                  </div>
                </div>
              ))}
            </div>
          </BlueprintCard>

          {/* Stay Consistent Skeleton */}
          <BlueprintCard className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-sm bg-muted" />
              <Skeleton className="h-4 w-28 rounded-sm bg-muted" />
            </div>
            <Skeleton className="h-6 w-3/4 rounded-xs bg-muted/60" />
            <div className="flex items-center justify-between px-1 pt-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <Skeleton className="size-3 rounded-full bg-muted" />
                  <Skeleton className="h-2.5 w-4 rounded-xs bg-muted/60" />
                </div>
              ))}
            </div>
          </BlueprintCard>
        </div>
      </div>
    </PageContainer>
  );
}
