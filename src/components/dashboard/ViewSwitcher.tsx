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
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
      {views.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            current === key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
