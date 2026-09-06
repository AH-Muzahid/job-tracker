export type BatchSlot = "" | "just-in" | "earlier-today" | "yesterday"

export interface DiscoveryFilters {
  source: "" | "remoteok" | "arbeitnow" | "adzuna" | "curated" | "linkedin" | "jobicy" | "linkedin_post" | "company_portal" | "greenhouse" | "lever"
  location: "" | "remote" | "hybrid" | "onsite"
  minScore: "" | "90" | "75" | "50" | "0"
  visaSponsorship?: "" | "available" | "not_available"
  batchSlot?: BatchSlot
  tags: string[]
  hideApplied?: boolean
}

export interface BatchSummary {
  justIn: number
  earlierToday: number
  yesterday: number
  totalActive: number
}

export type SortOption = "score-desc" | "score-asc" | "salary-desc" | "salary-asc" | "newest"

export const DISCOVERY_QUICK_TAGS = [
  "React", "Python", "Go", "TypeScript", "AI", "Next.js", "Node.js", "Remote",
]

export const DISCOVERY_SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "score-desc", label: "Fit Score (highest)" },
  { value: "score-asc", label: "Fit Score (lowest)" },
  { value: "salary-desc", label: "Salary (highest)" },
  { value: "salary-asc", label: "Salary (lowest)" },
  { value: "newest", label: "Newest" },
]

export function getScoreBadgeClass(score: number): string {
  if (score >= 90) return "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950 border-emerald-600 dark:border-emerald-500 font-extrabold shadow-xs"
  if (score >= 75) return "bg-sky-600 text-white dark:bg-sky-500 dark:text-zinc-950 border-sky-600 dark:border-sky-500 font-extrabold shadow-xs"
  if (score >= 50) return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-bold"
  return "bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 border-zinc-500/30 font-bold"
}

