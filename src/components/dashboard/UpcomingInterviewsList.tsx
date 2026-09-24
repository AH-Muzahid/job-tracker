"use client";

import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyBrandLogo } from "@/components/CompanyBrandLogo";

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
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <div className="h-5 w-36 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-2.5">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
            Upcoming Interviews
          </h2>
          <Link
            href="/interview-prep"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 group"
          >
            <span>View all</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="space-y-2.5 mt-1">
          {displayList.map((item) => {
            const formatted = item.interviewDateStr && item.interviewTimeStr
              ? { date: item.interviewDateStr, time: item.interviewTimeStr }
              : formatInterviewDateTime(item.interviewDate);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CompanyBrandLogo company={item.companyName} size={32} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.companyName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {item.jobTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="size-3.5 text-slate-400 shrink-0 stroke-[1.75]" />
                    <div className="flex flex-col text-left leading-tight">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        {formatted.date}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">
                        {formatted.time}
                      </span>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 px-3.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
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
    </div>
  );
}
