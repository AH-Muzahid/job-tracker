"use client"

import { Plus, MoreHorizontal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import BoardCard from "./BoardCard"
import { boardColumns } from "./types"
import type { Application } from "./types"

type BoardColumn = (typeof boardColumns)[number]

interface Props {
  applications: Application[]
  onSelect: (id: string) => void
  onAddNew: () => void
}

export default function BoardView({ applications, onSelect, onAddNew }: Props) {
  const board = boardColumns.map((column) => ({
    ...column,
    items: applications.filter((application) =>
      (column.statuses as readonly string[]).includes(application.status)
    ),
  }))

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {board.map((column) => (
        <BoardColumnCard key={column.key} column={column} onSelect={onSelect} />
      ))}

      <Card className="flex items-start justify-center p-4 border-dashed">
        <Button variant="ghost" size="icon" onClick={onAddNew} className="h-9 w-9">
          <Plus className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  )
}

function BoardColumnCard({
  column,
  onSelect,
}: {
  column: BoardColumn & { items: Application[] }
  onSelect: (id: string) => void
}) {
  const Icon = column.icon

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-xs font-semibold">{column.title}</h2>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {column.items.length}
          </Badge>
        </div>

        <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2.5 p-2.5 min-h-[200px]">
        {column.items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-xs text-muted-foreground/70">No jobs</p>
          </div>
        ) : (
          column.items.map((application) => (
            <BoardCard
              key={application.id}
              application={application}
              onClick={() => onSelect(application.id)}
            />
          ))
        )}
      </div>
    </Card>
  )
}
