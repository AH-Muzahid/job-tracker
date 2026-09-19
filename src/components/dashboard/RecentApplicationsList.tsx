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
      className: "bg-[#eff6ff] text-[#2563eb] dark:bg-blue-950/60 dark:text-blue-400",
    };
  }
  if (s.includes("review") || s === "assessment") {
    return {
      label: "In Review",
      className: "bg-[#eff6ff] text-[#2563eb] dark:bg-blue-950/60 dark:text-blue-400",
    };
  }
  if (s.includes("interview")) {
    return {
      label: "Interviewing",
      className: "bg-[#eff6ff] text-[#2563eb] dark:bg-blue-950/60 dark:text-blue-400",
    };
  }
  if (s.includes("staged")) {
    return {
      label: "Staged",
      className: "bg-[#ecfdf5] text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400",
    };
  }
  return {
    label: status,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
}

const referenceApplications: RecentApplicationItem[] = [
  {
    id: "app-1",
    companyName: "Stripe",
    jobTitle: "Software Engineer",
    status: "Application Sent",
    applicationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "app-2",
    companyName: "Linear",
    jobTitle: "Product Manager",
    status: "In Review",
    applicationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "app-3",
    companyName: "Anthropic",
    jobTitle: "Research Engineer",
    status: "Interviewing",
    applicationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "app-4",
    companyName: "Figma",
    jobTitle: "Product Designer",
    status: "Staged",
    applicationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
];

export function RecentApplicationsList({
  applications,
  isLoading,
}: RecentApplicationsListProps) {
  const list = applications && applications.length > 0 ? applications.slice(0, 4) : referenceApplications;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
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
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between h-full">
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
          {list.map((app) => {
            const statusStyle = getStatusStyle(app.status);

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

                <div className="flex items-center gap-3 shrink-0 ml-2">
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
          })}
        </div>
      </div>
    </div>
  );
}
