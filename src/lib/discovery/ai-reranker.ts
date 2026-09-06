import { createGoogle } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { VectorCandidateJob } from "./vector-retrieval"

const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || ""
const googleProvider = createGoogle({ apiKey: googleApiKey })
const RERANK_MODEL = googleProvider("gemini-2.0-flash")

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
 * Tier 2: Evaluates the top 25 shortlisted candidates in parallel batches
 */
export async function deepReRankCandidateJobs(params: {
  candidateProfile: {
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

  // Trim job payload to minimize token usage (<3,000 tokens for 25 jobs)
  const compactJobs = jobs.map((j) => ({
    jobId: j.id,
    title: j.title,
    company: j.company,
    location: j.location,
    isRemote: j.isRemote,
    tags: j.tags.slice(0, 8),
    summary: (j.description || "").slice(0, 450),
    initialVectorSimilarity: Math.round(j.cosineSimilarity * 100),
  }))

  const prompt = `
You are a Staff Technical Recruiter and Career Matching Engine.
Evaluate the candidate's fit for each job opportunity with extreme objectivity.

CANDIDATE:
- Target Roles: ${candidateProfile.targetRoles.join(", ")}
- Seniority: ${candidateProfile.experienceLevel}
- Location: ${candidateProfile.location}
- Verified Skills: ${candidateProfile.skills.slice(0, 25).join(", ")}
- Proven Projects: ${JSON.stringify(candidateProfile.projects)}

RULES:
1. Do NOT award high scores to unrelated engineering specializations (e.g. DevOps to a Frontend Dev = roleMatchScore < 5).
2. If the candidate has proven experience in their projects matching the tech stack, award high skillMatchScore.
3. Total Fit Score (1-99) = roleMatchScore (0-25) + skillMatchScore (0-40) + locationMatchScore (0-20) + seniorityMatchScore (0-15).
4. Identify which project proves their fit.

JOBS TO EVALUATE:
${JSON.stringify(compactJobs, null, 2)}
`

  try {
    const { object } = await generateObject({
      model: RERANK_MODEL,
      schema: ReRankResponseSchema,
      prompt,
      temperature: 0.1,
    })

    const rankMap = new Map(object.rankings.map((r) => [r.jobId, r]))

    return jobs
      .map((job) => {
        const ranked = rankMap.get(job.id)
        if (!ranked) {
          // Graceful fallback to vector similarity
          const fallbackScore = Math.round(job.cosineSimilarity * 90)
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
          missingSkills: ranked.missingCriticalSkills,
          scoreBreakdown: {
            skills: ranked.skillMatchScore,
            role: ranked.roleMatchScore,
            location: ranked.locationMatchScore,
            seniority: ranked.seniorityMatchScore,
          },
        }
      })
      .sort((a, b) => b.fitScore - a.fitScore)
  } catch (error) {
    console.error("[DeepReRanker Error] Falling back to Tier 1 vector ordering:", error)
    return jobs.map((job) => ({
      ...job,
      fitScore: Math.round(job.cosineSimilarity * 95),
      matchRationale: "Direct semantic vector match",
      missingSkills: [],
      scoreBreakdown: { skills: 25, role: 20, location: 15, seniority: 10 },
    }))
  }
}
