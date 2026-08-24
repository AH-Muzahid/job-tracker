import { Skeleton } from "@/components/ui/skeleton"
import { DecorIcon } from "@/components/decor-icon"

export default function Loading() {
  return (
    <div className="space-y-4 max-w-full mx-auto pb-10">
      {/* Top Stat Strip */}
      <div className="relative border border-border bg-border">
        <DecorIcon className="hidden md:block" position="top-left" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 sm:p-5 bg-background space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16 rounded-sm" />
                <Skeleton className="h-3.5 w-10 rounded-full" />
              </div>
              <Skeleton className="h-6 w-12 rounded-sm" />
              <Skeleton className="h-2.5 w-20 rounded-sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60">
        <div className="flex flex-1 items-center gap-2">
          <Skeleton className="h-8 flex-1 max-w-xs rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md hidden md:block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Kanban Board Columns Skeleton */}
      <div className="relative border border-border bg-border">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-background min-h-[420px] p-3 sm:p-4 space-y-3">
              <div className="flex justify-between items-center pb-2.5 border-b border-border">
                <Skeleton className="h-3.5 w-20 rounded-sm" />
                <Skeleton className="h-3.5 w-6 rounded-sm" />
              </div>
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="p-3 border border-border rounded-lg bg-card/50 space-y-2.5">
                  <div className="flex gap-2">
                    <Skeleton className="size-7 rounded-md shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-24 rounded-sm" />
                      <Skeleton className="h-3 w-32 rounded-sm" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border/40">
                    <Skeleton className="h-4 w-14 rounded-full" />
                    <Skeleton className="h-3 w-12 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
