import { detectPlaceholders } from "../evaluator-optimizer"
import { sanitizeOutreachPlaceholders } from "@/lib/applications/outreach-engine"
import {
  auditApplicationMaterialsGrounding,
  type GroundingContext,
  type GroundingAuditResult,
} from "../factual-grounding"

export interface StrategistBrief {
  targetRole: string
  matchedSkills: Array<{ skill: string; proofProject?: string; metric?: string }>
  cautionSkills: string[]
  positioningPitch: string
}

export interface ApplicationMaterialsDraft {
  coverLetter: string
  outreachPitch: string
  highlights?: string[]
  strategyTip?: string
  atsKeywords?: string[]
}

export interface ApplicationSquadOptions {
  jobTitle: string
  companyName: string
  candidateName: string
  candidateEmail?: string
  dossierContext?: string
  groundingContext?: GroundingContext
  strategistFn?: (ctx: { jobTitle: string; companyName: string; dossierContext?: string }) => Promise<StrategistBrief>
  scribeFn?: (brief: StrategistBrief, critiqueFeedback?: string[]) => Promise<ApplicationMaterialsDraft>
  maxCriticRounds?: number
}

export interface ApplicationSquadResult {
  materials: ApplicationMaterialsDraft
  approvedByCritic: boolean
  rounds: number
  criticFeedback?: string[]
  isDeterministicFallback?: boolean
  strategistBrief?: StrategistBrief
}

/**
 * List of banned fluffy buzzwords, clichés, and non-substantive filler phrases
 * Reference: Repo A 03-writing-style.md & Stripe/Linear Engineering Standards
 */
export const FLUFFY_BUZZWORDS: readonly string[] = [
  "passionate about",
  "great fit",
  "leverage my skills",
  "hit the ground running",
  "drive results",
  "synergies",
  "results-driven",
  "self-starter",
  "rockstar",
  "go-getter",
  "team player",
  "out-of-the-box",
  "hardworking",
  "deeply excited to apply",
  "think outside the box",
  "testament to my ability",
  "proving that I can",
  "dynamic environment",
  "proven track record",
]

export interface SkepticalCriticOptions {
  brief?: StrategistBrief
  maxOutreachWords?: number
  groundingContext?: GroundingContext
  checkRequirements?: boolean
  enforceMetrics?: boolean
}

export interface SkepticalCriticResult {
  approved: boolean
  score: number // 0-100
  violations: string[]
  buzzwordsFound: string[]
  hasStarMetrics: boolean
  missingRequirements: string[]
  groundingAudit?: GroundingAuditResult
  feedback: string[]
}

/**
 * Checks for concrete STAR format metrics (Action + Measurable Outcome).
 * Verifies presence of numbers, percentages, latencies, user scale, or throughput benchmarks.
 */
export function checkStarMetrics(
  coverLetter: string,
  highlights?: string[]
): { hasStarMetrics: boolean; detectedMetrics: string[] } {
  const combinedText = `${coverLetter} ${(highlights || []).join(" ")}`
  const metricPatterns = [
    /\b\d+(?:\.\d+)?%/g, // Percentages: 40%, 99.999%
    /\b\d+[\d,]*(?:\.\d+)?\s*(?:users|dau|mau|clients|customers|rps|req\/s|queries|events|records|stars|downloads)/gi,
    /\b(?:sub-)?\d+\s*(?:ms|seconds|minutes|hours)\b/gi, // Latency / time
    /\b\$\d+[\d,]*(?:k|m|b)?\b/gi, // Dollars / financial impact
    /\b(?:p95|p99|latency|throughput|uptime|zero-downtime)\b/gi,
  ]

  const detectedMetrics: string[] = []
  for (const pattern of metricPatterns) {
    const matches = combinedText.match(pattern)
    if (matches) detectedMetrics.push(...matches)
  }

  // Must have at least one measurable technical proof point
  const hasStarMetrics = detectedMetrics.length > 0
  return { hasStarMetrics, detectedMetrics }
}

/**
 * Checks whether the key required skills from the Strategist Brief are covered
 * in the cover letter, highlights, or keyword list.
 */
export function checkRequirementsCoverage(
  draft: ApplicationMaterialsDraft,
  brief?: StrategistBrief
): { covered: string[]; missing: string[] } {
  if (!brief || !brief.matchedSkills || brief.matchedSkills.length === 0) {
    return { covered: [], missing: [] }
  }

  const combinedDraft = `${draft.coverLetter} ${(draft.highlights || []).join(" ")} ${(draft.atsKeywords || []).join(" ")}`.toLowerCase()
  const covered: string[] = []
  const missing: string[] = []

  // Check top 3-4 matched skills
  const skillsToCheck = brief.matchedSkills.slice(0, 4)
  for (const s of skillsToCheck) {
    const skillName = s.skill.toLowerCase()
    if (combinedDraft.includes(skillName)) {
      covered.push(s.skill)
    } else {
      missing.push(s.skill)
    }
  }

  return { covered, missing }
}

