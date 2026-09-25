"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";

export type TaskItem = {
  id: string;
  title: string;
  subtitle: string;
  completed: boolean;
  href?: string;
};

interface TodayTasksCardProps {
  tasks?: TaskItem[];
  isLoading?: boolean;
}

const referenceTasks: TaskItem[] = [
  {
    id: "task-1",
    title: "Review 3 new opportunities",
    subtitle: "Fresh matches available",
    completed: false,
    href: "/discovery",
  },
  {
    id: "task-2",
    title: "Complete application for Stripe",
    subtitle: "Marked complete",
    completed: true,
    href: "/applications",
  },
  {
    id: "task-3",
    title: "Prepare for upcoming interview",
    subtitle: "In 2 days",
    completed: false,
    href: "/interview-prep",
  },
];

export function TodayTasksCard({ tasks, isLoading }: TodayTasksCardProps) {
  const todayKey = typeof window !== "undefined"
    ? `careertrack_tasks_${new Date().toISOString().slice(0, 10)}`
    : null;

  const [taskList, setTaskList] = useState<TaskItem[]>(() => {
    const initial = tasks && tasks.length > 0 ? tasks : referenceTasks;
    if (typeof window !== "undefined" && todayKey) {
      try {
        const saved = localStorage.getItem(todayKey);
        if (saved) {
          const completedMap: Record<string, boolean> = JSON.parse(saved);
          return initial.map((t) => ({
            ...t,
            completed: completedMap[t.id] ?? t.completed,
          }));
        }
      } catch {}
    }
    return initial;
  });

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      if (typeof window !== "undefined" && todayKey) {
        try {
          const saved = localStorage.getItem(todayKey);
          if (saved) {
            const completedMap: Record<string, boolean> = JSON.parse(saved);
            setTaskList(
              tasks.map((t) => ({
                ...t,
                completed: completedMap[t.id] ?? t.completed,
              }))
            );
            return;
          }
        } catch {}
      }
      setTaskList(tasks);
    }
  }, [tasks, todayKey]);

  const toggleTask = (taskId: string) => {
    setTaskList((prev) => {
      const next = prev.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      if (typeof window !== "undefined" && todayKey) {
        try {
          const map = next.reduce(
            (acc, t) => ({ ...acc, [t.id]: t.completed }),
            {}
          );
          localStorage.setItem(todayKey, JSON.stringify(map));
        } catch {}
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <BlueprintCard className="p-4 sm:p-5 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded-sm mb-4" />
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted/50 rounded-sm" />
          ))}
        </div>
      </BlueprintCard>
    );
  }

  return (
    <BlueprintCard className="p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1">
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
          Today&apos;s Tasks
        </h2>
        <span className="flex size-5 items-center justify-center rounded-sm bg-muted text-[11px] font-medium text-foreground tabular-nums">
          {taskList.length}
        </span>
      </div>

      {/* Task List */}
      <div className="mt-2.5 space-y-2.5">
        {taskList.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-2.5 py-0.5 group cursor-pointer"
            onClick={() => toggleTask(task.id)}
          >
            <div
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors",
                task.completed
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-border hover:border-foreground/40 bg-card"
              )}
            >
              {task.completed && <Check className="size-3 stroke-[2.5] text-white" />}
            </div>

            <div className="min-w-0 flex-1 select-none">
              <p
                className={cn(
                  "text-xs leading-snug transition-colors",
                  task.completed
                    ? "font-normal text-muted-foreground line-through"
                    : "font-medium text-foreground group-hover:text-primary"
                )}
              >
                {task.title}
              </p>
              <p className="text-[11px] text-muted-foreground/75 mt-0.5 font-normal">
                {task.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom right link */}
      <div className="mt-3.5 pt-2.5 border-t border-border/50 flex justify-end">
        <Link
          href="/weekly-goals"
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group"
        >
          <span>View all tasks</span>
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </BlueprintCard>
  );
}
