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
import { searchUserMemories } from "./memory-search"
import { getMacroLearningContext } from "./learning-engine"

export {
  saveKnowledgeGraph,
  buildCareerGraphFromText,
  touchMemory,
}

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

export interface CachedResume {
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
 * Loads user profile with Redis caching
 */
export async function getCachedProfile(userId: string): Promise<UserProfile | null> {
  const cachedProfile = await getCachedJson<UserProfile>(`user:profile:${userId}`)
  if (cachedProfile) return cachedProfile

  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  if (profile) {
    void setCachedJson(`user:profile:${userId}`, profile, 3600)
  }
  return profile
}

/**
 * LLM-FIRST CONTEXT BUILDER WITH PGVECTOR SEMANTIC MEMORY
 * 
 * 1. Profile & Knowledge Graph Context (in parallel)
 * 2. Semantic Memory Search via pgvector (when currentMessage is provided)
 * 3. Sanitized Context Assembly with PII scrubbing
 */
export async function buildFullContext(
  userId: string,
  modeOrMessage?: AIMode | string,
  messageParam?: string
): Promise<string> {
  const knownModes = new Set<string>([
    "profile",
    "jd-scan",
    "application",
    "tracker",
    "response",
    "interview",
    "weekly",
    "recovery",
    "general",
  ])

  let currentMessage: string | undefined
  if (typeof modeOrMessage === "string") {
    if (knownModes.has(modeOrMessage)) {
      currentMessage = messageParam
    } else {
      currentMessage = modeOrMessage
    }
  }

  // 1. Profile, Identity, Knowledge Graph & Macro Outcomes (parallelized)
  const [user, profile, graph, macroContext] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    getCachedProfile(userId),
    getCachedKnowledgeGraph(userId),
    getMacroLearningContext(userId).catch(() => ""),
  ])

  const displayName = user?.name || user?.email || "there"

  // 2. Semantic Memory Search via pgvector
  let relevantMemories: string[] = []
  if (currentMessage && currentMessage.trim().length > 0) {
    try {
      const semanticResults = await searchUserMemories(userId, currentMessage, 3, 0.65)
      relevantMemories = semanticResults.map((m) => `[${m.category}] ${m.content}`)
    } catch (err) {
      console.warn("[Semantic Memory Search Warning]:", err)
    }
  }

  // Fallback to recent memories if no semantic results found or no currentMessage
  if (relevantMemories.length === 0) {
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
      relevantMemories = userMemories.slice(0, 5).map((m) => `[${m.category}] ${m.content}`)
    }
  }

  // 3. Sanitized Context Assembly
  const profileParts: string[] = []
  if (profile) {
    if (profile.location) profileParts.push(profile.location)
    if (profile.targetRoles?.length) profileParts.push(profile.targetRoles.join(", "))
    if (profile.experienceLevel) profileParts.push(profile.experienceLevel)
    if (profile.strengths) profileParts.push(profile.strengths.split(",").slice(0, 5).join(","))
  }

  let formattedGraph = ""
  if (graph && graph.nodes && graph.nodes.length > 0) {
    formattedGraph = formatGraphForContext(graph)
  }

  const contextSections = [
    displayName,
    profileParts.length > 0 ? `Profile: ${profileParts.join(" | ")}` : "",
    profile?.targetRoles?.length ? `User Target: ${profile.targetRoles.join(", ")}` : "",
    macroContext ? `Outcome Learning:\n${macroContext}` : "",
    relevantMemories.length > 0 ? `Relevant Facts:\n${relevantMemories.join("\n")}` : "",
    formattedGraph ? formattedGraph : "",
  ].filter(Boolean)

  return sanitizePII(contextSections.join("\n\n"))
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
      return apps.map((a) => `${a.companyName} | ${a.jobTitle} | ${a.status}`).join("\n")
    }
    case "stats": {
      const stats = await prisma.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      })
      const map: Record<string, number> = {}
      stats.forEach((s) => {
        map[s.status] = s._count
      })
      return `Saved:${map.Saved || 0} Applied:${map.Applied || 0} Interview:${map.Interview || 0} Rejected:${map.Rejected || 0} Offer:${map.Offer || 0}`
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
      return notes.map((n) => `[${n.category}] ${n.title}`).join("\n")
    }
    default:
      return ""
  }
}
