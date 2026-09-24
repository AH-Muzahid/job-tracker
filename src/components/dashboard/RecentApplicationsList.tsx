"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyBrandLogo } from "@/components/CompanyBrandLogo";

export type RecentApplicationItem = {
  id: string;
  companyName: string;
  jobTitle: string;
  status: string;
  applicationDate?: string | Date | null;
  createdAt?: string | Date;
};

interface RecentApplicationsListProps {
  applications?: RecentApplicationItem[];
  isLoading?: boolean;
}

function timeAgo(date?: string | Date | null): string {
  if (!date) return "Recently";
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
}

function getStatusStyle(status: string) {
  const s = status.toLowerCase();
  if (s.includes("sent") || s === "applied") {
    return {
      label: "Application Sent",
      className: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
    };
  }
  if (s.includes("review") || s === "assessment") {
    return {
      label: "In Review",
      className: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    };
  }
  if (s.includes("interview")) {
    return {
      label: "Interviewing",
      className: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400",
    };
  }
  if (s.includes("staged")) {
    return {
      label: "Staged",
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    };
  }
  if (s.includes("saved")) {
    return {
      label: "Saved",
      className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    };
  }
  if (s.includes("rejected")) {
    return {
      label: "Rejected",
      className: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400",
    };
  }
  return {
    label: status,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
}

function isFollowUpDue(status: string, date?: string | Date | null): boolean {
  if (!date) return false;
  const s = status.toLowerCase();
  const isAwaiting = s.includes("sent") || s === "applied" || s === "assessment";
  if (!isAwaiting) return false;
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 5;
}

export function RecentApplicationsList({
  applications,
  isLoading,
}: RecentApplicationsListProps) {
  const seen = new Set<string>();
  const list = (applications ?? [])
    .filter((app) => {
      const key = `${(app.companyName || "").toLowerCase().trim()}:${(app.jobTitle || "").toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <div className="h-5 w-36 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
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
            Recent Applications
          </h2>
          <Link
            href="/applications"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 group"
          >
            <span>View all</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="space-y-1.5 mt-1">
          {list.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No applications yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Get started by staging an opportunity or applying to a role.
              </p>
              <Link
                href="/discovery"
                className="mt-3 inline-flex text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Get started
              </Link>
            </div>
          ) : (
            list.map((app) => {
              const statusStyle = getStatusStyle(app.status);
              const needsFollowUp = isFollowUpDue(app.status, app.applicationDate || app.createdAt);

              return (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="flex items-center justify-between py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyBrandLogo company={app.companyName} size={32} />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {app.companyName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                        {app.jobTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {needsFollowUp && (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        Follow-up
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                        statusStyle.className
                      )}
                    >
                      {statusStyle.label}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline-block font-normal min-w-[65px] text-right">
                      {timeAgo(app.applicationDate || app.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
