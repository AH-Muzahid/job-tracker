"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, MapPin, ArrowRight, ArrowUpRight, Check, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CompanyBrandLogo } from "@/components/CompanyBrandLogo";
import { useQueryClient } from "@tanstack/react-query";
import { BlueprintCard } from "@/components/primitives/BlueprintCard";
import { EmptyState } from "@/components/primitives/EmptyState";

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
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks}w ago`;
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

  const isJobBookmarked = (job: Opportunity) => {
    if (unsavedIds.has(job.id)) return false;
    if (savedIds.has(job.id)) return true;
    return !!job.isSaved;
  };

  const toggleBookmark = async (job: Opportunity) => {
    const current = isJobBookmarked(job);
    const nextSaved = !current;

    if (nextSaved) {
      setSavedIds((prev) => new Set(prev).add(job.id));
      setUnsavedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    } else {
      setUnsavedIds((prev) => new Set(prev).add(job.id));
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }

    try {
      const targetJobId = job.jobId || job.id;
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: nextSaved ? "save" : "unsave",
          jobId: targetJobId,
          companyName: job.company,
          jobTitle: job.title,
          ...(nextSaved
            ? {
                location: job.location,
                status: "Saved",
              }
            : {}),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update bookmark status");
      }

      toast.success(
        nextSaved ? `Saved ${job.title} to Saved Jobs` : `Removed ${job.title} from Saved Jobs`
      );

      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
    } catch (err) {
      console.error("[Bookmark] Failed to toggle bookmark:", err);
      toast.error("Could not update bookmark. Please try again.");

      if (current) {
        setSavedIds((prev) => new Set(prev).add(job.id));
        setUnsavedIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      } else {
        setUnsavedIds((prev) => new Set(prev).add(job.id));
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      }
    }
  };

  const handlePackageAndStage = async (job: Opportunity) => {
    setPackagingId(job.id);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: job.company,
          jobTitle: job.title,
          jobUrl: job.url || "",
          location: job.location,
          salary: job.salary,
          status: "Staged",
          source: "CareerTrack AI Discovery",
          notes: `Staged from Recommended Opportunities with ${job.fitScore}% match.`,
          canonicalJobId: job.id || job.jobId,
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
        <div className="h-6 w-48 bg-muted rounded-sm animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 rounded-[6px] border border-border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-foreground">
            Recommended Opportunities
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ranked by AI match score against your verified career profile
          </p>
        </div>
        <Link
          href="/discovery"
          className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 group"
        >
          <span>View all</span>
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No opportunities yet"
          description="Discover roles matched to your verified profile to see high-conviction recommendations here."
          action={{
            label: "Explore Discovery",
            href: "/discovery",
          }}
          className="py-8"
        />
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
              <BlueprintCard
                key={job.id}
                className="p-4 sm:p-4.5 flex flex-col justify-between group relative"
              >
                <div>
                  {/* Header: Logo + Match Score Badge + Bookmark */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <CompanyBrandLogo company={job.company} size={30} />
                      <span className="inline-flex items-center rounded-xs px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 tabular-nums">
                        {job.fitScore}% match
                      </span>
                    </div>

                    <button
                      onClick={() => toggleBookmark(job)}
                      className="size-7 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      aria-label={isBookmarked ? "Remove from saved opportunities" : "Bookmark job"}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="size-4 text-primary fill-primary" />
                      ) : (
                        <Bookmark className="size-4 stroke-[1.75]" />
                      )}
                    </button>
                  </div>

                  {/* Job Title & Company */}
                  <div className="mt-3">
                    <h3 className="text-sm sm:text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {job.title}
                    </h3>
                    <p className="text-xs font-normal text-muted-foreground mt-0.5">
                      {job.company}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground/60" />
                      <span className="truncate">{job.location}</span>
                    </p>
                  </div>

                  {/* Tags */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {job.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-xs bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-2 border-t border-border/50">
                  <div className="text-[11px] text-muted-foreground mb-2 font-normal tabular-nums">
                    {timeAgo(job.postedAt)}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium rounded-sm border-border bg-background text-foreground hover:bg-muted shadow-none"
                    >
                      <Link href={job.url || `/discovery?q=${encodeURIComponent(job.company)}`}>
                        View Details
                      </Link>
                    </Button>

                    {isStaged ? (
                      <Button
                        asChild
                        size="sm"
                        className="h-8 text-xs font-medium rounded-sm transition-colors shadow-none cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
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
                        className="h-8 text-xs font-medium rounded-sm transition-colors shadow-none cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isPackaging ? "Packaging..." : "Package & Stage"}
                      </Button>
                    )}
                  </div>
                </div>
              </BlueprintCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
