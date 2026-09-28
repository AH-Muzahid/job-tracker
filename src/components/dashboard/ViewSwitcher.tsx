import { LayoutGrid, List, Table2 } from "lucide-react"
import type { ViewMode } from "./types"

const views: { key: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "list", label: "List", icon: List },
  { key: "table", label: "Table", icon: Table2 },
]

export default function ViewSwitcher({
  current,
  onChange,
}: {
  current: ViewMode
  onChange: (view: ViewMode) => void
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[4px] border border-border bg-muted/30 p-0.5 select-none">
      {views.map(({ key, label, icon: Icon }) => {
        const isActive = current === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? "bg-background text-foreground shadow-2xs border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
