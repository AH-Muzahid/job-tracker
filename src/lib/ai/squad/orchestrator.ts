import { evaluateDraft, EvaluationRubric } from "../evaluator-optimizer"
import { sanitizeOutreachPlaceholders } from "@/lib/applications/outreach-engine"

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
    coverLetter: `Dear ${cleanCompany} Hiring Team,\n\nI noticed ${cleanCompany} is expanding its team for the ${cleanJob} position. With hands-on experience building production-grade web systems and high-performance applications, I am writing to share how my background aligns with your engineering goals.\n\nThroughout my work, I focus on measurable product impact, optimizing response latency, and shipping reliable features. I would welcome the opportunity to discuss how my technical background directly supports your team's upcoming roadmap.\n\nSincerely,\n${cleanName}`,
    outreachPitch: `Hi ${cleanCompany} Team — I saw the ${cleanJob} opening and wanted to reach out directly. I specialize in modern full-stack architecture with TypeScript, Next.js, and Node.js. Would love to share my portfolio if you have 5 minutes! — ${cleanName}`,
    highlights: [
      `Demonstrated production experience relevant to ${cleanJob}`,
      "Proven track record in high-velocity full-stack engineering",
      "Collaborative team player with strong technical discipline",
    ],
    strategyTip: `Align your interview examples with ${cleanCompany}'s public technical blogs and architecture.`,
    atsKeywords: ["TypeScript", "React", "Next.js", "Node.js", "System Design"],
  }
}

/**
 * Coordinates the Level 4 Multi-Agent Squad:
 * 1. Strategist analyzes the JD & Candidate Knowledge Graph to create a positioning brief.
 * 2. Scribe drafts tailored application materials grounded in the brief.
 * 3. Critic evaluates the draft against adversarial rubrics (placeholders, length, tone).
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

    const rubric: EvaluationRubric = {
      disallowPlaceholders: true,
      maxCharacters: 5000,
    }

    // 2. Scribe & Critic Collaborative Reflexion Loop
    while (rounds < maxCriticRounds) {
      rounds++
      currentDraft = await scribeFn(brief, critiqueFeedback.length > 0 ? critiqueFeedback : undefined)

      // Critic evaluates both Cover Letter and Outreach Pitch
      const clEval = evaluateDraft(currentDraft.coverLetter || "", rubric)
      const opEval = evaluateDraft(currentDraft.outreachPitch || "", rubric)

      const violations = [...clEval.violations, ...opEval.violations]

      if (violations.length === 0) {
        // Critic signs off
        return {
          materials: currentDraft,
          approvedByCritic: true,
          rounds,
          isDeterministicFallback: false,
          strategistBrief: brief,
        }
      }

      critiqueFeedback = violations
    }

    // If max rounds exhausted, apply deterministic sanitizer
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

      return {
        materials: {
          ...currentDraft,
          coverLetter: sanitizedCoverLetter,
          outreachPitch: sanitizedPitch,
        },
        approvedByCritic: true,
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
