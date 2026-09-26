"use client";

import Link from "next/link";
import { Search, FileEdit, FileText, Target, Bot } from "lucide-react";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";

interface AICareerCopilotCardProps {
  onAnalyzeJD?: () => void;
}

export function AICareerCopilotCard({ onAnalyzeJD }: AICareerCopilotCardProps) {
  const quickActions = [
    {
      id: "find-jobs",
      label: "Find Jobs",
      icon: Search,
      href: "/discovery",
    },
    {
      id: "analyze-jd",
      label: "Analyze JD",
      icon: Target,
      onClick: onAnalyzeJD,
    },
    {
      id: "improve-resume",
      label: "Improve Resume",
      icon: FileEdit,
      href: "/resumes",
    },
    {
      id: "cover-letter",
      label: "Cover Letter",
      icon: FileText,
      href: "/resumes",
    },
  ];

  return (
    <BlueprintCard className="p-4 sm:p-5 transition-all">
      {/* Header: AI Copilot Mark */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-6 items-center justify-center rounded-sm bg-primary/10 text-primary shrink-0">
          <Bot className="size-3.5 stroke-[2]" />
        </div>
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
          Your AI Career Copilot
        </h2>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed font-normal">
        Find, analyze, and land your next opportunity.
      </p>

      {/* 2x2 Quick Action Grid matching Mobile Prototype */}
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <Icon className="size-3.5 text-primary shrink-0 stroke-[1.75]" />
              <span className="truncate">{action.label}</span>
            </>
          );

          if (action.onClick) {
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className="flex items-center gap-2 px-2.5 py-2 rounded-[4px] border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors text-left cursor-pointer group shadow-2xs"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={action.id}
              href={action.href || "#"}
              className="flex items-center gap-2 px-2.5 py-2 rounded-[4px] border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors group shadow-2xs"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </BlueprintCard>
  );
}
