"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  Bookmark, BookmarkCheck, Check, MapPin,
  RefreshCw, Wifi, Building2, Briefcase, Calendar, Banknote,
  ArrowRight, CheckCircle2, MoreHorizontal, ExternalLink, Link2, EyeOff
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
      bg: "bg-white border-border shadow-xs",
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
      bg: "bg-white text-black border-border shadow-xs",
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
    "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/70 dark:border-indigo-800/40",
    "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/70 dark:border-sky-800/40",
    "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200/70 dark:border-violet-800/40",
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/40",
    "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/40",
    "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/70 dark:border-rose-800/40",
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
  onDismiss?: () => void
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
  onDismiss,
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
        "Product", "Strategy", "Growth", "Analytics", "AI", "Design",
        "Backend", "TypeScript", "Node.js", "Distributed Systems", "Cloud",
        "React", "Next.js", "Python", "Full Stack", "Figma", "Go"
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
    return { label: "On-site", icon: <Building2 className="size-3.5 text-muted-foreground" /> }
  }, [job.location, job.title, job.descriptionSnippet, employmentType.label])

  const relativeDate = useMemo(() => {
    if (!job.postedAt) return "Recently"
    try {
      const d = new Date(job.postedAt)
      if (isNaN(d.getTime())) return job.postedAt
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "1 day ago"
      if (diffDays < 30) return `${diffDays} days ago`
      return d.toLocaleDateString()
    } catch {
      return job.postedAt
    }
  }, [job.postedAt])

  const logoStyle = useMemo(() => getCompanyLogo(job.company), [job.company])

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(job.url)
    toast.success("Job link copied to clipboard")
  }

  return (
    <Card className="rounded-[6px] border border-border bg-card shadow-none hover:border-border/80 transition-colors mb-2.5 group relative py-0 gap-0">
      <CardContent className="py-2.5 px-3.5 sm:py-2.5 sm:px-4">
        
        {/* ========================================================================= */}
        {/* MOBILE VIEWPORT LAYOUT (< md) - Matches media_1790327210535.png           */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:hidden gap-2">
          {/* Top row: Company Logo + Match Badge + (Bookmark & 3-Dot Dropdown) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("size-8 border rounded-sm flex items-center justify-center font-bold shrink-0", logoStyle.bg)}>
                {logoStyle.content}
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 leading-none">
                {job.fitScore}% match
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Bookmark button */}
              <button
                disabled={isSaving || isPackaging}
                onClick={(e) => {
                  e.preventDefault()
                  onSave()
                }}
                className={cn(
                  "size-7.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center justify-center border border-border/70",
                  isSaved && "text-primary border-primary/30 bg-primary/5",
                  isSaving && "opacity-75 cursor-wait"
                )}
                title={isSaved ? "Remove from Saved" : "Bookmark opportunity"}
              >
                {isSaved ? (
                  <BookmarkCheck className="size-4 text-primary fill-primary/10" />
                ) : (
                  <Bookmark className="size-4 stroke-[1.75]" />
                )}
              </button>

              {/* Three Dots Overflow Menu (Mobile Viewport) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7.5 rounded-sm hover:bg-muted transition-colors cursor-pointer text-muted-foreground/70 hover:text-foreground flex items-center justify-center border border-border/70 hover:border-border"
                    title="More actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1 z-[200]">
                  <DropdownMenuItem
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 cursor-pointer text-xs"
                  >
                    <Link2 className="size-3.5 text-muted-foreground" />
                    <span>Copy job link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onApplyClick?.()}
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                      <span>Open source board</span>
                    </a>
                  </DropdownMenuItem>
                  {onDismiss && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDismiss()}
                        className="flex items-center gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <EyeOff className="size-3.5 text-destructive" />
                        <span>Dismiss role</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Job Title & Company */}
          <div className="space-y-0.5">
            <div>
              <Link
                href={`/discovery/${job.jobId || job.id}`}
                className="text-base font-bold text-foreground hover:text-primary transition-colors inline-block max-w-full leading-snug"
              >
                {job.title}
              </Link>
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {job.company}
            </div>
          </div>

          {/* Location & Work Mode */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{job.location}</span>
            <span>•</span>
            <span>{workMode.label}</span>
          </div>

          {/* Tags */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {displayTags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-normal bg-muted/60 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: Date & Dual Direct Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <span>{relativeDate}</span>
            <div className="flex items-center gap-1.5">
              {isStaged || job.appliedStatus === "STAGED" || job.appliedStatus === "Staged" ? (
                <Link
                  href={stagedApplicationId || job.applicationId ? `/applications/${stagedApplicationId || job.applicationId}` : "/applications"}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[4px] text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                >
                  <Check className="size-3 text-emerald-500 stroke-[2.5]" />
                  <span>Staged</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    onPackage?.()
                  }}
                  disabled={isPackaging}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[4px] text-[11px] font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
                >
                  {isPackaging ? (
                    <RefreshCw className="size-3 animate-spin" />
                  ) : (
                    <span>Package</span>
                  )}
                </button>
              )}
              <Link
                href={`/discovery/${job.jobId || job.id}`}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[4px] text-[11px] font-medium text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP VIEWPORT LAYOUT (>= md) - Matches media_1790334199421.png          */}
        {/* ========================================================================= */}
        <div className="hidden md:flex md:items-start gap-3.5">
          {/* Left: Company Logo */}
          <div className={cn(
            "shrink-0 size-10 sm:size-10.5 border rounded-[6px] flex items-center justify-center font-bold mt-0.5",
            logoStyle.bg
          )}>
            {logoStyle.content}
          </div>
          
          {/* Middle: Content */}
          <div className="flex-1 min-w-0 pr-0">
            {/* Title & Match Badge */}
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <Link
                href={`/discovery/${job.jobId || job.id}`}
                className="text-[15px] font-bold text-foreground hover:text-primary transition-colors truncate tracking-tight leading-snug"
              >
                {job.title}
              </Link>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 leading-none shrink-0">
                {job.fitScore}% match
              </span>
            </div>
            
            {/* Company & Verified Checkmark */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
              <span className="truncate text-foreground/90 font-medium">{job.company}</span>
              <CheckCircle2 className="size-3.5 fill-blue-500 text-white dark:text-zinc-950 shrink-0" />
            </div>
            
            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-1.5 font-normal">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate max-w-[150px]">{job.location}</span>
              </span>
              
              <span className="flex items-center gap-1.5">
                {workMode.icon}
                <span>{workMode.label}</span>
              </span>
              
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-3.5 text-muted-foreground shrink-0" />
                <span>{employmentType.label}</span>
              </span>
              
              {job.salary && (
                <span className="flex items-center gap-1.5">
                  <Banknote className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{formatSalaryClean(job.salary)}</span>
                </span>
              )}
              
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                <span>Posted {relativeDate}</span>
              </span>
            </div>
            
            {/* Description Snippet */}
            <p className="text-xs text-muted-foreground leading-snug line-clamp-1 mb-2">
              {job.descriptionSnippet || "Exciting opportunity to join a fast-growing team and build high-impact solutions."}
            </p>
            
            {/* Tags */}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {displayTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10.5px] font-normal bg-muted/60 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Right: Actions - Matches media_1790337593228.png */}
          <div className="flex items-start gap-2 shrink-0 pt-0.5">
            {/* Left Column: Bookmark & More Menu */}
            <div className="flex flex-col items-center gap-1.5">
              {/* Bookmark button */}
              <button
                disabled={isSaving || isPackaging}
                onClick={(e) => {
                  e.preventDefault()
                  onSave()
                }}
                className={cn(
                  "size-7.5 rounded-sm hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground flex items-center justify-center border border-border/70 hover:border-border",
                  isSaved && "text-primary border-primary/30 bg-primary/5",
                  isSaving && "opacity-75 cursor-wait"
                )}
                title={isSaved ? "Remove from Saved" : "Bookmark opportunity"}
              >
                {isSaved ? (
                  <BookmarkCheck className="size-4 text-primary fill-primary/10" />
                ) : (
                  <Bookmark className="size-4 stroke-[1.75]" />
                )}
              </button>

              {/* Three Dots Overflow Menu (Portal dropdown, no clipping) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7.5 rounded-sm hover:bg-muted transition-colors cursor-pointer text-muted-foreground/70 hover:text-foreground flex items-center justify-center border border-border/70 hover:border-border"
                    title="More actions"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1 z-[200]">
                  <DropdownMenuItem
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 cursor-pointer text-xs"
                  >
                    <Link2 className="size-3.5 text-muted-foreground" />
                    <span>Copy job link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onApplyClick?.()}
                      className="flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                      <span>Open source board</span>
                    </a>
                  </DropdownMenuItem>
                  {onDismiss && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDismiss()}
                        className="flex items-center gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <EyeOff className="size-3.5 text-destructive" />
                        <span>Dismiss role</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right Column: Stack of Two Action Buttons (Matches media_1790337593228.png) */}
            <div className="flex flex-col gap-1.5 w-32 sm:w-35">
              {/* Button 1 (Top): Package & Stage (Primary CTA) */}
              {isStaged || job.appliedStatus === "STAGED" || job.appliedStatus === "Staged" ? (
                <Link
                  href={stagedApplicationId || job.applicationId ? `/applications/${stagedApplicationId || job.applicationId}` : "/applications"}
                  className="inline-flex items-center justify-center gap-1.5 h-7.5 px-2.5 rounded-[4px] text-[11.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors w-full"
                >
                  <Check className="size-3 text-emerald-500 stroke-[2.5]" />
                  <span>Staged</span>
                  <ArrowRight className="size-2.5 ml-0.5 opacity-70" />
                </Link>
              ) : job.appliedStatus ? (
                <span className="inline-flex items-center justify-center gap-1 h-7.5 px-2.5 rounded-[4px] text-[11.5px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20 w-full">
                  <Check className="size-3" />
                  <span>Applied</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onPackage?.()
                  }}
                  disabled={isPackaging}
                  className="inline-flex items-center justify-center gap-1.5 h-7.5 px-2.5 rounded-[4px] text-[11.5px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer shadow-none w-full disabled:opacity-70"
                >
                  {isPackaging ? (
                    <>
                      <RefreshCw className="size-3 animate-spin" />
                      <span>Packaging...</span>
                    </>
                  ) : (
                    <>
                      <span>Package & Stage</span>
                      <ArrowRight className="size-3 stroke-[2.5]" />
                    </>
                  )}
                </button>
              )}

              {/* Button 2 (Bottom): View Details (Secondary Action) */}
              <Link
                href={`/discovery/${job.jobId || job.id}`}
                className="inline-flex items-center justify-center h-7.5 px-2.5 rounded-[4px] text-[11.5px] font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer w-full text-center"
              >
                <span>View Details</span>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
