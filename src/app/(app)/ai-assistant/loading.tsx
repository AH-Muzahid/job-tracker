import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full max-w-4xl mx-auto p-4 sm:p-6 justify-between gap-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="h-3 w-48 rounded-sm" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>

      {/* Chat Messages Stream Skeleton */}
      <div className="flex-1 flex flex-col justify-end space-y-4 py-4">
        {/* Assistant Message Bubble */}
        <div className="flex items-start gap-3 max-w-xl">
          <Skeleton className="size-7 rounded-md shrink-0" />
          <div className="space-y-2 flex-1 p-4 rounded-xl border border-border bg-card/60">
            <Skeleton className="h-4 w-full rounded-sm" />
            <Skeleton className="h-4 w-5/6 rounded-sm" />
            <Skeleton className="h-4 w-3/4 rounded-sm" />
          </div>
        </div>

        {/* User Message Bubble */}
        <div className="flex justify-end">
          <div className="p-3.5 rounded-xl bg-muted/60 max-w-sm space-y-1.5">
            <Skeleton className="h-3.5 w-44 rounded-sm" />
            <Skeleton className="h-3.5 w-32 rounded-sm" />
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>

      {/* Bottom Chat Input Box Skeleton */}
      <div className="p-2 rounded-xl border border-border bg-card/80 space-y-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="flex justify-between items-center px-1">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )
}
