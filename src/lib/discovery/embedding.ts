/* eslint-disable @typescript-eslint/no-explicit-any */
import { openai } from "@ai-sdk/openai"
import { embed, embedMany } from "ai"

export const EMBEDDING_DIMENSION = 1536

/**
 * Generates a pseudo-random deterministic fallback embedding of exactly 1536 dimensions
 * based on input text hash when AI API key is missing or offline.
 */
export function createDeterministicFallbackVector(text: string): number[] {
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
 * Generates 1536-dimensional vector using Google Gemini's native embedding endpoint
 * with Matryoshka Representation Learning (outputDimensionality: 1536)
 */
async function generateGeminiEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 8000) }] },
          outputDimensionality: EMBEDDING_DIMENSION,
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.warn(`[GeminiEmbedding] API error ${res.status}: ${errText}`)
      return null
    }

    const data = await res.json()
    const values = data?.embedding?.values
    if (Array.isArray(values) && values.length === EMBEDDING_DIMENSION) {
      return values
    }
    return null
  } catch (err) {
    console.warn("[GeminiEmbedding] Network error:", (err as Error)?.message)
    return null
  }
}

/**
 * Batch generates 1536-dimensional vectors using Google Gemini batchEmbedContents
 */
async function generateGeminiBatchEmbeddings(texts: string[], apiKey: string): Promise<number[][] | null> {
  try {
    const requests = texts.map((t) => ({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text: t.slice(0, 8000) }] },
      outputDimensionality: EMBEDDING_DIMENSION,
    }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.warn(`[GeminiEmbedding] Batch API error ${res.status}: ${errText}`)
      return null
    }

    const data = await res.json()
    const embeddings = data?.embeddings
    if (Array.isArray(embeddings) && embeddings.length === texts.length) {
      return embeddings.map((e: any, idx: number) =>
        Array.isArray(e?.values) && e.values.length === EMBEDDING_DIMENSION
          ? e.values
          : createDeterministicFallbackVector(texts[idx])
      )
    }
    return null
  } catch (err) {
    console.warn("[GeminiEmbedding] Batch network error:", (err as Error)?.message)
    return null
  }
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
 * Prioritizes Gemini when GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY is available,
 * then OpenAI when OPENAI_API_KEY is available, and falls back to deterministic vector.
 */
export async function generateJobEmbedding(job: {
  title: string
  company: string
  description?: string | null
  tags?: string[]
}): Promise<number[]> {
  const text = formatJobForEmbedding(job)

  // 1. Google Gemini Embeddings (BYOK & Env key)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (geminiKey) {
    const geminiVector = await generateGeminiEmbedding(text, geminiKey)
    if (geminiVector) return geminiVector
  }

  // 2. OpenAI Embeddings
  if (process.env.OPENAI_API_KEY) {
    try {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: text,
      })
      if (embedding && embedding.length === EMBEDDING_DIMENSION) {
        return embedding
      }
    } catch (error) {
      console.warn("[EmbeddingGenerator] OpenAI job embedding failed:", (error as Error)?.message)
    }
  }

  return createDeterministicFallbackVector(text)
}

/**
 * Batch generate embeddings for scraped jobs in chunks (up to 50 per chunk)
 */
export async function generateBatchJobEmbeddings(
  jobs: Array<{ title: string; company: string; description?: string | null; tags?: string[] }>
): Promise<number[][]> {
  if (jobs.length === 0) return []
  const values = jobs.map(formatJobForEmbedding)

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (geminiKey) {
    const CHUNK_SIZE = 50
    const results: number[][] = []
    for (let i = 0; i < values.length; i += CHUNK_SIZE) {
      const slice = values.slice(i, i + CHUNK_SIZE)
      const chunkEmbeddings = await generateGeminiBatchEmbeddings(slice, geminiKey)
      if (chunkEmbeddings) {
        results.push(...chunkEmbeddings)
      } else {
        // Fallback for this chunk
        results.push(...slice.map(createDeterministicFallbackVector))
      }
    }
    return results
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values,
      })
      return embeddings.map((emb, idx) =>
        emb && emb.length === EMBEDDING_DIMENSION ? emb : createDeterministicFallbackVector(values[idx])
      )
    } catch (error) {
      console.warn("[EmbeddingGenerator] OpenAI batch job embedding failed:", (error as Error)?.message)
    }
  }

  return values.map(createDeterministicFallbackVector)
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

  // 1. Google Gemini Embeddings
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (geminiKey) {
    const geminiVector = await generateGeminiEmbedding(text, geminiKey)
    if (geminiVector) return geminiVector
  }

  // 2. OpenAI Embeddings
  if (process.env.OPENAI_API_KEY) {
    try {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: text,
      })
      if (embedding && embedding.length === EMBEDDING_DIMENSION) {
        return embedding
      }
    } catch (error) {
      console.warn("[EmbeddingGenerator] OpenAI candidate embedding failed:", (error as Error)?.message)
    }
  }

  return createDeterministicFallbackVector(text)
}
