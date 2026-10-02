import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {/* Desktop History Sidebar Placeholder */}
      <aside 
        aria-label="Loading chat workspace"
        className="hidden md:flex h-full w-64 shrink-0 flex-col border-r border-border bg-card/60 p-3 space-y-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <Skeleton className="h-4 w-24 rounded-sm" />
          <Skeleton className="h-3 w-16 rounded-sm" />
        </div>
        <Skeleton className="h-9 w-full rounded-sm" />
        <Skeleton className="h-8 w-full rounded-sm" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-7 w-full rounded-sm" />
          <Skeleton className="h-7 w-full rounded-sm" />
          <Skeleton className="h-7 w-full rounded-sm" />
        </div>
      </aside>

      {/* Main Workspace Placeholder */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-background">
        <div className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-sm" />
            <Skeleton className="h-4 w-32 rounded-sm" />
          </div>
          <Skeleton className="h-7 w-28 rounded-sm" />
        </div>
        <div className="flex-1 p-6 space-y-4 max-w-3xl mx-auto w-full">
          <Skeleton className="h-5 w-48 rounded-sm" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
        <div className="shrink-0 border-t border-border bg-background p-3">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      </main>
    </div>
  )
}
