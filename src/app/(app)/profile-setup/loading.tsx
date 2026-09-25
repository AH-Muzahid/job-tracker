import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, PageHeader } from "@/components/primitives"

export default function Loading() {
  return (
    <PageContainer className="max-w-4xl pb-16 space-y-6">
      <PageHeader skeleton />

      {/* 3-Step Wizard Navigation Skeleton */}
      <div className="grid grid-cols-3 gap-2 border-b border-border/80 pb-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2.5 rounded-t-[4px] bg-muted/40">
            <Skeleton className="h-5 w-7 rounded-[2px]" />
            <Skeleton className="h-3 w-24 rounded-[4px] hidden sm:block" />
          </div>
        ))}
      </div>

      {/* Wizard Card Skeleton */}
      <div className="p-6 rounded-[6px] border border-border bg-card space-y-5">
        <div className="space-y-1.5 pb-4 border-b border-border/60">
          <Skeleton className="h-5 w-48 rounded-[4px]" />
          <Skeleton className="h-3.5 w-80 max-w-full rounded-[4px]" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-[6px]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-9 w-full rounded-[4px]" />
            <Skeleton className="h-9 w-full rounded-[4px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-9 w-full rounded-[4px]" />
            <Skeleton className="h-9 w-full rounded-[4px]" />
            <Skeleton className="h-9 w-full rounded-[4px]" />
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center border-t border-border/60">
          <Skeleton className="h-8 w-20 rounded-[4px]" />
          <Skeleton className="h-8 w-36 rounded-[4px]" />
        </div>
      </div>
    </PageContainer>
  )
}
