/**
 * Semantic Vector Matching Engine (REC-17)
 * Evaluates semantic conceptual alignment between candidate background
 * (target roles, verified skills, project architecture) and job opportunities,
 * overcoming rigid keyword matching with embedding-based or cluster-based vector similarity.
 */

import { toCanonical } from "@/lib/ai/knowledge-graph"

export interface CandidateSemanticProfile {
  targetRoles: string[]
  skills: string[]
  projectSummaries?: string[]
}

export interface JobSemanticProfile {
  title: string
  description?: string
  tags?: string[]
}

export interface SemanticMatchResult {
  similarity: number // 0.00 to 1.00
  bonus: number // -5 to +8
  rationale?: string
  matchedConcepts: string[]
}

/**
 * High-dimensional semantic synonym clusters for engineering concepts
 */
const SEMANTIC_CLUSTERS: Record<string, string[]> = {
  frontend: ["ui", "ux", "client", "react", "nextjs", "vue", "angular", "web", "browser", "css", "html", "design systems"],
  backend: ["api", "server", "microservices", "distributed", "node", "express", "fastapi", "golang", "postgres", "sql", "redis"],
  fullstack: ["frontend", "backend", "web", "product engineer", "software engineer", "application developer", "systems"],
  devops: ["sre", "infrastructure", "cloud", "platform", "kubernetes", "docker", "ci/cd", "terraform", "aws", "gcp"],
  data: ["analytics", "warehouse", "etl", "pipeline", "sql", "dbt", "spark", "snowflake", "bigquery"],
  ai: ["machine learning", "llm", "nlp", "deep learning", "pytorch", "transformers", "agentic", "openai", "inference"],
  mobile: ["android", "ios", "react native", "flutter", "swift", "kotlin"],
  qa: ["test", "automation", "sdet", "testing", "cypress", "playwright", "quality assurance"],
  leadership: ["lead", "staff", "principal", "architect", "manager", "head of", "director"],
}

/**
 * Tokenizes text into canonicalized unigrams and bigrams
 */
function tokenizeSemanticTokens(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9+#.-]/g, " ")
  const words = normalized.split(/\s+/).filter((w) => w.length > 1)
  const tokens: string[] = []

  for (let i = 0; i < words.length; i++) {
    tokens.push(toCanonical(words[i]))
    if (i < words.length - 1) {
      tokens.push(`${words[i]} ${words[i + 1]}`)
    }
  }

  return tokens
}

/**
 * Builds a term-frequency weighted vector with cluster expansion
 */
function buildExpandedTermVector(tokens: string[], weights: { primary: number; expanded: number }): Map<string, number> {
  const vector = new Map<string, number>()

  for (const token of tokens) {
    const current = vector.get(token) || 0
    vector.set(token, current + weights.primary)

    // Expand semantic clusters
    for (const [clusterKey, members] of Object.entries(SEMANTIC_CLUSTERS)) {
      if (token === clusterKey || members.includes(token)) {
        for (const member of members) {
          const mVal = vector.get(member) || 0
          vector.set(member, mVal + weights.expanded)
        }
      }
    }
  }

  return vector
}

/**
 * Computes sparse cosine similarity between two weighted term vectors
 */
function sparseCosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): { similarity: number; sharedTerms: string[] } {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  const sharedTerms: string[] = []

  for (const val of vecA.values()) {
    normA += val * val
  }
  for (const val of vecB.values()) {
    normB += val * val
  }

  if (normA === 0 || normB === 0) {
    return { similarity: 0, sharedTerms: [] }
  }

  for (const [term, valA] of vecA.entries()) {
    const valB = vecB.get(term)
    if (valB !== undefined) {
      dotProduct += valA * valB
      sharedTerms.push(term)
    }
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  const similarity = denominator > 0 ? dotProduct / denominator : 0

  return {
    similarity: Math.min(1.0, Math.max(0.0, similarity)),
    sharedTerms,
  }
}

/**
 * Computes deterministic semantic vector match score between candidate and job (REC-17).
 * Works 100% reliably in all environments with zero external API dependencies.
 */
export function computeSemanticSimilarity(
  candidate: CandidateSemanticProfile,
  job: JobSemanticProfile
): SemanticMatchResult {
  const candidateText = [
    ...(candidate.targetRoles || []),
    ...(candidate.skills || []),
    ...(candidate.projectSummaries || []),
  ].join(" ")

  const jobText = [
    job.title,
    job.title, // Title double-weighted
    ...(job.tags || []),
    (job.description || "").slice(0, 500),
  ].join(" ")

  const candidateTokens = tokenizeSemanticTokens(candidateText)
  const jobTokens = tokenizeSemanticTokens(jobText)

  const candidateVector = buildExpandedTermVector(candidateTokens, { primary: 2.0, expanded: 0.6 })
  const jobVector = buildExpandedTermVector(jobTokens, { primary: 2.0, expanded: 0.6 })

  const { similarity, sharedTerms } = sparseCosineSimilarity(candidateVector, jobVector)

  // Meaningful unique shared concepts (filtering out single characters)
  const matchedConcepts = Array.from(new Set(sharedTerms))
    .filter((t) => t.length > 2 && !/^\d+$/.test(t))
    .slice(0, 5)

  // Calculate calibrated bonus / adjustment (-5 to +8)
  let bonus = 0
  let rationale: string | undefined

  if (similarity >= 0.70) {
    bonus = 8
    rationale = `Strong Semantic Concept Match (${Math.round(similarity * 100)}%): High vector affinity across ${matchedConcepts.slice(0, 3).join(", ")}`
  } else if (similarity >= 0.50) {
    bonus = 5
    rationale = `High Semantic Alignment (${Math.round(similarity * 100)}%): Conceptual overlap in ${matchedConcepts.slice(0, 3).join(", ")}`
  } else if (similarity >= 0.35) {
    bonus = 2
    rationale = `Moderate Semantic Fit (${Math.round(similarity * 100)}%)`
  } else if (similarity < 0.15 && candidate.targetRoles.length > 0) {
    bonus = -4
  }

  return {
    similarity: Math.round(similarity * 100) / 100,
    bonus,
    rationale,
    matchedConcepts,
  }
}
