/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  toCanonical,
  CANONICAL_ALIASES,
  type CareerGraphData,
} from "./knowledge-graph"
import type { ApplicationMaterialsDraft } from "./squad/orchestrator"

export interface GroundingIssue {
  claim: string
  type: "skill" | "metric" | "experience" | "company"
  severity: "critical" | "warning"
  originalText: string
  suggestedCorrection?: string
  reason: string
}

export interface GroundingAuditResult {
  isFullyGrounded: boolean
  groundingScore: number // 0-100
  totalClaimsChecked: number
  verifiedClaims: string[]
  unsupportedClaims: GroundingIssue[]
  sanitizedContent: string
  auditReport: string
}

export interface GroundingContext {
  knowledgeGraph?: CareerGraphData | null
  memories?: Array<{ content: string; category?: string }>
  profile?: {
    fullName?: string
    strengths?: string | null
    targetRoles?: string[] | null
    bestProjects?: any
    experienceLevel?: string | null
  } | null
  candidateName?: string
  targetCompany?: string
  targetRole?: string
}

// Known skill adjacency graph for generating authentic learning bridges
const SKILL_ADJACENCY_MAP: Record<string, string[]> = {
  kubernetes: ["docker", "aws", "gcp", "devops", "cloud"],
  rust: ["c++", "go", "systems", "backend", "typescript"],
  kafka: ["rabbitmq", "redis", "event-driven", "backend", "postgresql"],
  graphql: ["rest", "api", "typescript", "backend"],
  solidity: ["typescript", "backend", "cryptography", "web3"],
  pytorch: ["python", "machine-learning", "numpy", "pandas"],
  terraform: ["docker", "aws", "cloud", "devops"],
  microservices: ["backend", "docker", "api", "system-design"],
}

// Tech vocabulary list compiled from canonical aliases & standard engineering tools
const TECH_VOCABULARY = new Set<string>([
  ...Object.keys(CANONICAL_ALIASES),
  ...Object.values(CANONICAL_ALIASES),
  "typescript", "javascript", "react", "nextjs", "nodejs", "python", "golang", "go", "rust",
  "java", "c++", "c#", "ruby", "php", "swift", "kotlin", "scala", "sql", "postgresql", "mysql",
  "mongodb", "redis", "kafka", "rabbitmq", "docker", "kubernetes", "aws", "gcp", "azure",
  "terraform", "graphql", "rest", "grpc", "tailwindcss", "inngest", "prisma", "vitest", "jest",
  "playwright", "cypress", "solidity", "pytorch", "tensorflow", "django", "fastapi", "flask",
  "spring-boot", "microservices", "system-design", "elasticsearch", "cassandra", "dynamodb",
])

/**
 * Extracts technical skill mentions from text.
 */
