import { createGoogle } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { VectorCandidateJob } from "./vector-retrieval"
import { traceAIGeneration } from "@/lib/ai/telemetry"

const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || ""
const googleProvider = createGoogle({ apiKey: googleApiKey })
const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash"
const RERANK_MODEL = googleProvider(modelName)

export const ReRankResponseSchema = z.object({
  rankings: z.array(
    z.object({
      jobId: z.string(),
      fitScore: z.number().int().min(1).max(99),
      roleMatchScore: z.number().int().min(0).max(25),
      skillMatchScore: z.number().int().min(0).max(40),
      locationMatchScore: z.number().int().min(0).max(20),
      seniorityMatchScore: z.number().int().min(0).max(15),
      projectMatchProof: z.string().describe("Specific proof showing which candidate project validates fit"),
      matchRationale: z.string().describe("Concise 1-sentence explanation of fit or stretch"),
      missingCriticalSkills: z.array(z.string()),
    })
  ),
})

export interface ReRankedJobOpportunity extends VectorCandidateJob {
  fitScore: number
  matchRationale: string
  missingSkills: string[]
  scoreBreakdown: {
    skills: number
    role: number
    location: number
    seniority: number
  }
}

/**
 * Tier 2: Evaluates the top candidates with deep LLM cross-encoder re-ranking
 */
