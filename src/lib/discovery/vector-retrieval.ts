import { prisma, withDbRetry } from "@/lib/prisma"
import { isValidJobPostingUrl } from "./matching"
import { getUserImplicitPreferences } from "./preferences"
import { generateCandidateEmbedding } from "./embedding"

export interface VectorCandidateJob {
  id: string
  title: string
  company: string
  location: string
  isRemote: boolean
  url: string
  salary: string | null
  salaryMin: number | null
  salaryMax: number | null
  tags: string[]
  description: string | null
  postedAt: Date | null
  visaSponsorship: string
  cosineSimilarity: number
}

/**
 * Tier 1: Dense vector retrieval with negative feedback subtraction (<30ms)
 */
export async function retrieveCandidateJobsTier1(params: {
  userId: string
  targetRoles: string[]
  userSkills: string[]
  projects: Array<{ name: string; stack?: string; description?: string }>
  workPreference?: string
  limit?: number
}): Promise<VectorCandidateJob[]> {
  const { userId, targetRoles, userSkills, projects, workPreference, limit = 25 } = params

  // 1. Generate base candidate positive embedding (1536-dim)
  const candidateVector = await generateCandidateEmbedding({
    targetRoles,
    skills: userSkills,
    projects,
    preferredWorkMode: workPreference,
  })

  // 2. Load implicit aversions (negative feedback loop)
  const implicitPrefs = await getUserImplicitPreferences(userId).catch(() => null)
  const rawDisliked = implicitPrefs?.dislikedRoles
  const negativeTokens: string[] = Array.isArray(rawDisliked)
    ? (rawDisliked as unknown as string[])
    : rawDisliked && typeof rawDisliked === "object"
    ? Object.keys(rawDisliked)
    : []

  // Vector string representation for pgvector: '[0.012, -0.043, ...]'
  const vectorString = `[${candidateVector.join(",")}]`

  let rawResults: Array<{
    id: string
    title: string
    company: string
    location: string
    isRemote: boolean
    url: string
    salary: string | null
    salaryMin: number | null
    salaryMax: number | null
    tags: string[]
    description: string | null
    postedAt: Date | null
    visaSponsorship: string
    similarity: number
  }> = []

  // 3. Execute Vector Distance Query directly in PostgreSQL with HNSW Index
  // 1 - (embedding <=> candidate_vector) = Cosine Similarity
  try {
    rawResults = await withDbRetry(() =>
      prisma.$queryRaw<Array<{
        id: string
        title: string
        company: string
        location: string
        isRemote: boolean
        url: string
        salary: string | null
        salaryMin: number | null
        salaryMax: number | null
        tags: string[]
        description: string | null
        postedAt: Date | null
        visaSponsorship: string
        similarity: number
      }>>`
        SELECT 
          id,
          title,
          company,
          location,
          "isRemote",
          url,
          salary,
          "salaryMin",
          "salaryMax",
          tags,
          description,
          "postedAt",
          "visaSponsorship",
          (1 - (embedding <=> ${vectorString}::vector)) AS similarity
        FROM "CanonicalJob"
        WHERE 
          "isExpired" = false
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorString}::vector ASC
        LIMIT ${limit * 2};
      `
    )
  } catch (error) {
    console.warn("[Tier1 Retrieval] pgvector query failed or no embeddings found. Falling back to active catalog:", (error as Error)?.message)
    // Fallback query: Explicitly select fields without embedding to prevent Prisma deserialization error
    const fallbackJobs = await withDbRetry(() =>
      prisma.canonicalJob.findMany({
        where: { isExpired: false },
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          isRemote: true,
          url: true,
          salary: true,
          salaryMin: true,
          salaryMax: true,
          tags: true,
          description: true,
          postedAt: true,
          visaSponsorship: true,
        },
        orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
        take: limit * 2,
      })
    )

    rawResults = fallbackJobs.map((j) => {
      // Basic keyword overlap similarity for graceful fallback
      const lowerTitle = j.title.toLowerCase()
      const roleMatch = targetRoles.some((r) => lowerTitle.includes(r.toLowerCase()))
      return {
        ...j,
        similarity: roleMatch ? 0.75 : 0.55,
      }
    })
  }

  // 4. Sanity Filter: Filter dead links and hard aversions
  const candidates: VectorCandidateJob[] = []
  for (const row of rawResults) {
    if (!isValidJobPostingUrl(row.url)) continue

    // Negative feedback penalty: If role contains repeatedly dismissed tokens, drop similarity
    let adjustedSim = Number(row.similarity)
    const lowerTitle = row.title.toLowerCase()
    for (const disliked of negativeTokens) {
      if (lowerTitle.includes(disliked.toLowerCase())) {
        adjustedSim -= 0.25 // Heavy vector penalty
      }
    }

    if (adjustedSim > 0.40) {
      candidates.push({
        ...row,
        cosineSimilarity: Math.max(0.01, Math.min(0.99, adjustedSim)),
      })
    }

    if (candidates.length >= limit) break
  }

  return candidates
}
