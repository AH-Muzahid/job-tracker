"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Bookmark, BookmarkCheck, Check, MapPin,
  RefreshCw, Wifi, Building2, Briefcase, Calendar, Banknote,
  ArrowRight, CheckCircle2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getEmploymentType,
  formatSalaryClean,
  parseMatchRationale,
} from "./types"
import type { ExternalJobOpportunity } from "@/lib/ai/graph/tools/discovery-tools"

const KNOWN_SKILL_MAP: Record<string, string> = {
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "react": "React",
  "react.js": "React",
  "reactjs": "React",
  "typescript": "TypeScript",
  "ts": "TypeScript",
  "javascript": "JavaScript",
  "js": "JavaScript",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "node": "Node.js",
  "fullstack": "Full Stack",
  "full stack": "Full Stack",
  "frontend": "Frontend",
  "backend": "Backend",
  "python": "Python",
  "golang": "Go",
  "go": "Go",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "graphql": "GraphQL",
  "api": "REST APIs",
  "apis": "REST APIs",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "mongodb": "MongoDB",
  "aws": "AWS",
  "gcp": "Cloud",
  "cloud": "Cloud",
  "docker": "Docker",
  "ai": "AI",
  "llm": "LLMs",
  "product": "Product",
  "strategy": "Strategy",
  "growth": "Growth",
  "analytics": "Analytics",
  "design": "Design",
  "figma": "Figma",
  "distributed systems": "Distributed Systems",
  "user testing": "User Testing",
  "ux research": "UX Research",
  "machine learning": "Machine Learning",
}

