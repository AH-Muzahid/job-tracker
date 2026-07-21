import Link from "next/link"
import { Plus, MoreHorizontal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import BoardCard from "./BoardCard"
import { boardColumns } from "./types"
import type { Application } from "./types"

type BoardColumn = (typeof boardColumns)[number]

export default function BoardView({ applications }: { applications: Application[] }) {
  const board = boardColumns.map((column) => ({
    ...column,
    items: applications.filter((application) =>
      (column.statuses as readonly string[]).includes(application.status)
    ),
  }))

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {board.map((column) => (
        <BoardColumnCard key={column.key} column={column} />
      ))}

      <Card className="flex items-start justify-center p-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/applications/new" aria-label="Add job">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </Card>
    </div>
  )
}

function BoardColumnCard({ column }: { column: BoardColumn & { items: Application[] } }) {
  const Icon = column.icon

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
          <h2 className="text-sm font-semibold">{column.title}</h2>
          <Badge variant="secondary" className="text-xs">
            {column.items.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <button className="rounded-md p-1 hover:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button className="rounded-md p-1 hover:bg-muted">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {column.items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No jobs here yet.
          </div>
        ) : (
          column.items.map((application) => (
            <BoardCard key={application.id} application={application} />
          ))
        )}
      </div>
    </Card>
  )
}
