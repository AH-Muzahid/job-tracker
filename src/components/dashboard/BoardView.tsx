"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { DecorIcon } from "@/components/decor-icon"
import { DashboardCard } from "@/components/dashboard-card"
import BoardCard from "./BoardCard"
import { boardColumns } from "./types"
import type { Application } from "./types"

type BoardColumn = (typeof boardColumns)[number]

interface Props {
  applications: Application[]
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, status: string) => void
  onDragEnd: (result: DropResult) => void
}

export default function BoardView({ applications, onSelect, onEdit, onDelete, onMoveTo, onDragEnd }: Props) {
  const board = useMemo(
    () =>
      boardColumns.map((column) => ({
        ...column,
        items: applications.filter((application) =>
          (column.statuses as readonly string[]).includes(application.status)
        ),
      })),
    [applications]
  )

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Mobile Column Quick-Jump Chips (Visible only on mobile) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2 -mt-1 no-scrollbar w-full max-w-full">
        {board.map((col) => (
          <a
            key={col.key}
            href={`#col-${col.key}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border border-border bg-card/60 text-muted-foreground hover:text-foreground whitespace-nowrap active:bg-muted shrink-0"
          >
            <span className={`h-2 w-2 rounded-full ${col.dot}`} />
            <span>{col.title}</span>
            <span className="font-mono text-[10px] text-muted-foreground">({col.items.length})</span>
          </a>
        ))}
      </div>

      <div className="relative border border-border bg-background w-full max-w-full overflow-hidden">
        <DecorIcon className="hidden md:block" position="top-left" />
        {/* Responsive Kanban container: Snap horizontal scroll on mobile, 5-col border divided on desktop */}
        <div className="flex md:grid md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border bg-background overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-smooth no-scrollbar w-full">
          {board.map((column) => (
            <div key={column.key} id={`col-${column.key}`} className="w-[82vw] sm:w-[320px] md:w-auto shrink-0 md:shrink md:flex-1 snap-start flex flex-col h-full bg-background">
              <BoardColumnCard
                column={column}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveTo={onMoveTo}
              />
            </div>
          ))}
        </div>
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
    <DashboardCard className="flex flex-col min-h-[550px] h-full flex-1 bg-background">
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{column.title}</h2>
        </div>
        <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono border-border bg-muted/30">
          {column.items.length}
        </Badge>
      </div>

      {/* Droppable Card List */}
      <Droppable droppableId={column.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-2.5 p-3 flex-1 h-full min-h-[480px] bg-background transition-colors"
          >
            {column.items.length === 0 && !snapshot.isDraggingOver ? (
              <div className="flex flex-col items-center justify-center h-36 rounded-md border border-dashed border-border/80 text-center p-4">
                <p className="text-sm text-muted-foreground font-medium">No applications</p>
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
                      className={`select-none ${snapshot.isDragging ? "opacity-80 scale-102" : ""}`}
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
    </DashboardCard>
  )
}
