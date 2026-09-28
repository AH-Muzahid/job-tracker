"use client"

import { useMemo, useCallback } from "react"
import { Clock, Plus } from "lucide-react"
import { isFollowUpDue } from "@/lib/applications/follow-up-utils"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
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
  onQuickAdd?: (status: string) => void
}

export default function BoardView({
  applications,
  onSelect,
  onEdit,
  onDelete,
  onMoveTo,
  onDragEnd,
  onOpenFollowUp,
  onQuickAdd,
}: Props) {
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
      {/* 6-Column Responsive Grid without Horizontal Scrollbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 w-full items-start">
        {board.map((column) => (
          <BoardColumnCard
            key={column.key}
            column={column}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveTo={onMoveTo}
            onOpenFollowUp={onOpenFollowUp}
            onQuickAdd={onQuickAdd}
          />
        ))}
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
  onQuickAdd,
}: {
  column: BoardColumn & { items: Application[] }
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onMoveTo: (id: string, status: string) => void
  onOpenFollowUp?: (id: string) => void
  onQuickAdd?: (status: string) => void
}) {
  const followUpCount = useMemo(
    () => column.items.filter((app) => isFollowUpDue(app)).length,
    [column.items]
  )

  return (
    <div className="flex flex-col h-full bg-card/40 rounded-[6px] border border-border p-1.5 min-w-0">
      {/* Sleek 1-line Column Header */}
      <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`size-2 rounded-full ${column.dot} shrink-0`} />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
            {column.title}
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {followUpCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold font-mono px-1 py-0.5 rounded-[3px] border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              title={`${followUpCount} due for follow-up`}
            >
              <Clock className="size-2" />
              {followUpCount}
            </span>
          )}

          <span className="text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.2 rounded border border-border bg-muted/60 text-muted-foreground">
            {column.items.length}
          </span>

          {onQuickAdd && (
            <button
              type="button"
              onClick={() => onQuickAdd(column.statuses[0])}
              className="opacity-50 hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
              title={`Add to ${column.title}`}
            >
              <Plus className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Droppable Card Area */}
      <Droppable droppableId={column.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-1.5 flex-1 min-h-[120px] transition-colors rounded-[4px] p-0.5 ${
              snapshot.isDraggingOver ? "bg-muted/40 ring-1 ring-inset ring-primary/30" : ""
            }`}
          >
            {column.items.length === 0 ? (
              snapshot.isDraggingOver ? (
                <div className="flex items-center justify-center h-16 rounded-[4px] border border-dashed border-primary/50 bg-primary/5 text-center p-2 text-primary font-medium text-[11px]">
                  Drop here
                </div>
              ) : (
                <div className="flex items-center justify-center h-16 rounded-[4px] border border-dashed border-border/50 text-center p-2 text-muted-foreground/40 text-[10px] select-none">
                  No roles
                </div>
              )
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
                          ? "opacity-95 shadow-xl rotate-1 scale-[1.02] z-50 ring-2 ring-primary/40 rounded-[5px]"
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
    </div>
  )
}
