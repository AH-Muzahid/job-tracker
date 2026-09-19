"use client";

import Link from "next/link";
import { ArrowRight, Search, FileEdit, FileText, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AICareerCopilotCardProps {
  onAnalyzeJD?: () => void;
}

export function AICareerCopilotCard({ onAnalyzeJD }: AICareerCopilotCardProps) {
  const quickActions = [
    {
      id: "analyze-jd",
      label: "Analyze a job description",
      icon: Search,
      href: "/discovery?tab=evaluate",
      onClick: onAnalyzeJD,
    },
    {
      id: "improve-resume",
      label: "Improve my resume",
      icon: FileEdit,
      href: "/resumes",
    },
    {
      id: "generate-cover-letter",
      label: "Generate a cover letter",
      icon: FileText,
      href: "/resumes",
    },
    {
      id: "prep-interview",
      label: "Prepare for an interview",
      icon: Target,
      href: "/interview-prep",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-[#f8fafb] dark:bg-slate-900/80 p-4 sm:p-5 shadow-2xs transition-all">
      {/* Header: Dual-star icon matching reference */}
      <div className="flex items-center gap-2.5">
        <div className="relative size-5 shrink-0">
          <svg viewBox="0 0 24 24" className="size-5" fill="none">
            <path d="M7.5 2L9 6.5L13.5 8L9 9.5L7.5 14L6 9.5L1.5 8L6 6.5L7.5 2Z" fill="#3B82F6" />
            <path d="M16 11L17.2 14.5L20.5 16L17.2 17.5L16 21L14.8 17.5L11.5 16L14.8 14.5L16 11Z" fill="#F59E0B" />
          </svg>
        </div>
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
          Your AI Career Copilot
        </h2>
      </div>

      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
        I&apos;m here to help you find, apply, and land your next opportunity.
      </p>

      {/* Primary Action Button */}
      <div className="mt-3.5">
        <Button
          asChild
          className="w-full h-10 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Link href="/discovery">
            <span>Find Opportunities</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* 4 Clean White Quick Action Cards */}
      <div className="mt-2.5 space-y-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          if (action.onClick) {
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all text-left cursor-pointer group shadow-2xs"
              >
                <Icon className="size-4 text-slate-500 group-hover:text-blue-600 transition-colors shrink-0 stroke-[1.75]" />
                <span className="truncate">{action.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={action.id}
              href={action.href}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all group shadow-2xs"
            >
              <Icon className="size-4 text-slate-500 group-hover:text-blue-600 transition-colors shrink-0 stroke-[1.75]" />
              <span className="truncate">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
