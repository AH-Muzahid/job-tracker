import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      <div className="hidden md:flex w-64 flex-col gap-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-full rounded-xl" />
      </div>
    </div>
  )
}
