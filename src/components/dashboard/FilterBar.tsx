import { Filter, ArrowUpDown, LayoutList } from "lucide-react"

export default function FilterBar() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <button className="inline-flex items-center gap-1.5 hover:text-foreground">
        <Filter className="h-3.5 w-3.5" />
        Filter
      </button>
      <button className="inline-flex items-center gap-1.5 hover:text-foreground">
        <LayoutList className="h-3.5 w-3.5" />
        Group by
      </button>
      <button className="inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowUpDown className="h-3.5 w-3.5" />
        Sort by
      </button>
    </div>
  )
}
