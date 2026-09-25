"use client";

import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyBrandLogo } from "@/components/CompanyBrandLogo";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";

export type UpcomingInterviewItem = {
  id: string;
  companyName: string;
  jobTitle: string;
  interviewDate?: string | Date | null;
  interviewRound?: string | null;
  status?: string;
  interviewDateStr?: string;
  interviewTimeStr?: string;
};

interface UpcomingInterviewsListProps {
  interviews?: UpcomingInterviewItem[];
  isLoading?: boolean;
}

function formatInterviewDateTime(dateInput?: string | Date | null): { date: string; time: string } {
  if (!dateInput) return { date: "Upcoming", time: "This week" };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { date: "Upcoming", time: "This week" };
  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { date: dateStr, time: timeStr };
}

const fallbackInterviews: UpcomingInterviewItem[] = [
  {
    id: "int-1",
    companyName: "Anthropic",
    jobTitle: "Product Engineer",
    interviewDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "int-2",
    companyName: "Google",
    jobTitle: "Product Manager",
    interviewDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "int-3",
    companyName: "Stripe",
    jobTitle: "Software Engineer",
    interviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
];

export function UpcomingInterviewsList({
  interviews,
  isLoading,
}: UpcomingInterviewsListProps) {
  const displayList = interviews && interviews.length > 0 ? interviews.slice(0, 3) : fallbackInterviews;

  if (isLoading) {
    return (
      <BlueprintCard className="p-4 sm:p-5">
        <div className="h-5 w-36 bg-muted rounded-sm animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-sm animate-pulse" />
          ))}
        </div>
      </BlueprintCard>
    );
  }

  return (
    <BlueprintCard className="p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
            Upcoming Interviews
          </h2>
          <Link
            href="/interview-prep"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group"
          >
            <span>View all</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="space-y-1 mt-2">
          {displayList.map((item) => {
            const formatted = item.interviewDateStr && item.interviewTimeStr
              ? { date: item.interviewDateStr, time: item.interviewTimeStr }
              : formatInterviewDateTime(item.interviewDate);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2.5 px-2 hover:bg-muted/50 rounded-[4px] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CompanyBrandLogo company={item.companyName} size={30} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {item.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate font-normal">
                      {item.jobTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5 text-muted-foreground/70 shrink-0 stroke-[1.75]" />
                    <div className="flex flex-col text-left leading-tight tabular-nums">
                      <span className="font-medium text-foreground text-xs">
                        {formatted.date}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                        {formatted.time}
                      </span>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs font-medium rounded-sm border-border bg-background text-foreground hover:bg-muted"
                  >
                    <Link
                      href={`/interview-prep?company=${encodeURIComponent(item.companyName)}&role=${encodeURIComponent(item.jobTitle)}`}
                    >
                      Prep
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BlueprintCard>
  );
}
