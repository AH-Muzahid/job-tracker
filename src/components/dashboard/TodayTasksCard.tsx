"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [taskList, setTaskList] = useState<TaskItem[]>(() =>
    tasks && tasks.length > 0 ? tasks : referenceTasks
  );

  const toggleTask = (taskId: string) => {
    setTaskList((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs animate-pulse">
        <div className="h-5 w-32 bg-slate-100 rounded mb-4" />
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
          Today&apos;s Tasks
        </h2>
        <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          3
        </span>
      </div>

      {/* Task List */}
      <div className="mt-2.5 space-y-3">
        {taskList.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 py-0.5 group cursor-pointer"
            onClick={() => toggleTask(task.id)}
          >
            <div
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                task.completed
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 dark:border-slate-600 hover:border-slate-400 bg-white dark:bg-slate-900"
              )}
            >
              {task.completed && <Check className="size-3 stroke-[2.5] text-white" />}
            </div>

            <div className="min-w-0 flex-1 select-none">
              <p
                className={cn(
                  "text-xs leading-snug transition-colors",
                  task.completed
                    ? "font-medium text-slate-600 dark:text-slate-400 line-through"
                    : "font-semibold text-slate-900 dark:text-white group-hover:text-blue-600"
                )}
              >
                {task.title}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
                {task.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom right: View all tasks link */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
        <Link
          href="/weekly-goals"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 group"
        >
          <span>View all tasks</span>
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
