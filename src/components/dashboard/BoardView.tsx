"use client"

import { Plus, MoreHorizontal } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import BoardCard from "./BoardCard"
import { boardColumns } from "./types"
import type { Application } from "./types"

type BoardColumn = (typeof boardColumns)[number]

interface Props {
  applications: Application[]
  onSelect: (id: string) => void
  onAddNew: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, status: string) => void
  onDragEnd: (result: DropResult) => void
}

export default function BoardView({ applications, onSelect, onAddNew, onEdit, onDelete, onMoveTo, onDragEnd }: Props) {
  const board = boardColumns.map((column) => ({
    ...column,
    items: applications.filter((application) =>
      (column.statuses as readonly string[]).includes(application.status)
    ),
  }))

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 xl:grid-cols-5">
        {board.map((column) => (
          <BoardColumnCard
            key={column.key}
            column={column}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveTo={onMoveTo}
          />
        ))}

        <Card className="flex items-start justify-center p-4 border-dashed">
          <Button variant="ghost" size="icon" onClick={onAddNew} className="h-9 w-9">
            <Plus className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    </DragDropContext>
  )
}

function BoardColumnCard({
  column,
  onSelect,
  onEdit,
  onDelete,
  onMoveTo,
}: {
  column: BoardColumn & { items: Application[] }
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, status: string) => void
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

      <Droppable droppableId={column.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2.5 p-2.5 min-h-[200px] transition-colors rounded-b-lg ${
              snapshot.isDraggingOver ? "bg-muted/50" : ""
            }`}
          >
            {column.items.length === 0 && !snapshot.isDraggingOver ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-xs text-muted-foreground/70">No jobs</p>
              </div>
            ) : (
              column.items.map((application, index) => (
                <Draggable key={application.id} draggableId={application.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={provided.draggableProps.style}
                      className={snapshot.isDragging ? "opacity-90" : ""}
                    >
                      <BoardCard
                        application={application}
                        onClick={() => onSelect(application.id)}
                        onEdit={() => onEdit(application.id)}
                        onDelete={() => onDelete(application.id)}
                        onMoveTo={(status) => onMoveTo(application.id, status)}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </Card>
  )
}
