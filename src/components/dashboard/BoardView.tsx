"use client"

import { useMemo, useCallback } from "react"
import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { isFollowUpDue } from "@/lib/applications/follow-up-utils"
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
  onOpenFollowUp?: (id: string) => void
}

export default function BoardView({ applications, onSelect, onEdit, onDelete, onMoveTo, onDragEnd, onOpenFollowUp }: Props) {
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
      {/* Mobile & Tablet Column Quick-Jump Chips */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-2 -mt-1 no-scrollbar w-full max-w-full">
        {board.map((col) => (
          <a
            key={col.key}
            href={`#col-${col.key}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-medium border border-border bg-card/60 text-muted-foreground hover:text-foreground whitespace-nowrap active:bg-muted shrink-0"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
            {col.title}
            <span className="text-[10px] text-muted-foreground font-mono">({col.items.length})</span>
          </a>
        ))}
      </div>

      <div className="relative border border-border bg-border w-full max-w-full overflow-hidden rounded-[6px]">
        <DecorIcon className="hidden md:block" position="top-left" />
        <DecorIcon className="hidden md:block" position="top-right" />
        <div className="flex lg:grid lg:grid-cols-6 divide-y lg:divide-y-0 divide-x divide-border bg-background overflow-x-auto lg:overflow-visible snap-x snap-mandatory scroll-smooth no-scrollbar w-full">
          {board.map((column) => (
            <div key={column.key} id={`col-${column.key}`} className="w-[82vw] sm:w-[300px] lg:w-auto shrink-0 lg:shrink lg:flex-1 snap-start flex flex-col h-full bg-background">
              <BoardColumnCard
                column={column}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveTo={onMoveTo}
                onOpenFollowUp={onOpenFollowUp}
              />
            </div>
          ))}
        </div>
      </div>
    </DragDropContext>
  )
}

function DraggableCard({
  application,
  onSelect,
  onEdit,
  onDelete,
  onMoveTo,
  onOpenFollowUp,
}: {
  application: Application
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, status: string) => void
  onOpenFollowUp?: (id: string) => void
}) {
  const handleClick = useCallback(() => onSelect(application.id), [onSelect, application.id])
  const handleEdit = useCallback(() => onEdit(application.id), [onEdit, application.id])
  const handleDelete = useCallback(() => onDelete(application.id), [onDelete, application.id])
  const handleMoveTo = useCallback((status: string) => onMoveTo(application.id, status), [onMoveTo, application.id])

  return (
    <BoardCard
      application={application}
      onClick={handleClick}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onMoveTo={handleMoveTo}
      onOpenFollowUp={onOpenFollowUp}
    />
  )
}

function BoardColumnCard({
  column,
  onSelect,
  onEdit,
  onDelete,
  onMoveTo,
  onOpenFollowUp,
}: {
  column: BoardColumn & { items: Application[] }
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, status: string) => void
  onOpenFollowUp?: (id: string) => void
}) {
  const Icon = column.icon
  const followUpCount = useMemo(
    () => column.items.filter((app) => isFollowUpDue(app)).length,
    [column.items]
  )

  return (
    <DashboardCard className="flex flex-col min-h-[550px] h-full flex-1 bg-background">
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{column.title}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {followUpCount > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium font-mono px-1.5 py-0.5 rounded-[4px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              title={`${followUpCount} application(s) need follow-up`}
            >
              <Clock className="h-2.5 w-2.5" />
              {followUpCount} due
            </span>
          )}
          <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono border-border bg-muted/30 rounded-[4px]">
            {column.items.length}
          </Badge>
        </div>
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
              <div className="flex flex-col items-center justify-center h-36 rounded-[6px] border border-dashed border-border/80 text-center p-4">
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
                        className={`select-none transition-all ${
                          snapshot.isDragging
                            ? "opacity-95 shadow-xl rotate-1 scale-[1.02] z-50 ring-2 ring-primary/40 rounded-[6px]"
                            : ""
                        }`}
                      >
                        <DraggableCard
                          application={application}
                          onSelect={onSelect}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onMoveTo={onMoveTo}
                          onOpenFollowUp={onOpenFollowUp}
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
