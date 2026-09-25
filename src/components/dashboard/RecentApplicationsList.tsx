"use client";

import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { CompanyBrandLogo } from "@/components/CompanyBrandLogo";
import { StatusBadge } from "@/components/StatusBadge";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";
import { EmptyState } from "@/components/primitives/EmptyState";

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
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks}w ago`;
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
      <BlueprintCard className="p-4 sm:p-5">
        <div className="h-5 w-36 bg-muted rounded-sm animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
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
            Recent Applications
          </h2>
          <Link
            href="/applications"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group"
          >
            <span>View all</span>
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="space-y-1 mt-2">
          {list.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No applications yet"
              description="Get started by staging an opportunity or applying to a role."
              action={{
                label: "Explore Discovery",
                href: "/discovery",
              }}
              className="py-6"
            />
          ) : (
            list.map((app) => {
              const needsFollowUp = isFollowUpDue(app.status, app.applicationDate || app.createdAt);

              return (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-muted/50 rounded-[4px] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyBrandLogo company={app.companyName} size={30} />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {app.companyName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate font-normal">
                        {app.jobTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {needsFollowUp && (
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-sm bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                        <span className="size-1 rounded-full bg-amber-500" />
                        Follow-up
                      </span>
                    )}
                    <StatusBadge status={app.status} size="sm" />
                    <span className="text-xs text-muted-foreground hidden sm:inline-block tabular-nums font-normal min-w-[55px] text-right">
                      {timeAgo(app.applicationDate || app.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </BlueprintCard>
  );
}