export function getSourceBadge(source: string): { label: string; color: string } {
  switch (source) {
    case "remoteok":
      return { label: "RemoteOK", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" }
    case "jobicy":
      return { label: "Jobicy", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" }
    case "arbeitnow":
      return { label: "Arbeitnow", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
    case "adzuna":
      return { label: "Adzuna", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" }
    case "linkedin":
      return { label: "LinkedIn", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
    case "linkedin_post":
      return { label: "LinkedIn Post", color: "bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500/30" }
    case "company_portal":
      return { label: "Company Career Page", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" }
    case "greenhouse":
      return { label: "Greenhouse", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" }
    case "lever":
      return { label: "Lever", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
    default:
      return { label: "Curated", color: "bg-primary/10 text-primary border-primary/20" }
  }
}

export function getBatchSlotBadge(slot?: string): { label: string; color: string } {
  switch (slot) {
    case "just-in":
      return {
        label: "Just In (<6h)",
        color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      }
    case "earlier-today":
      return {
        label: "Earlier (6-12h)",
        color: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
      }
    case "yesterday":
      return {
        label: "Past (12-24h)",
        color: "bg-muted text-muted-foreground border-border",
      }
    default:
      return {
        label: "Active Batch",
        color: "bg-primary/10 text-primary border-primary/20",
      }
  }
}

export function getVisaBadge(status?: string): { label: string; color: string } | null {
  if (status === "available") {
    return {
      label: "Visa Sponsor",
      color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    }
  }
  if (status === "not_available") {
    return {
      label: "No Visa",
      color: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20",
    }
  }
  return null
}

export function getEmploymentType(job: {
  title: string
  tags?: string[]
  descriptionSnippet?: string
  employmentType?: "intern" | "contract" | "part-time" | "full-time"
}): { label: string; color: string } {
  const type = job.employmentType || (
    /\b(intern|internship|trainee|apprentice|co-?op|fellow|fellowship)\b/i.test(`${job.title} ${(job.tags || []).join(" ")} ${job.descriptionSnippet || ""}`)
      ? "intern"
      : /\b(contract|contractor|contractual|freelance|consultant|temporary|temp|interim)\b/i.test(`${job.title} ${(job.tags || []).join(" ")} ${job.descriptionSnippet || ""}`)
      ? "contract"
      : /\b(part[- ]?time|fractional)\b/i.test(`${job.title} ${(job.tags || []).join(" ")} ${job.descriptionSnippet || ""}`)
      ? "part-time"
      : "full-time"
  )

  switch (type) {
    case "intern":
      return {
        label: "Intern",
        color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
      }
    case "contract":
      return {
        label: "Contract",
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      }
    case "part-time":
      return {
        label: "Part-time",
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      }
    case "full-time":
    default:
      return {
        label: "Full-time",
        color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      }
  }
}

export function formatSalaryClean(salary?: string | null): string | null {
  if (!salary) return null
  const trimmed = salary.trim()
  if (!trimmed) return null
  return trimmed.replace(/^\$\s*\$*/, "$")
}

export interface ParsedRationale {
  scoreBreakdown?: string
  skillsScore?: string
  roleScore?: string
  locationScore?: string
  seniorityScore?: string
  roleMatch?: string
  techStack?: string
  experienceFit?: string
  locationFit?: string
  freshness?: string
  atsCompatibility?: string
  strategyTip?: string
  learnedNotes?: string[]
  summary?: string
  allPoints: { title: string; content: string; icon?: string }[]
}

export function parseMatchRationale(rationale?: string | null): ParsedRationale {
  const result: ParsedRationale = {
    allPoints: [],
    learnedNotes: [],
  }
  if (!rationale) return result

  const raw = rationale.trim()

  // 1. Extract Fit Breakdown & sub-scores:
  // Handles both "Fit Breakdown: Skills: 38/40..." and "Fit: 95% (Skills: 38/40 • Role: 24/25 • Loc: 20/20 • Seniority: 13/15)"
  const scoreMatch = raw.match(/(?:📊\s*)?(?:Fit Breakdown:\s*([^\n]+)|Fit:\s*([^\n]+?\([^)]+\)))/i)
  if (scoreMatch) {
    result.scoreBreakdown = (scoreMatch[1] || scoreMatch[2] || "").trim()
    const skillsM = result.scoreBreakdown.match(/Skills:\s*(\d+\/\d+)/i)
    if (skillsM) result.skillsScore = skillsM[1]
    const roleM = result.scoreBreakdown.match(/Role:\s*(\d+\/\d+)/i)
    if (roleM) result.roleScore = roleM[1]
    const locM = result.scoreBreakdown.match(/(?:Location|Loc):\s*(\d+\/\d+)/i)
    if (locM) result.locationScore = locM[1]
    const senM = result.scoreBreakdown.match(/Seniority:\s*(\d+\/\d+)/i)
    if (senM) result.seniorityScore = senM[1]
  } else {
    // Direct sub-score extraction fallback
    const skillsM = raw.match(/Skills:\s*(\d+\/\d+)/i)
    if (skillsM) result.skillsScore = skillsM[1]
    const roleM = raw.match(/Role:\s*(\d+\/\d+)/i)
    if (roleM) result.roleScore = roleM[1]
    const locM = raw.match(/(?:Location|Loc):\s*(\d+\/\d+)/i)
    if (locM) result.locationScore = locM[1]
    const senM = raw.match(/Seniority:\s*(\d+\/\d+)/i)
    if (senM) result.seniorityScore = senM[1]
  }

  // Extract Project Match Proof if present
  const proofMatch = raw.match(/Proof:\s*([^•\n]+)/i)
  if (proofMatch) {
    result.allPoints.push({ title: "Project Match Proof", content: proofMatch[1].trim(), icon: "briefcase" })
  }

  // 2. Role Match
  const roleMatch = raw.match(/(?:🎯\s*)?Role Match:\s*([^•\n]+)/i)
  if (roleMatch) {
    result.roleMatch = roleMatch[1].trim()
    result.allPoints.push({ title: "Role Alignment", content: result.roleMatch, icon: "target" })
  }

  // 3. Tech Stack / Strengths
  const techMatch = raw.match(/(?:⚡\s*)?(?:Tech Stack|Proven Strengths):\s*([^•\n]+)/i)
  if (techMatch) {
    result.techStack = techMatch[1].trim()
    result.allPoints.push({ title: "Tech Stack", content: result.techStack, icon: "zap" })
  }

  // 4. Experience Fit
  const expMatch = raw.match(/(?:🎓\s*)?Experience Fit:\s*([^•\n]+)/i)
  if (expMatch) {
    result.experienceFit = expMatch[1].trim()
    result.allPoints.push({ title: "Experience Level", content: result.experienceFit, icon: "graduation" })
  }

  // 5. Location / Work Mode (avoid picking up "Location: 20/20" inside breakdown)
  const locMatch = raw.match(/(?:🌍\s*)Location:\s*([^•\n]+)/i) || (!scoreMatch ? raw.match(/Location:\s*([^•\n]+)/i) : null)
  if (locMatch && !locMatch[1].includes("/20")) {
    result.locationFit = locMatch[1].trim()
    result.allPoints.push({ title: "Work Mode & Location", content: result.locationFit, icon: "globe" })
  }

  // 6. Freshness
  const freshMatch = raw.match(/(?:🕒\s*)?Freshness:\s*([^•\n]+)/i)
  if (freshMatch) {
    result.freshness = freshMatch[1].trim()
  }

  // 7. ATS Compatibility
  const atsMatch = raw.match(/(?:📋\s*)?ATS Compatibility:\s*([^•\n]+)/i)
  if (atsMatch) {
    result.atsCompatibility = atsMatch[1].trim()
  }

  // 8. Strategy Tip
  const stratMatch = raw.match(/(?:💡\s*)?Strategy Tip:\s*([^•\n]+)/i)
  if (stratMatch) {
    result.strategyTip = stratMatch[1].trim()
  }

  // 9. Learned Notes
  const learnedMatches = raw.matchAll(/(?:🧠\s*)?((?:Learned|Preference|Aversion)[^:•\n]+:\s*[^•\n]+)/gi)
  for (const lm of Array.from(learnedMatches)) {
    result.learnedNotes?.push(lm[1].trim())
  }

  // Fallback summary if structured elements were not found
  if (!result.roleMatch && !result.techStack && !result.experienceFit) {
    result.summary = raw
  }

  return result
}

