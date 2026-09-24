"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, MapPin, ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CompanyBrandLogo } from "@/components/CompanyBrandLogo";
import { useQueryClient } from "@tanstack/react-query";

export type Opportunity = {
  id: string;
  jobId?: string;
  title: string;
  company: string;
  location: string;
  isRemote?: boolean;
  url?: string;
  salary?: string | null;
  tags?: string[];
  fitScore: number;
  postedAt?: string | Date;
  isSaved?: boolean;
  status?: string;
  applicationId?: string;
};

interface RecommendedOpportunitiesProps {
  opportunities?: Opportunity[];
  isLoading?: boolean;
}

function timeAgo(date?: string | Date): string {
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

export function RecommendedOpportunities({
  opportunities,
  isLoading,
}: RecommendedOpportunitiesProps) {
  const queryClient = useQueryClient();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());
  const [packagingId, setPackagingId] = useState<string | null>(null);
  const [stagedIds, setStagedIds] = useState<Set<string>>(new Set());
  const [stagedAppMap, setStagedAppMap] = useState<Record<string, string>>({});

  const list = opportunities?.slice(0, 3) ?? [];

  // Helper to reliably compute saved state taking user overrides into account
  const isJobBookmarked = (job: Opportunity) => {
    if (unsavedIds.has(job.id)) return false;
    if (savedIds.has(job.id)) return true;
    return Boolean(job.isSaved);
  };

  const toggleBookmark = async (job: Opportunity) => {
    const isCurrentlySaved = isJobBookmarked(job);

    if (isCurrentlySaved) {
      // 1. Optimistic removal
      setUnsavedIds((prev) => new Set(prev).add(job.id));
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      toast.info(`Removed ${job.company} from saved opportunities`);

      try {
        const res = await fetch("/api/jobs/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unsave",
            jobId: job.jobId || job.id,
            companyName: job.company,
            jobTitle: job.title,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to unsave opportunity");
        }

        queryClient?.invalidateQueries({ queryKey: ["stats"] });
        queryClient?.invalidateQueries({ queryKey: ["discovery"] });
        queryClient?.invalidateQueries({ queryKey: ["applications"] });
      } catch (err) {
        console.error("[Bookmark] Failed to unsave:", err);
        // Revert optimistic removal
        setUnsavedIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
        toast.error(`Failed to remove ${job.company} from saved opportunities`);
      }
    } else {
      // 2. Optimistic save
      setSavedIds((prev) => new Set(prev).add(job.id));
      setUnsavedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      toast.success(`Bookmarked ${job.company} opportunity`);

      try {
        const res = await fetch("/api/jobs/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            jobId: job.jobId || job.id,
            companyName: job.company,
            jobTitle: job.title,
            jobUrl: job.url,
            location: job.location,
            status: "Saved",
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to save opportunity");
        }

        queryClient?.invalidateQueries({ queryKey: ["stats"] });
        queryClient?.invalidateQueries({ queryKey: ["discovery"] });
        queryClient?.invalidateQueries({ queryKey: ["applications"] });
      } catch (err) {
        console.error("[Bookmark] Failed to save:", err);
        // Revert optimistic save
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
        toast.error(`Failed to bookmark ${job.company} opportunity`);
      }
    }
  };

  const handlePackageAndStage = async (job: Opportunity) => {
    setPackagingId(job.id);
    try {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          jobId: job.jobId || job.id,
          companyName: job.company,
          jobTitle: job.title,
          jobUrl: job.url,
          location: job.location,
          status: "Staged",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to stage application");
      }

      const resJson = await res.json().catch(() => null);
      const createdAppId = resJson?.data?.applicationId || resJson?.applicationId;
      if (createdAppId) {
        setStagedAppMap((prev) => ({
          ...prev,
          [job.id]: createdAppId,
          ...(job.jobId ? { [job.jobId]: createdAppId } : {}),
        }));
      }

      setStagedIds((prev) => {
        const next = new Set(prev).add(job.id);
        if (job.jobId) next.add(job.jobId);
        return next;
      });
      setSavedIds((prev) => new Set(prev).add(job.id));
      setUnsavedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      queryClient?.invalidateQueries({ queryKey: ["stats"] });
      queryClient?.invalidateQueries({ queryKey: ["discovery"] });
      queryClient?.invalidateQueries({ queryKey: ["applications"] });
      toast.success(`Packaged & Staged ${job.title} at ${job.company}!`, {
        description: "Application materials generated & staged for final review.",
      });
    } catch (err) {
      console.error("[Stage] Failed to package & stage:", err);
      toast.error(`Failed to stage ${job.title} at ${job.company}`, {
        description: "Please try again.",
      });
    } finally {
      setPackagingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">
            Recommended Opportunities
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Based on your profile, preferences, and recent activity
          </p>
        </div>
        <Link
          href="/discovery"
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 group"
        >
          <span>View all</span>
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            No opportunities yet
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Discover roles matched to your profile to get recommendations here.
          </p>
          <Link
            href="/discovery"
            className="mt-3 inline-flex text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Explore Discovery
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {list.map((job) => {
          const isBookmarked = isJobBookmarked(job);
          const isStaged =
            stagedIds.has(job.id) ||
            (job.jobId ? stagedIds.has(job.jobId) : false) ||
            job.status === "Staged" ||
            job.status === "STAGED";
          const isPackaging = packagingId === job.id;
          const targetAppId =
            stagedAppMap[job.id] ||
            (job.jobId ? stagedAppMap[job.jobId] : undefined) ||
            job.applicationId;
          const stagedHref = targetAppId ? `/applications/${targetAppId}` : `/applications?status=Staged`;

          return (
            <div
              key={job.id}
              className="relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-4.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Header: Logo + Match Score Badge + Bookmark */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <CompanyBrandLogo company={job.company} size={32} />
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {job.fitScore}% match
                    </span>
                  </div>

                  <button
                    onClick={() => toggleBookmark(job)}
                    className="size-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label={isBookmarked ? "Remove from saved opportunities" : "Bookmark job"}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="size-4 text-blue-600 fill-blue-600" />
                    ) : (
                      <Bookmark className="size-4 stroke-[1.75]" />
                    )}
                  </button>
                </div>

                {/* Job Title & Company */}
                <div className="mt-3.5">
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {job.title}
                  </h3>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    {job.company}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{job.location}</span>
                  </p>
                </div>

                {/* Tags */}
                {job.tags && job.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer: Posted time & Dual Action Buttons (No divider line matching screenshot) */}
              <div className="mt-4 pt-1">
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-2.5 font-normal">
                  {timeAgo(job.postedAt)}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
                  >
                    <Link href={job.url || `/discovery?q=${encodeURIComponent(job.company)}`}>
                      View Details
                    </Link>
                  </Button>

                  {isStaged ? (
                    <Button
                      asChild
                      size="sm"
                      className="h-9 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <Link
                        href={stagedHref}
                        title="Open staged application in Workbench"
                        className="inline-flex items-center justify-center gap-1 w-full h-full"
                      >
                        <Check className="size-3.5" />
                        <span>Staged</span>
                        <ArrowUpRight className="size-3 text-white/80" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handlePackageAndStage(job)}
                      disabled={isPackaging}
                      className="h-9 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      {isPackaging ? (
                        "Packaging..."
                      ) : (
                        "Package & Stage"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
