import { openai } from "@ai-sdk/openai"
import { embed, embedMany } from "ai"

export const EMBEDDING_DIMENSION = 1536
const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small")

/**
 * Generates a pseudo-random deterministic fallback embedding of exactly 1536 dimensions
 * based on input text hash when AI API key is missing or offline.
 */
function createDeterministicFallbackVector(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSION).fill(0)
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    const pseudo = Math.sin(hash + i) * 10000
    vector[i] = parseFloat((pseudo - Math.floor(pseudo) - 0.5).toFixed(4))
  }
  return vector
}

/**
 * Normalizes job details into structured text for dense embedding
 */
export function formatJobForEmbedding(job: {
  title: string
  company: string
  description?: string | null
  tags?: string[]
}): string {
  const cleanDesc = (job.description || "").slice(0, 2000).replace(/\s+/g, " ").trim()
  const tagsStr = (job.tags || []).slice(0, 15).join(", ")
  return `Role: ${job.title}\nCompany: ${job.company}\nTechnologies: ${tagsStr}\nSummary: ${cleanDesc}`
}

/**
 * Generates an embedding vector for a single job (1536-dim)
 */
export async function generateJobEmbedding(job: {
  title: string
  company: string
  description?: string | null
  tags?: string[]
}): Promise<number[]> {
  const text = formatJobForEmbedding(job)
  try {
    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: text,
    })
    if (embedding && embedding.length === EMBEDDING_DIMENSION) {
      return embedding
    }
    return createDeterministicFallbackVector(text)
  } catch (error) {
    console.warn("[EmbeddingGenerator] Failed to generate job embedding, falling back to deterministic vector:", (error as Error)?.message)
    return createDeterministicFallbackVector(text)
  }
}

/**
 * Batch generate embeddings for scraped jobs in chunks
 */
export async function generateBatchJobEmbeddings(
  jobs: Array<{ title: string; company: string; description?: string | null; tags?: string[] }>
): Promise<number[][]> {
  if (jobs.length === 0) return []
  const values = jobs.map(formatJobForEmbedding)
  try {
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values,
    })
    return embeddings.map((emb, idx) =>
      emb && emb.length === EMBEDDING_DIMENSION ? emb : createDeterministicFallbackVector(values[idx])
    )
  } catch (error) {
    console.warn("[EmbeddingGenerator] Batch job embedding call failed, using deterministic fallback vectors:", (error as Error)?.message)
    return values.map((v) => createDeterministicFallbackVector(v))
  }
}

/**
 * Builds composite candidate text from profile, skills, projects, and target roles
 */
export function formatCandidateForEmbedding(candidate: {
  targetRoles: string[]
  skills: string[]
  projects: Array<{ name: string; stack?: string; description?: string }>
  preferredWorkMode?: string
}): string {
  const roles = candidate.targetRoles.join(", ")
  const skills = candidate.skills.slice(0, 30).join(", ")
  const projects = candidate.projects
    .slice(0, 3)
    .map((p) => `${p.name} (${p.stack || ""}): ${p.description || ""}`)
    .join(" | ")

  return `Candidate Target Roles: ${roles}\nSkills: ${skills}\nDemonstrated Projects: ${projects}\nWork Mode: ${candidate.preferredWorkMode || "Any"}`
}

/**
 * Generates an embedding vector for a candidate profile (1536-dim)
 */
export async function generateCandidateEmbedding(candidate: {
  targetRoles: string[]
  skills: string[]
  projects: Array<{ name: string; stack?: string; description?: string }>
  preferredWorkMode?: string
}): Promise<number[]> {
  const text = formatCandidateForEmbedding(candidate)
  try {
    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: text,
    })
    if (embedding && embedding.length === EMBEDDING_DIMENSION) {
      return embedding
    }
    return createDeterministicFallbackVector(text)
  } catch (error) {
    console.warn("[EmbeddingGenerator] Failed to generate candidate embedding, falling back to deterministic vector:", (error as Error)?.message)
    return createDeterministicFallbackVector(text)
  }
}