export function extractTechMentions(text: string): string[] {
  if (!text) return []
  const found = new Set<string>()

  // Word boundary matching for technical keywords
  for (const tech of TECH_VOCABULARY) {
    if (tech.length < 2) continue
    // Handle special symbols like C++, C#, CI/CD
    const escaped = tech.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:$|[^a-zA-Z0-9_])`, "i")
    if (regex.test(text)) {
      found.add(toCanonical(tech))
    }
  }

  return Array.from(found)
}

/**
 * Extracts quantitative metric claims (percentages, user counts, latency numbers, dollar amounts)
 */
export function extractMetricClaims(text: string): string[] {
  if (!text) return []
  const metrics: string[] = []

  // Percentages: 45%, 99.999%
  const pctMatches = text.match(/\b\d+(?:\.\d+)?%/g)
  if (pctMatches) {
    metrics.push(...pctMatches)
  }

  // User / scale counts: 10,000 active users, 5,000,000 users, 100k DAU
  const userMatches = text.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?[kKmMbB]?\+?\s*(?:active\s+)?(?:users?|dau|mau|clients?|customers?|req(?:uests)?\/s|rps|queries)/gi)
  if (userMatches) {
    metrics.push(...userMatches)
  }

  // Financial impact: $25,000, $5M
  const dollarMatches = text.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d+)?[kKmMbB]?/g)
  if (dollarMatches) {
    metrics.push(...dollarMatches)
  }

  // Latency claims: reduced latency by 45%, sub-100ms
  const latencyMatches = text.match(/\b(?:reduced|improved|cut|optimized)\s+[^.\n]*?\d+%/gi)
  if (latencyMatches) {
    metrics.push(...latencyMatches)
  }

  return Array.from(new Set(metrics))
}

/**
 * Builds an authentic, transparent bridge for skills the candidate lacks,
 * anchoring in verified adjacent foundations per Repo A apply.md rules.
 */
export function buildHonestBridge(
  unsupportedSkill: string,
  closestSupportedSkill?: string
): string {
  if (closestSupportedSkill) {
    return `expanding into ${unsupportedSkill} as a natural extension of my ${closestSupportedSkill} foundation`
  }
  return `actively expanding into ${unsupportedSkill} with practical foundation and rapid learning velocity`
}

/**
 * Aggregates all verified facts from candidate profile, knowledge graph, and memory.
 */
function assembleVerifiedFacts(context: GroundingContext): {
  verifiedSkills: Set<string>
  verifiedMetrics: string[]
  verifiedProjects: string[]
  verifiedTextPool: string
} {
  const verifiedSkills = new Set<string>()
  const verifiedMetrics: string[] = []
  const verifiedProjects: string[] = []
  let textPool = ""

  // 1. From Knowledge Graph nodes
  if (context.knowledgeGraph?.nodes) {
    for (const node of context.knowledgeGraph.nodes) {
      if (node.type === "skill") {
        verifiedSkills.add(toCanonical(node.name))
        verifiedSkills.add(node.canonicalName)
      } else if (node.type === "metric") {
        verifiedMetrics.push(node.name.toLowerCase())
      } else if (node.type === "project") {
        verifiedProjects.push(node.name.toLowerCase())
      }
      textPool += ` ${node.name} ${node.description || ""}`
    }
  }

  // 2. From Profile strengths & bestProjects
  if (context.profile?.strengths) {
    const rawStrengths = context.profile.strengths.split(/[,/|\n]+/).map((s) => s.trim())
    for (const s of rawStrengths) {
      verifiedSkills.add(toCanonical(s))
    }
    textPool += ` ${context.profile.strengths}`
  }

  if (Array.isArray(context.profile?.bestProjects)) {
    for (const p of context.profile.bestProjects) {
      if (p.name) verifiedProjects.push(p.name.toLowerCase())
      if (p.stack) {
        const stackItems = p.stack.split(/[,/|\n]+/).map((s: string) => s.trim())
        for (const item of stackItems) {
          verifiedSkills.add(toCanonical(item))
        }
      }
      if (p.description) {
        textPool += ` ${p.description}`
        verifiedMetrics.push(...extractMetricClaims(p.description))
      }
    }
  }

  // 3. From Memories
  if (Array.isArray(context.memories)) {
    for (const m of context.memories) {
      textPool += ` ${m.content}`
      const extracted = extractTechMentions(m.content)
      for (const t of extracted) verifiedSkills.add(t)
      verifiedMetrics.push(...extractMetricClaims(m.content))
    }
  }

  return {
    verifiedSkills,
    verifiedMetrics: verifiedMetrics.map((m) => m.toLowerCase()),
    verifiedProjects,
    verifiedTextPool: textPool.toLowerCase(),
  }
}

/**
 * Finds the closest verified skill to an unsupported skill via the adjacency map.
 */
function findClosestSupportedSkill(unsupported: string, verifiedSkills: Set<string>): string | undefined {
  const canonical = toCanonical(unsupported)
  const adjacents = SKILL_ADJACENCY_MAP[canonical]
  if (adjacents) {
    for (const adj of adjacents) {
      if (verifiedSkills.has(toCanonical(adj))) {
        // Return friendly capitalized name
        return adj.charAt(0).toUpperCase() + adj.slice(1)
      }
    }
  }
  // Fallback to any general verified skill
  for (const s of verifiedSkills) {
    if (["docker", "typescript", "react", "nodejs", "python", "aws", "postgresql"].includes(s)) {
      return s.charAt(0).toUpperCase() + s.slice(1)
    }
  }
  return undefined
}

/**
 * Parses numeric scale numbers (e.g. "10,000", "5M", "5,000,000") into raw integers.
 */
function parseNumericScale(str: string): number | null {
  const match = str.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*([kKmMbB])?/)
  if (!match) return null
  const num = parseFloat(match[1].replace(/,/g, ""))
  const unit = (match[2] || "").toLowerCase()
  if (unit === "k") return num * 1_000
  if (unit === "m") return num * 1_000_000
  if (unit === "b") return num * 1_000_000_000
  return num
}

/**
 * Formats a corrected numeric scale preserving the original metric's unit semantics,
 * so a dollar claim is never rewritten into a user count and vice-versa.
 */
function formatScaleCorrection(metric: string, scale: number): string {
  const formatted = scale.toLocaleString()
  if (/^\$/.test(metric)) return `$${formatted}`
  if (/\b(users?|dau|mau|clients?|customers?)\b/i.test(metric)) return `${formatted} users`
  if (/\b(req(?:uests)?\/s|rps|queries)\b/i.test(metric)) return `${formatted} req/s`
  return formatted
}

/**
 * Audits text against candidate Career Knowledge Graph and memories,
 * detecting ungrounded skills and exaggerated metrics.
 */
export function auditFactualGrounding(
  text: string,
  context: GroundingContext
): GroundingAuditResult {
  if (!text) {
    return {
      isFullyGrounded: true,
      groundingScore: 100,
      totalClaimsChecked: 0,
      verifiedClaims: [],
      unsupportedClaims: [],
      sanitizedContent: text,
      auditReport: "Empty text provided.",
    }
  }

  const { verifiedSkills, verifiedMetrics, verifiedTextPool } = assembleVerifiedFacts(context)
  const targetCompany = (context.targetCompany || "").toLowerCase()
  const targetRole = (context.targetRole || "").toLowerCase()

  const extractedSkills = extractTechMentions(text)
  const extractedMetrics = extractMetricClaims(text)

  const verifiedClaims: string[] = []
  const unsupportedClaims: GroundingIssue[] = []
  let sanitizedContent = text

  // 1. Audit Skills
  for (const skill of extractedSkills) {
    // If the skill is verified in candidate profile/knowledge graph, approve
    if (verifiedSkills.has(skill)) {
      verifiedClaims.push(skill)
      continue
    }

    // Check if the skill mention is just referring to the target job requirements or company context
    // E.g. "for the Senior Rust Engineer role at Stripe" - mentioning the target role is fine,
    // but claiming "I bring deep production expertise in Rust" or "mastery in Kubernetes" is a violation.
    const isTargetContext = targetRole.includes(skill) || targetCompany.includes(skill)
    const claimsExperiencePattern = new RegExp(
      `(?:expertise|experience|mastery|proficien(?:cy|t)|skilled|hands-on|engineered|built|architected|scaled)[^.\n]{0,50}\\b${skill}\\b`,
      "i"
    )
    const isClaimingPersonalExperience = claimsExperiencePattern.test(text)

    if (!isTargetContext || isClaimingPersonalExperience) {
      const closestSkill = findClosestSupportedSkill(skill, verifiedSkills)
      const correction = buildHonestBridge(
        skill.charAt(0).toUpperCase() + skill.slice(1),
        closestSkill
      )

      unsupportedClaims.push({
        claim: skill,
        type: "skill",
        severity: "critical",
        originalText: skill,
        suggestedCorrection: correction,
        reason: `Skill '${skill}' is not verified in candidate Career Knowledge Graph or verified projects.`,
      })

      // Rewrite claim in sanitized text
      // Replace aggressive ungrounded assertions like "production mastery in X" with honest bridge
      const masteryRegex = new RegExp(
        `(?:deep\\s+)?(?:production\\s+)?(?:mastery|expertise)\\s+(?:in|with)\\s+${skill}(?:\\s+cluster\\s+orchestration)?`,
        "gi"
      )
      if (masteryRegex.test(sanitizedContent)) {
        sanitizedContent = sanitizedContent.replace(
          masteryRegex,
          `learning bridge: expanding into ${skill} building upon my ${closestSkill || "software engineering"} foundation`
        )
      } else {
        // Replace ungrounded skill assertions
        const assertRegex = new RegExp(`\\b${skill}\\b`, "gi")
        sanitizedContent = sanitizedContent.replace(
          assertRegex,
          `[expanding into ${skill} via ${closestSkill || "engineering foundation"}]`
        )
      }
    }
  }

  // 2. Audit Metrics & Numerical Scale
  for (const metric of extractedMetrics) {
    const metricLower = metric.toLowerCase()
    const isDirectlyVerified =
      verifiedMetrics.some((vm) => vm.includes(metricLower) || metricLower.includes(vm)) ||
      verifiedTextPool.includes(metricLower)

    if (isDirectlyVerified) {
      verifiedClaims.push(metric)
      continue
    }

    // Check for extreme exaggeration: compare parsed scale against verified maximum scale
    const claimedScale = parseNumericScale(metric)
    if (claimedScale !== null && claimedScale > 50_000) {
      // Find max verified user/scale count
      let maxVerifiedScale = 10_000
      for (const vm of verifiedMetrics) {
        const s = parseNumericScale(vm)
        if (s !== null && s > maxVerifiedScale) maxVerifiedScale = s
      }

      if (claimedScale > maxVerifiedScale * 5) {
        unsupportedClaims.push({
          claim: metric,
          type: "metric",
          severity: "critical",
          originalText: metric,
          suggestedCorrection: formatScaleCorrection(metric, maxVerifiedScale),
          reason: `Metric claim '${metric}' (${claimedScale.toLocaleString()}) drastically exceeds candidate's verified maximum evidence of ${maxVerifiedScale.toLocaleString()}.`,
        })

        // Sanitize metric in text, preserving the original unit (dollar/scale/throughput)
        sanitizedContent = sanitizedContent.replace(
          new RegExp(metric.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"),
          formatScaleCorrection(metric, maxVerifiedScale)
        )
        continue
      }
    }

    // Percentages: if candidate claims > 80% without verification
    const pctMatch = metric.match(/(\d+)%/)
    if (pctMatch) {
      const pct = parseInt(pctMatch[1], 10)
      if (pct >= 80 && !verifiedTextPool.includes(`${pct}%`)) {
        unsupportedClaims.push({
          claim: metric,
          type: "metric",
          severity: "warning",
          originalText: metric,
          reason: `High percentage metric '${metric}' has no grounding evidence in verified projects or memories.`,
        })
      }
    }
  }

  const totalClaims = extractedSkills.length + extractedMetrics.length
  const penalty = unsupportedClaims.reduce((acc, issue) => acc + (issue.severity === "critical" ? 20 : 10), 0)
  const groundingScore = Math.max(0, Math.min(100, 100 - penalty))
  const isFullyGrounded = unsupportedClaims.length === 0

  const auditReport = isFullyGrounded
    ? `✓ 100% Factual Grounding Verified: ${verifiedClaims.length} verified claims substantiated by Career Knowledge Graph.`
    : `⚠ Grounding Violations Detected (${unsupportedClaims.length}):\n${unsupportedClaims.map((u) => `- [${u.type.toUpperCase()}] ${u.reason}`).join("\n")}`

  return {
    isFullyGrounded,
    groundingScore,
    totalClaimsChecked: totalClaims,
    verifiedClaims,
    unsupportedClaims,
    sanitizedContent,
    auditReport,
  }
}

