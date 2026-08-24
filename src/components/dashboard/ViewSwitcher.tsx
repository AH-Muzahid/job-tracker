import { LayoutGrid, List, TableIcon } from "lucide-react"
import type { ViewMode } from "./types"

const views: { key: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "list", label: "List", icon: List },
  { key: "table", label: "Table", icon: TableIcon },
]

export default function ViewSwitcher({
  current,
  onChange,
}: {
  current: ViewMode
  onChange: (view: ViewMode) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-card/60 p-1">
      {views.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
            current === key
              ? "bg-background text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
