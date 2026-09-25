"use client";

import Link from "next/link";
import { ArrowRight, Search, FileEdit, FileText, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";

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
    <BlueprintCard className="p-4 sm:p-5 transition-all">
      {/* Header: Dual-star brand mark */}
      <div className="flex items-center gap-2.5">
        <div className="relative size-5 shrink-0">
          <svg viewBox="0 0 24 24" className="size-5" fill="none">
            <path d="M7.5 2L9 6.5L13.5 8L9 9.5L7.5 14L6 9.5L1.5 8L6 6.5L7.5 2Z" fill="#3B82F6" />
            <path d="M16 11L17.2 14.5L20.5 16L17.2 17.5L16 21L14.8 17.5L11.5 16L14.8 14.5L16 11Z" fill="#F59E0B" />
          </svg>
        </div>
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
          Your AI Career Copilot
        </h2>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed font-normal">
        Your intelligent assistant to evaluate roles, tailor materials, and land opportunities.
      </p>

      {/* Primary Action Button - Solid Stripe Primary, No Gradient */}
      <div className="mt-3.5">
        <Button
          asChild
          className="w-full h-9 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-none cursor-pointer"
        >
          <Link href="/discovery">
            <span>Find Opportunities</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Quick Action List */}
      <div className="mt-2.5 space-y-1.5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          if (action.onClick) {
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors text-left cursor-pointer group"
              >
                <Icon className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 stroke-[1.75]" />
                <span className="truncate">{action.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={action.id}
              href={action.href}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors group"
            >
              <Icon className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 stroke-[1.75]" />
              <span className="truncate">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </BlueprintCard>
  );
}