export async function deepReRankCandidateJobs(params: {
  candidateProfile: {
    userId?: string
    targetRoles: string[]
    skills: string[]
    experienceLevel: string
    location: string
    projects: Array<{ name: string; stack?: string; description?: string }>
  }
  jobs: VectorCandidateJob[]
}): Promise<ReRankedJobOpportunity[]> {
  const { candidateProfile, jobs } = params
  if (jobs.length === 0) return []

  // Ensure candidates are sorted by Tier 1 vector similarity
  const sortedJobs = [...jobs].sort((a, b) => (b.cosineSimilarity || 0) - (a.cosineSimilarity || 0))

  // Deep LLM re-ranking on top candidates to prevent latency spikes & timeouts
  // 10 candidates generate ~500-600 tokens (vs ~2,500 for 25), completing in ~1.5-2.5s
  const MAX_LLM_RERANK = 10
  const candidatesToReRank = sortedJobs.slice(0, MAX_LLM_RERANK)
  const remainingCandidates = sortedJobs.slice(MAX_LLM_RERANK)

  const compactJobs = candidatesToReRank.map((j) => ({
    jobId: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    isRemote: j.isRemote,
    tags: (j.tags || []).slice(0, 6),
    summary: (j.description || "").slice(0, 220).replace(/\s+/g, " ").trim(),
    initialVectorSimilarity: Math.round((j.cosineSimilarity || 0.7) * 100),
  }))

  const compactProjects = (candidateProfile.projects || []).slice(0, 3).map((p) => ({
    name: p.name,
    stack: p.stack || "",
    summary: (p.description || "").slice(0, 120),
  }))

  const prompt = `
You are a Staff Technical Recruiter and Career Matching Engine.
Evaluate the candidate's fit for each job opportunity with extreme objectivity.

CANDIDATE:
- Target Roles: ${candidateProfile.targetRoles.join(", ")}
- Seniority: ${candidateProfile.experienceLevel}
- Location: ${candidateProfile.location}
- Verified Skills: ${candidateProfile.skills.slice(0, 20).join(", ")}
- Proven Projects: ${JSON.stringify(compactProjects)}

RULES:
1. Do NOT award high scores to unrelated engineering specializations (e.g. DevOps to a Frontend Dev = roleMatchScore < 5).
2. If the candidate has proven experience in their projects matching the tech stack, award high skillMatchScore.
3. Total Fit Score (1-99) = roleMatchScore (0-25) + skillMatchScore (0-40) + locationMatchScore (0-20) + seniorityMatchScore (0-15).
4. Identify which project proves their fit (max 12 words).
5. If candidate Seniority is junior or entry, any Senior, Lead, Staff, Principal, Director, or 3+ years experience role MUST receive seniorityMatchScore = 0 and total fitScore MUST NOT exceed 30.
6. Keep matchRationale concise (under 15 words). Max 3 missingCriticalSkills.

JOBS TO EVALUATE:
${JSON.stringify(compactJobs, null, 2)}
`

  const startTime = Date.now()
  try {
    const { object } = await generateObject({
      model: RERANK_MODEL,
      schema: ReRankResponseSchema,
      prompt,
      temperature: 0.1,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(8500),
    })

    void traceAIGeneration({
      name: "job-discovery-deep-rerank",
      userId: candidateProfile.userId || "anonymous",
      model: modelName,
      provider: "google",
      input: {
        candidateSeniority: candidateProfile.experienceLevel,
        targetRoles: candidateProfile.targetRoles,
        evaluatedJobsCount: candidatesToReRank.length,
      },
      output: {
        rankedCount: object.rankings.length,
        topFitScore: object.rankings[0]?.fitScore,
        rankingsSample: object.rankings.slice(0, 3).map((r) => ({ jobId: r.jobId, fitScore: r.fitScore, proof: r.projectMatchProof })),
      },
      latencyMs: Date.now() - startTime,
      status: "success",
      tags: ["discovery", "tier2-rerank", "gemini"],
      flush: true,
    })

    const rankMap = new Map(object.rankings.map((r) => [r.jobId, r]))

    const reRankedTop: ReRankedJobOpportunity[] = candidatesToReRank.map((job) => {
      const ranked = rankMap.get(job.id)
      if (!ranked) {
        // Graceful fallback to vector similarity
        const fallbackScore = Math.round((job.cosineSimilarity || 0.7) * 90)
        return {
          ...job,
          fitScore: Math.max(10, Math.min(95, fallbackScore)),
          matchRationale: "Semantic concept alignment with candidate profile",
          missingSkills: [],
          scoreBreakdown: { skills: 20, role: 15, location: 15, seniority: 10 },
        }
      }

      const rationale = `📊 Fit: ${ranked.fitScore}% (Skills: ${ranked.skillMatchScore}/40 • Role: ${ranked.roleMatchScore}/25 • Loc: ${ranked.locationMatchScore}/20 • Seniority: ${ranked.seniorityMatchScore}/15) • ${ranked.projectMatchProof ? `Proof: ${ranked.projectMatchProof}. ` : ""}${ranked.matchRationale}`

      return {
        ...job,
        fitScore: ranked.fitScore,
        matchRationale: rationale,
        missingSkills: ranked.missingCriticalSkills || [],
        scoreBreakdown: {
          skills: ranked.skillMatchScore,
          role: ranked.roleMatchScore,
          location: ranked.locationMatchScore,
          seniority: ranked.seniorityMatchScore,
        },
      }
    })

    // Remaining candidates beyond top 10 receive calibrated vector fit scores
    const calibratedRemaining: ReRankedJobOpportunity[] = remainingCandidates.map((job) => {
      const sim = job.cosineSimilarity || 0.7
      const fallbackScore = Math.max(15, Math.min(84, Math.round(sim * 88)))
      return {
        ...job,
        fitScore: fallbackScore,
        matchRationale: "Semantic concept alignment with candidate profile",
        missingSkills: [],
        scoreBreakdown: {
          skills: Math.round(sim * 35),
          role: Math.round(sim * 22),
          location: Math.round(sim * 18),
          seniority: Math.round(sim * 15),
        },
      }
    })

    return [...reRankedTop, ...calibratedRemaining].sort((a, b) => b.fitScore - a.fitScore)
  } catch (error) {
    console.warn("[DeepReRanker Warning] Falling back to Tier 1 vector ordering:", error)
    void traceAIGeneration({
      name: "job-discovery-deep-rerank",
      userId: candidateProfile.userId || "anonymous",
      model: modelName,
      provider: "google",
      input: {
        candidateSeniority: candidateProfile.experienceLevel,
        targetRoles: candidateProfile.targetRoles,
        evaluatedJobsCount: candidatesToReRank.length,
      },
      latencyMs: Date.now() - startTime,
      status: "error",
      error,
      tags: ["discovery", "tier2-rerank", "error", "fallback-to-vector"],
      flush: true,
    })

    return jobs
      .map((job) => ({
        ...job,
        fitScore: Math.round((job.cosineSimilarity || 0.7) * 95),
        matchRationale: "Direct semantic vector match",
        missingSkills: [],
        scoreBreakdown: { skills: 25, role: 20, location: 15, seniority: 10 },
      }))
      .sort((a, b) => b.fitScore - a.fitScore)
  }
}