function cleanTag(tag: string): string | null {
  const trimmed = tag.trim().toLowerCase()
  if (!trimmed) return null
  if (["linkedin", "indeed", "remoteok", "adzuna", "arbeitnow", "remote", "hybrid", "onsite", "job", "jobs", "hiring", "developer", "engineer"].includes(trimmed)) {
    return null
  }
  if (KNOWN_SKILL_MAP[trimmed]) {
    return KNOWN_SKILL_MAP[trimmed]
  }
  if (trimmed.length > 22 || trimmed.includes(" - ")) {
    return null
  }
  return trimmed.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

function getCompanyLogo(company: string) {
  const lower = company.toLowerCase()
  if (lower.includes("google")) {
    return {
      bg: "bg-white border-slate-200 shadow-xs",
      content: (
        <svg viewBox="0 0 24 24" className="size-5 sm:size-5.5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      ),
    }
  }
  if (lower.includes("stripe")) {
    return {
      bg: "bg-[#635BFF] text-white border-transparent shadow-xs",
      content: <span className="text-xl font-bold tracking-tighter">S</span>,
    }
  }
  if (lower.includes("notion")) {
    return {
      bg: "bg-white text-black border-slate-900 shadow-xs",
      content: <span className="text-base font-black font-serif">N</span>,
    }
  }
  if (lower.includes("anthropic")) {
    return {
      bg: "bg-[#F3EBE1] text-[#1E1E1E] border-transparent shadow-xs",
      content: <span className="text-sm font-black tracking-tight font-mono">AI</span>,
    }
  }
  if (lower.includes("figma")) {
    return {
      bg: "bg-black text-white border-transparent shadow-xs",
      content: (
        <span className="text-xs font-black flex items-center gap-0.5">
          <span className="text-[#F24E1E]">●</span><span className="text-[#A259FF]">●</span>
        </span>
      ),
    }
  }

  // Consistent pleasant brand aesthetic
  const palettes = [
    "bg-indigo-50 text-indigo-700 border-indigo-200/70",
    "bg-sky-50 text-sky-700 border-sky-200/70",
    "bg-violet-50 text-violet-700 border-violet-200/70",
    "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    "bg-amber-50 text-amber-700 border-amber-200/70",
    "bg-rose-50 text-rose-700 border-rose-200/70",
  ]
  let hash = 0
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash)
  const colorClass = palettes[Math.abs(hash) % palettes.length]
  return {
    bg: colorClass,
    content: <span className="text-base font-bold">{company.slice(0, 1).toUpperCase()}</span>,
  }
}

interface DiscoveryJobCardProps {
  job: ExternalJobOpportunity
  isSaved: boolean
  isSaving: boolean
  isPackaging?: boolean
  isStaged?: boolean
  stagedApplicationId?: string | null
  onSave: () => void
  onPackage?: () => void
  onApplyClick?: () => void
}

export function DiscoveryJobCard({
  job,
  isSaved,
  isSaving,
  isPackaging = false,
  isStaged = false,
  stagedApplicationId,
  onSave,
  onPackage,
  onApplyClick,
}: DiscoveryJobCardProps) {
  const employmentType = getEmploymentType(job)
  const parsed = useMemo(() => parseMatchRationale(job.matchRationale), [job.matchRationale])
  
  // Clean, high-signal tags
  const displayTags = useMemo(() => {
    const candidateList: string[] = []
    
    if (parsed.techStack) {
      for (const t of parsed.techStack.split(",")) {
        const cleaned = cleanTag(t)
        if (cleaned) candidateList.push(cleaned)
      }
    }
    if (Array.isArray(job.tags)) {
      for (const t of job.tags) {
        const cleaned = cleanTag(t)
        if (cleaned) candidateList.push(cleaned)
      }
    }

    // Deduplicate
    const seen = new Set<string>()
    const unique: string[] = []
    for (const t of candidateList) {
      const lower = t.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        unique.push(t)
      }
    }

    // Fallback: extract prominent skills/keywords if empty
    if (unique.length < 3) {
      const text = `${job.title} ${job.descriptionSnippet || ""}`
      const popular = [
        "Next.js", "React", "TypeScript", "JavaScript", "Node.js", 
        "Python", "Go", "Tailwind CSS", "Full Stack", "Frontend", "Backend",
        "Cloud", "PostgreSQL", "Product", "Strategy", "Growth", "Analytics", "AI"
      ]
      for (const kw of popular) {
        if (!seen.has(kw.toLowerCase()) && new RegExp(`\\b${kw.replace(".", "\\.")}\\b`, "i").test(text)) {
          seen.add(kw.toLowerCase())
          unique.push(kw)
        }
      }
    }
    return unique.slice(0, 5)
  }, [parsed.techStack, job.tags, job.title, job.descriptionSnippet])

  const workMode = useMemo(() => {
    const loc = (job.location || "").toLowerCase()
    const title = (job.title || "").toLowerCase()
    const desc = (job.descriptionSnippet || "").toLowerCase()
    const combined = `${loc} ${title} ${desc}`

    if (combined.includes("remote") || employmentType.label === "Remote") {
      return { label: "Remote", icon: <Wifi className="size-3.5 text-muted-foreground" /> }
    }
    if (combined.includes("hybrid")) {
      return { label: "Hybrid", icon: <Building2 className="size-3.5 text-muted-foreground" /> }
    }
    if (combined.includes("onsite") || combined.includes("on-site")) {
      return { label: "On-site", icon: <Building2 className="size-3.5 text-muted-foreground" /> }
    }
    return { label: "Hybrid", icon: <Building2 className="size-3.5 text-muted-foreground" /> }
  }, [job.location, job.title, job.descriptionSnippet, employmentType.label])

  const logoStyle = useMemo(() => getCompanyLogo(job.company), [job.company])

  return (
    <Card className="rounded-xl border border-slate-200/80 dark:border-border/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden mb-3 group relative bg-card">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-start p-4 sm:p-5 gap-4">
          {/* Left: Company Logo */}
          <div className={cn(
            "hidden md:flex shrink-0 w-11 h-11 border rounded-xl items-center justify-center font-bold",
            logoStyle.bg
          )}>
            {logoStyle.content}
          </div>
          
          {/* Middle: Content */}
          <div className="flex-1 min-w-0 pr-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onApplyClick?.()}
                className="text-[15.5px] sm:text-[16.5px] font-bold text-foreground hover:text-primary transition-colors truncate tracking-tight"
              >
                {job.title}
              </a>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 leading-none shrink-0"
              >
                {job.fitScore}% match
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground font-medium mb-1.5">
              <span className="truncate text-foreground/90 font-medium">{job.company}</span>
              <CheckCircle2 className="size-3.5 fill-blue-500 text-white shrink-0" />
            </div>
            
            <div className="flex flex-wrap items-center gap-3.5 text-[12px] text-muted-foreground/85 mb-2 font-normal">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{job.location}</span>
              </span>
              
              <span className="flex items-center gap-1.5">
                {workMode.icon}
                {workMode.label}
              </span>
              
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-muted-foreground" />
                {employmentType.label}
              </span>
              
              {job.salary && (
                <span className="flex items-center gap-1.5">
                  <Banknote className="size-3.5 text-muted-foreground" />
                  {formatSalaryClean(job.salary)}
                </span>
              )}
              
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                {job.postedAt ? `Posted ${(() => {
                  try {
                    const d = new Date(job.postedAt);
                    if (isNaN(d.getTime())) return job.postedAt;
                    const now = new Date();
                    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays === 0) return 'Today';
                    if (diffDays === 1) return '1 day ago';
                    if (diffDays < 30) return `${diffDays} days ago`;
                    return d.toLocaleDateString();
                  } catch {
                    return job.postedAt;
                  }
                })()}` : 'Recently'}
              </span>
            </div>
            
            <p className="text-[12.5px] text-muted-foreground leading-snug line-clamp-1 mb-2.5">
              {job.descriptionSnippet || "Exciting opportunity to join a fast-growing team and build innovative solutions."}
            </p>
            
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {displayTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-normal bg-slate-100 dark:bg-muted/60 text-slate-600 dark:text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-start justify-end gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/50">
            
            {/* Bookmark button */}
            <div className="flex items-center h-[32px]">
              <button
                disabled={isSaved || isSaving || isPackaging}
                onClick={(e) => {
                  e.preventDefault();
                  onSave();
                }}
                className={cn(
                  "p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground",
                  isSaved && "text-primary"
                )}
                title={isSaved ? "Saved to your Tracker" : "Bookmark this opportunity"}
              >
                {isSaved ? (
                  <BookmarkCheck className="size-4.5 text-primary" />
                ) : isSaving ? (
                  <RefreshCw className="size-4.5 animate-spin" />
                ) : (
                  <Bookmark className="size-4.5 text-slate-400 hover:text-slate-600 stroke-[1.75]" />
                )}
              </button>
            </div>

            <div className="flex flex-col w-[136px] gap-1.5">
              {/* Package & Stage Primary CTA */}
              {isStaged || job.appliedStatus === "STAGED" || job.appliedStatus === "Staged" ? (
                <Link
                  href={stagedApplicationId || job.applicationId ? `/applications/${stagedApplicationId || job.applicationId}` : "/applications"}
                  className="inline-flex items-center justify-center gap-1.5 h-[32px] px-3 rounded-[6px] text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors w-full"
                >
                  <Check className="size-3.5 text-emerald-500 stroke-[2.5]" />
                  <span>Staged</span>
                </Link>
              ) : job.appliedStatus ? (
                <span className="inline-flex items-center justify-center gap-1 h-[32px] px-3 rounded-[6px] text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20 w-full">
                  <Check className="size-3.5" />
                  <span>Applied</span>
                </span>
              ) : (
                onPackage && (
                  <button
                    disabled={isPackaging || isSaving}
                    onClick={onPackage}
                    style={{ color: "#ffffff", backgroundColor: "#0B0F17" }}
                    className="flex items-center justify-center h-[32px] text-xs px-3 gap-1.5 cursor-pointer font-medium rounded-[6px] w-full !text-white hover:bg-slate-800 shadow-xs disabled:opacity-50 transition-colors"
                  >
                    {isPackaging ? (
                      <>
                        <RefreshCw className="size-3 animate-spin !text-white" style={{ color: "#ffffff" }} />
                        <span className="!text-white font-medium" style={{ color: "#ffffff" }}>Packaging...</span>
                      </>
                    ) : (
                      <>
                        <span className="!text-white font-medium" style={{ color: "#ffffff" }}>Package & Stage</span>
                        <ArrowRight className="size-3 shrink-0 !text-white" style={{ color: "#ffffff" }} />
                      </>
                    )}
                  </button>
                )
              )}
              
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onApplyClick?.()}
                style={{ color: "#1e293b", borderColor: "#e2e8f0", backgroundColor: "#ffffff" }}
                className="inline-flex items-center justify-center gap-1 h-[32px] px-3 rounded-[6px] border text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer w-full shadow-xs shrink-0"
              >
                View Details
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