/**
 * Audits a complete ApplicationMaterialsDraft, sanitizing ungrounded hallucinations
 * across cover letter, highlights, and outreach pitch.
 */
export function auditApplicationMaterialsGrounding(
  materials: ApplicationMaterialsDraft,
  context: GroundingContext
): {
  materials: ApplicationMaterialsDraft
  audit: GroundingAuditResult
  hasModifications: boolean
} {
  const clAudit = auditFactualGrounding(materials.coverLetter || "", context)
  const opAudit = auditFactualGrounding(materials.outreachPitch || "", context)

  const sanitizedHighlights: string[] = []
  let highlightsModified = false
  const { verifiedSkills } = assembleVerifiedFacts(context)

  if (Array.isArray(materials.highlights)) {
    for (const bullet of materials.highlights) {
      const bAudit = auditFactualGrounding(bullet, context)
      if (bAudit.isFullyGrounded) {
        sanitizedHighlights.push(bullet)
      } else {
        highlightsModified = true
        // If bullet contains critical ungrounded skills, replace with honest bridge or project
        const unsupportedSkill = bAudit.unsupportedClaims.find((c) => c.type === "skill")
        if (unsupportedSkill) {
          const closest = findClosestSupportedSkill(unsupportedSkill.claim, verifiedSkills)
          const bridgeBullet = `Demonstrated strong ${closest || "software engineering"} foundations with rapid capability to onboard onto ${unsupportedSkill.claim}.`
          sanitizedHighlights.push(bridgeBullet)
        } else {
          sanitizedHighlights.push(bAudit.sanitizedContent)
        }
      }
    }
  }

  const allUnsupported = [...clAudit.unsupportedClaims, ...opAudit.unsupportedClaims]
  const hasModifications =
    clAudit.sanitizedContent !== materials.coverLetter ||
    opAudit.sanitizedContent !== materials.outreachPitch ||
    highlightsModified

  const mergedScore = Math.min(clAudit.groundingScore, opAudit.groundingScore)
  const isFullyGrounded = allUnsupported.length === 0 && !highlightsModified

  const sanitizedMaterials: ApplicationMaterialsDraft = {
    ...materials,
    coverLetter: clAudit.sanitizedContent,
    outreachPitch: opAudit.sanitizedContent,
    highlights: sanitizedHighlights,
  }

  const audit: GroundingAuditResult = {
    isFullyGrounded,
    groundingScore: mergedScore,
    totalClaimsChecked: clAudit.totalClaimsChecked + opAudit.totalClaimsChecked,
    verifiedClaims: Array.from(new Set([...clAudit.verifiedClaims, ...opAudit.verifiedClaims])),
    unsupportedClaims: allUnsupported,
    sanitizedContent: sanitizedMaterials.coverLetter,
    auditReport: `${clAudit.auditReport}\n${opAudit.auditReport}`,
  }

  return {
    materials: sanitizedMaterials,
    audit,
    hasModifications,
  }
}
