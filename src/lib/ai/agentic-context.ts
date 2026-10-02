/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import {
  getCachedKnowledgeGraph,
  buildCareerGraphFromText,
  traverseGraphForJD,
  CareerGraphData,
  GraphMatchResult,
} from "./knowledge-graph"
import { getUserWeaknesses } from "./memory"
import { getUserMacroOutcomes } from "./learning-engine"

export interface GroundedCandidateDossier {
  candidateName: string
  candidateEmail?: string
  targetRoles: string[]
  experienceLevel?: string
  links: {
    github?: string
    linkedin?: string
    portfolio?: string
  }
  matchedSkills: GraphMatchResult["matchedSkills"]
  missingSkills: string[]
  evidencePaths: string[]
  matchScore: number
  bestProjects: any[]
  weaknessesToCounteract: string[]
  adaptiveBoosts: string[]
  penalizedSkills: string[]
  summaryContextText: string
  knowledgeGraph?: CareerGraphData
}

export interface AssembleContextOptions {
  jobTitle: string
  companyName: string
  location?: string
  jdText?: string
  requiredSkills?: string[]
}

/**
 * Autonomously assembles a complete, grounded candidate context dossier by traversing
 * the user's Career Knowledge Graph, memory weaknesses, profile data, and historical learning signals.
 */
export async function assembleAgenticCandidateContext(
  userId: string,
  jobContext: AssembleContextOptions
): Promise<GroundedCandidateDossier> {
  const [profile, user, cachedGraph, weaknesses, macroOutcomes] = await Promise.all([
    withDbRetry<any>(() => prisma.userProfile.findUnique({ where: { userId } })).catch(() => null),
    withDbRetry<any>(() =>
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
    ).catch(() => null),
    getCachedKnowledgeGraph(userId).catch(() => null),
    getUserWeaknesses(userId, 5).catch(() => []),
    getUserMacroOutcomes(userId).catch(() => null),
  ])

  const candidateName = user?.name || profile?.fullName || "Candidate"
  const candidateEmail = user?.email || undefined
  const targetRoles = profile?.targetRoles || []
  const experienceLevel = profile?.experienceLevel || "Mid-Level"
  const bestProjects = Array.isArray(profile?.bestProjects) ? profile.bestProjects : []

  const links = {
    github: profile?.githubUrl || undefined,
    linkedin: profile?.linkedinUrl || undefined,
    portfolio: profile?.portfolioUrl || undefined,
  }

  // 1. Resolve or Build Career Knowledge Graph
  let graph: CareerGraphData = cachedGraph || { nodes: [], edges: [] }
  if (!graph.nodes || graph.nodes.length === 0) {
    const rawResumeText = `${profile?.headline || ""} ${profile?.strengths || ""} ${bestProjects.map((p: any) => `${p.name} ${p.stack} ${p.description}`).join(" ")}`
    graph = buildCareerGraphFromText(rawResumeText, profile)
  }

  // 2. Traverse Graph against Job Description & Required Skills
  const fullJdText = `${jobContext.jobTitle} at ${jobContext.companyName}. ${jobContext.jdText || ""}`
  const matchResult: GraphMatchResult = traverseGraphForJD(graph, fullJdText, jobContext.requiredSkills)

  // 3. Extract Past Weaknesses & Adaptive Learning Engine Signals
  const weaknessesToCounteract = Array.isArray(weaknesses) ? weaknesses.map((w: any) => w.content) : []
  const adaptiveBoosts = macroOutcomes?.winningSkills || []
  const penalizedSkills = macroOutcomes?.penalizedSkills || []

  const dossier: GroundedCandidateDossier = {
    candidateName,
    candidateEmail,
    targetRoles,
    experienceLevel,
    links,
    matchedSkills: matchResult.matchedSkills,
    missingSkills: matchResult.missingSkills,
    evidencePaths: matchResult.evidencePaths,
    matchScore: matchResult.matchScore,
    bestProjects,
    weaknessesToCounteract,
    adaptiveBoosts,
    penalizedSkills,
    knowledgeGraph: graph,
    summaryContextText: "",
  }

  dossier.summaryContextText = formatDossierAsPromptContext(dossier)
  return dossier
}

/**
 * Formats a GroundedCandidateDossier into a crisp, high-density prompt context
 * with strict anti-hallucination and evidence requirements.
 */
export function formatDossierAsPromptContext(dossier: GroundedCandidateDossier): string {
  const parts: string[] = []

  parts.push(`=== VERIFIED CANDIDATE DOSSIER ===`)
  parts.push(`- Candidate Name: ${dossier.candidateName}`)
  if (dossier.candidateEmail) parts.push(`- Email: ${dossier.candidateEmail}`)
  if (dossier.experienceLevel) parts.push(`- Experience Level: ${dossier.experienceLevel}`)
  if (dossier.links.github) parts.push(`- GitHub: ${dossier.links.github}`)
  if (dossier.links.linkedin) parts.push(`- LinkedIn: ${dossier.links.linkedin}`)
  if (dossier.links.portfolio) parts.push(`- Portfolio: ${dossier.links.portfolio}`)

  // Matched Skills & Proof Projects
  if (dossier.matchedSkills && dossier.matchedSkills.length > 0) {
    parts.push(`\nVERIFIED SKILL EVIDENCE & PROOF-POINTS:`)
    dossier.matchedSkills.forEach((s) => {
      const projectsText = s.proofProjects
        .map((p) => {
          const metricsStr = p.metrics.length > 0 ? ` [Metrics: ${p.metrics.join("; ")}]` : ""
          return `Project: ${p.projectName}${metricsStr}`
        })
        .join(" | ")
      parts.push(`* ${s.skill} (${s.level || "verified"}): ${projectsText || "Demonstrated in candidate profile"}`)
    })
  }

  // Demonstrated Projects
  if (dossier.bestProjects && dossier.bestProjects.length > 0) {
    parts.push(`\nPORTFOLIO PROJECTS:`)
    dossier.bestProjects.slice(0, 3).forEach((p: any) => {
      parts.push(`* ${p.name || "Project"} (Stack: ${p.stack || "N/A"}): ${p.description || ""}`)
    })
  }

  // Prior Weaknesses to Counteract
  if (dossier.weaknessesToCounteract && dossier.weaknessesToCounteract.length > 0) {
    parts.push(`\nAREAS OF PRIOR TECHNICAL FEEDBACK (Address with concrete proof or avoid over-claiming):`)
    dossier.weaknessesToCounteract.forEach((w) => {
      parts.push(`- ${w}`)
    })
  }

  // High-Converting Patterns
  if (dossier.adaptiveBoosts && dossier.adaptiveBoosts.length > 0) {
    parts.push(`\nHISTORICALLY HIGH-CONVERTING SKILLS FOR THIS USER: ${dossier.adaptiveBoosts.join(", ")}`)
  }

  // Anti-Hallucination Guardrails
  parts.push(`\n=== STRICT ANTI-HALLUCINATION RULES ===`)
  parts.push(`1. ONLY cite technologies, projects, and metrics explicitly listed in this dossier.`)
  parts.push(`2. NEVER invent achievements, companies, revenue numbers, or degrees.`)
  if (dossier.missingSkills && dossier.missingSkills.length > 0) {
    parts.push(`3. DO NOT claim mastery in the following missing skills: ${dossier.missingSkills.join(", ")}. Emphasize adjacent proven competencies instead.`)
  }

  return parts.join("\n")
}
