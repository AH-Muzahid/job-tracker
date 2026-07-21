export default function FilterBar() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <button className="inline-flex items-center gap-1.5 hover:text-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Filter
      </button>
      <button className="inline-flex items-center gap-1.5 hover:text-foreground">
        Group by
      </button>
      <button className="inline-flex items-center gap-1.5 hover:text-foreground">
        Sort by
      </button>
    </div>
  )
}