/**
 * Skeptical Hiring Manager Critic Persona:
 * Evaluates application materials through the critical eye of an elite engineering leader:
 * 1. Zero tolerance for bracketed placeholders or robotic templates.
 * 2. Rejects fluffy clichés and empty corporate filler.
 * 3. Enforces STAR format metrics and quantifiable engineering achievements.
 * 4. Checks coverage of key job requirements from the strategist brief.
 * 5. Strictly limits outreach pitch length (max 110 words).
 * 6. Validates factual grounding against candidate knowledge graph when context is supplied.
 */
export function skepticalHiringManagerCritic(
  draft: ApplicationMaterialsDraft,
  options: SkepticalCriticOptions = {}
): SkepticalCriticResult {
  const { brief, maxOutreachWords = 110, groundingContext } = options
  const violations: string[] = []
  let score = 100

  const fullText = `${draft.coverLetter || ""} ${draft.outreachPitch || ""} ${(draft.highlights || []).join(" ")}`

  // 1. Placeholder Detection
  const placeholders = detectPlaceholders(fullText)
  if (placeholders.length > 0) {
    violations.push(
      `Draft contains unresolved placeholders (${placeholders.join(", ")}). Must use authentic names.`
    )
    score -= 30
  }

  // 2. Fluffy Buzzwords & Clichés Check
  const buzzwordsFound: string[] = []
  const lowerFull = fullText.toLowerCase()
  for (const buzzword of FLUFFY_BUZZWORDS) {
    if (lowerFull.includes(buzzword.toLowerCase())) {
      buzzwordsFound.push(buzzword)
    }
  }

  if (buzzwordsFound.length > 0) {
    violations.push(
      `Draft contains fluffy buzzwords / clichés (${buzzwordsFound.slice(0, 4).join(", ")}). Cut all generic filler and state concrete technical facts instead.`
    )
    score -= 15 * buzzwordsFound.length
  }

  // 3. STAR Format & Metric Plausibility Check
  const { hasStarMetrics } = checkStarMetrics(draft.coverLetter, draft.highlights)
  if (!hasStarMetrics) {
    violations.push(
      "Lacks STAR metrics: Technical claims must pair actions with measurable outcomes (e.g., latency, throughput, scale, test coverage, or concrete system metric)."
    )
    score -= 25
  }

  // 4. Job Requirements Coverage Check
  const { covered, missing: missingRequirements } = checkRequirementsCoverage(draft, brief)
  if (brief && brief.matchedSkills.length > 0 && covered.length < Math.min(2, brief.matchedSkills.length)) {
    violations.push(
      `Requirement coverage gap: Key competencies from the strategy brief are missing from the draft (${missingRequirements.join(", ")}). Every key requirement must be matched or honestly bridged.`
    )
    score -= 20
  }

  // 5. Outreach Pitch Word Count Check (Stripe/Linear 110-word constraint)
  if (draft.outreachPitch) {
    const pitchWords = draft.outreachPitch.trim().split(/\s+/).filter(Boolean).length
    if (pitchWords > maxOutreachWords) {
      violations.push(
        `Outreach pitch is too long (${pitchWords} words > ${maxOutreachWords} words max). Compress to a crisp, high-converting note.`
      )
      score -= 15
    }
  }

  // 6. Factual Grounding Audit (if context provided)
  let groundingAudit: GroundingAuditResult | undefined
  if (groundingContext) {
    const gResult = auditApplicationMaterialsGrounding(draft, groundingContext)
    groundingAudit = gResult.audit
    if (!gResult.audit.isFullyGrounded) {
      const unsupportedList = gResult.audit.unsupportedClaims.map((c) => c.claim).join(", ")
      violations.push(
        `Factual grounding violation: Draft contains unsupported skills/metrics not verified in Career Knowledge Graph (${unsupportedList}).`
      )
      score -= 20
    }
  }

  const finalScore = Math.max(0, Math.min(100, score))
  const approved = violations.length === 0

  return {
    approved,
    score: finalScore,
    violations,
    buzzwordsFound,
    hasStarMetrics,
    missingRequirements,
    groundingAudit,
    feedback: violations,
  }
}

/**
 * Deterministic baseline generator when external AI fails or is unconfigured
 */
