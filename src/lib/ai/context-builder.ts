import { prisma } from "@/lib/prisma"
import { getCachedJson, setCachedJson } from "@/lib/redis"
import type { UserProfile } from "@prisma/client"
import {
  getCachedKnowledgeGraph,
  saveKnowledgeGraph,
  buildCareerGraphFromText,
  formatGraphForContext,
} from "@/lib/ai/knowledge-graph"
import { sanitizePII } from "./pii-sanitizer"
import { touchMemory } from "./memory-consolidator"
import { countTokens, trimToTokenBudget } from "./token-counter"

export type AIMode =
  | "profile"
  | "jd-scan"
  | "application"
  | "tracker"
  | "response"
  | "interview"
  | "weekly"
  | "recovery"
  | "general"

interface CachedResume {
  title: string
  fileName: string
  fileUrl: string
  textContent: string | null
}

/**
 * Sanitize external text to prevent tag injection and delimiter breakouts.
 */
export function sanitizeUntrustedContext(input: string): string {
  if (!input) return ""
  let sanitized = input.replace(/\u0000/g, "")
  const tagRegex = /<\/?(?:system|instruction|admin|override|user_runtime_context|untrusted_content)[^>]*>/gi

  let previous = ""
  while (previous !== sanitized) {
    previous = sanitized
    sanitized = sanitized.replace(tagRegex, "")
  }

  return sanitized
}

/**
 * Enforce strict token budgeting on conversation history.
 * Always keeps first user message and ensures history starts with user role.
 */
export function budgetConversationHistory(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number = 12_000
): Array<{ role: "user" | "assistant"; content: string }> {
  return trimToTokenBudget(messages, maxTokens) as Array<{ role: "user" | "assistant"; content: string }>
}

/**
 * Get token count for a message array (for logging/debugging).
 */
export function getMessageTokenCount(
  messages: Array<{ role: string; content: string }>
): number {
  return countTokens(messages.map((m) => m.content).join("\n"))
}

/**
 * LLM-FIRST CONTEXT BUILDER
 * 
 * Like ChatGPT/Claude/Gemini:
 * - Send MINIMAL context (identity + core profile)
 * - LLM calls tools to fetch data when needed
 * - No pre-loading of apps, stats, resume etc.
 * - Saves ~60% tokens per request
 */
export async function buildFullContext(userId: string, _mode: AIMode): Promise<string> {
  const parts: string[] = []

  // ALWAYS load: User identity (minimal)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  const displayName = user?.name || user?.email || "there"
  parts.push(`${displayName}`)

  // Load profile (cached) — compact format
  const cachedProfile = await getCachedJson<UserProfile>(`user:profile:${userId}`)
  let profile = cachedProfile

  if (!cachedProfile) {
    profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (profile) {
      void setCachedJson(`user:profile:${userId}`, profile, 3600)
    }
  }

  if (profile) {
    const profileParts: string[] = []
    if (profile.location) profileParts.push(profile.location)
    if (profile.targetRoles?.length) profileParts.push(profile.targetRoles.join(", "))
    if (profile.experienceLevel) profileParts.push(profile.experienceLevel)
    if (profile.strengths) profileParts.push(profile.strengths.split(",").slice(0, 5).join(","))
    if (profileParts.length > 0) {
      parts.push(`Profile: ${profileParts.join(" | ")}`)
    }
  }

  // Load memories (cached) — compact format
  const cachedMemories = await getCachedJson<Array<{ category: string; content: string }>>(`user:memories:${userId}`)
  let userMemories = cachedMemories

  if (!cachedMemories) {
    userMemories = await prisma.userMemory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { category: true, content: true },
    })
    if (userMemories && userMemories.length > 0) {
      void setCachedJson(`user:memories:${userId}`, userMemories, 3600)
    }
  }

  if (userMemories && userMemories.length > 0) {
    const compactMemories = userMemories.slice(0, 5).map(m => `${m.category}: ${m.content}`).join("; ")
    parts.push(`Preferences: ${compactMemories}`)
  }

  // Resume — only load if has knowledge graph (cached)
  const cachedGraph = await getCachedKnowledgeGraph(userId)
  if (cachedGraph && cachedGraph.nodes && cachedGraph.nodes.length > 0) {
    const formattedGraph = formatGraphForContext(cachedGraph)
    if (formattedGraph) {
      parts.push(formattedGraph)
    }
  }

  return parts.join("\n")
}

/**
 * LAZY CONTEXT LOADER — called by tools when they need more data
 * This is the ChatGPT/Claude pattern: tools fetch their own context
 */
export async function loadLazyContext(userId: string, type: string): Promise<string> {
  switch (type) {
    case "applications": {
      const apps = await prisma.application.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { companyName: true, jobTitle: true, status: true },
      })
      if (apps.length === 0) return "No applications tracked yet."
      return apps.map(a => `${a.companyName} | ${a.jobTitle} | ${a.status}`).join("\n")
    }
    case "stats": {
      const stats = await prisma.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      })
      const map: Record<string, number> = {}
      stats.forEach(s => { map[s.status] = s._count })
      return `Saved:${map.Saved||0} Applied:${map.Applied||0} Interview:${map.Interview||0} Rejected:${map.Rejected||0} Offer:${map.Offer||0}`
    }
    case "resume": {
      const resume = await prisma.resume.findFirst({
        where: { userId, isDefault: true },
        select: { title: true, textContent: true },
      })
      if (!resume) return "No resume uploaded."
      const excerpt = resume.textContent?.slice(0, 1500) || ""
      return `Resume: ${resume.title}\n${excerpt}`
    }
    case "prep-notes": {
      const notes = await prisma.prepNote.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { title: true, category: true },
      })
      if (notes.length === 0) return "No prep notes."
      return notes.map(n => `[${n.category}] ${n.title}`).join("\n")
    }
    default:
      return ""
  }
}
