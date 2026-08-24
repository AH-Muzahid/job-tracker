import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4 sm:py-6 px-3 sm:px-6 pb-16 w-full min-w-0">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-96 max-w-full rounded-sm" />
      </div>

      {/* 3-Step Wizard Navigation Skeleton */}
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-muted/60 border border-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 sm:p-2.5 rounded-lg">
            <Skeleton className="size-5 rounded-full shrink-0" />
            <div className="space-y-1 flex-1 hidden sm:block">
              <Skeleton className="h-3 w-20 rounded-sm" />
              <Skeleton className="h-2.5 w-28 rounded-sm" />
            </div>
          </div>
        ))}
      </div>

      {/* Wizard Form Card Skeleton */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-5">
        <div className="space-y-1.5 pb-4 border-b border-border">
          <Skeleton className="h-5 w-40 rounded-sm" />
          <Skeleton className="h-3.5 w-64 rounded-sm" />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-sm" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28 rounded-sm" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28 rounded-sm" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center border-t border-border">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