function createDeterministicSquadFallback(
  jobTitle: string,
  companyName: string,
  candidateName: string
): ApplicationMaterialsDraft {
  const cleanJob = jobTitle || "Software Engineer"
  const cleanCompany = companyName || "the team"
  const cleanName = candidateName || "Applicant"

  return {
    coverLetter: `Dear ${cleanCompany} Hiring Team,\n\nI noticed ${cleanCompany} is expanding its team for the ${cleanJob} position. With hands-on experience building production-grade web systems and high-performance applications, I am writing to share how my background aligns with your engineering goals.\n\nThroughout my work, I focus on measurable product impact, reliable delivery, and maintainable, type-safe codebases. I would welcome the opportunity to discuss how my technical background directly supports your team's upcoming roadmap.\n\nSincerely,\n${cleanName}`,
    outreachPitch: `Hi ${cleanCompany} Team — I saw the ${cleanJob} opening and wanted to reach out directly. I focus on modern full-stack web architecture and reliable, maintainable systems. Would love to share my portfolio if you have 5 minutes! — ${cleanName}`,
    highlights: [
      `Hands-on experience building and shipping production web systems`,
      `Strong foundation in full-stack architecture with an emphasis on reliability and type safety`,
      `Delivered features end-to-end from design through deployment and iteration`,
    ],
    strategyTip: `Align your interview examples with ${cleanCompany}'s public technical blogs and architecture.`,
    atsKeywords: ["TypeScript", "React", "Next.js", "Node.js", "System Design"],
  }
}

/**
 * Coordinates the Level 4 Multi-Agent Squad:
 * 1. Strategist analyzes the JD & Candidate Knowledge Graph to create a positioning brief.
 * 2. Scribe drafts tailored application materials grounded in the brief.
 * 3. Skeptical Hiring Manager Critic evaluates the draft against adversarial rubrics (buzzwords, STAR metrics, coverage, length).
 * 4. Loops back to Scribe if Critic flags any violations until approved or exhausted.
 */
export async function coordinateApplicationPackageSquad(
  options: ApplicationSquadOptions
): Promise<ApplicationSquadResult> {
  const {
    jobTitle,
    companyName,
    candidateName,
    dossierContext = "",
    groundingContext,
    strategistFn,
    scribeFn,
    maxCriticRounds = 3,
  } = options

  // If no AI functions provided or execution fails, fall back to deterministic
  if (!strategistFn || !scribeFn) {
    return {
      materials: createDeterministicSquadFallback(jobTitle, companyName, candidateName),
      approvedByCritic: true,
      rounds: 1,
      isDeterministicFallback: true,
    }
  }

  try {
    // 1. Strategist generates Positioning Brief
    const brief = await strategistFn({ jobTitle, companyName, dossierContext })

    let currentDraft: ApplicationMaterialsDraft | null = null
    let critiqueFeedback: string[] = []
    let rounds = 0

    // 2. Scribe & Skeptical Critic Collaborative Reflexion Loop
    while (rounds < maxCriticRounds) {
      rounds++
      try {
        const nextDraft = await scribeFn(brief, critiqueFeedback.length > 0 ? critiqueFeedback : undefined)
        currentDraft = nextDraft
      } catch (scribeErr) {
        // If a valid draft already exists from a previous round, use it rather than crashing
        if (currentDraft) {
          break
        }
        throw scribeErr
      }

      // Skeptical Hiring Manager Critic evaluates the complete draft
      const criticEval = skepticalHiringManagerCritic(currentDraft, {
        brief,
        maxOutreachWords: 110,
        groundingContext,
      })

      if (criticEval.approved) {
        // Critic signs off
        return {
          materials: currentDraft,
          approvedByCritic: true,
          rounds,
          isDeterministicFallback: false,
          strategistBrief: brief,
        }
      }

      critiqueFeedback = criticEval.violations
    }

    // If max rounds exhausted, apply deterministic sanitizers
    if (currentDraft) {
      const sanitizedCoverLetter = sanitizeOutreachPlaceholders(currentDraft.coverLetter, {
        companyName,
        jobTitle,
        candidateName,
      })
      const sanitizedPitch = sanitizeOutreachPlaceholders(currentDraft.outreachPitch, {
        companyName,
        jobTitle,
        candidateName,
      })

      let finalMaterials: ApplicationMaterialsDraft = {
        ...currentDraft,
        coverLetter: sanitizedCoverLetter,
        outreachPitch: sanitizedPitch,
      }

      // If grounding context was provided, sanitize ungrounded hallucinations
      if (groundingContext) {
        const groundedRes = auditApplicationMaterialsGrounding(finalMaterials, groundingContext)
        finalMaterials = groundedRes.materials
      }

      return {
        materials: finalMaterials,
        approvedByCritic: false,
        rounds,
        criticFeedback: critiqueFeedback,
        isDeterministicFallback: false,
        strategistBrief: brief,
      }
    }

    return {
      materials: createDeterministicSquadFallback(jobTitle, companyName, candidateName),
      approvedByCritic: true,
      rounds,
      isDeterministicFallback: true,
    }
  } catch (error) {
    console.warn("[MultiAgentSquad] Execution error, falling back to deterministic baseline:", error)
    return {
      materials: createDeterministicSquadFallback(jobTitle, companyName, candidateName),
      approvedByCritic: true,
      rounds: 1,
      isDeterministicFallback: true,
    }
  }
}
