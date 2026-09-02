/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { cosineSimilarity } from "./cosine-similarity"

export interface MemorySearchResult {
  id: string
  category: string
  content: string
  similarity: number
  createdAt: Date
}

export async function generateEmbedding(text: string): Promise<number[]> {
  // 1. Check for OpenAI API Key
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
        dimensions: 1536,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.data[0].embedding
    }
  }

  // 2. Check for Google Gemini API Key (100% FREE via text-embedding-004)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (geminiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.embedding?.values) {
        return data.embedding.values
      }
    }
  }

  throw new Error("No valid embedding provider key (OPENAI_API_KEY or GEMINI_API_KEY) found.")
}

export function serializeEmbedding(embedding: number[]): string {
  return JSON.stringify(embedding)
}

export function deserializeEmbedding(serialized: string): number[] {
  return JSON.parse(serialized)
}

/**
 * Searches user memories using native PostgreSQL pgvector cosine distance (<=>)
 * with graceful in-memory fallback for environments without pgvector extension.
 */
export async function searchUserMemories(
  userId: string,
  query: string,
  optionsOrLimit: { limit?: number; threshold?: number; category?: string } | number = {},
  thresholdParam?: number
): Promise<MemorySearchResult[]> {
  let limit = 5
  let threshold = 0.3
  let category: string | undefined

  if (typeof optionsOrLimit === "number") {
    limit = optionsOrLimit
    threshold = thresholdParam ?? 0.3
  } else if (optionsOrLimit && typeof optionsOrLimit === "object") {
    limit = optionsOrLimit.limit ?? 5
    threshold = optionsOrLimit.threshold ?? 0.3
    category = optionsOrLimit.category
  }

  let queryEmbedding: number[] | null = null
  try {
    queryEmbedding = await generateEmbedding(query)
  } catch (err) {
    console.warn("[Embedding Generation Skipped/Unavailable]:", (err as Error)?.message || err)
  }

  // 1. Attempt native database-level pgvector similarity search if embedding is available
  if (queryEmbedding && Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
    const vectorStr = `[${queryEmbedding.join(",")}]`
    try {
      const rawResults = await withDbRetry<any[]>(() =>
        prisma.$queryRaw<Array<{
          id: string
          category: string
          content: string
          similarity: number
          createdAt: Date
        }>>`
          SELECT id, category, content, "createdAt",
                 (1 - (embedding::vector <=> ${vectorStr}::vector))::float AS similarity
          FROM "UserMemory"
          WHERE "userId" = ${userId}
            AND embedding IS NOT NULL
            ${category ? Prisma.sql`AND category = ${category}` : Prisma.empty}
            AND (1 - (embedding::vector <=> ${vectorStr}::vector)) >= ${threshold}
          ORDER BY (embedding::vector <=> ${vectorStr}::vector) ASC
          LIMIT ${limit};
        `
      )

      if (rawResults && Array.isArray(rawResults) && rawResults.length > 0) {
        return rawResults.map((r) => ({
          id: r.id,
          category: r.category,
          content: r.content,
          similarity: Number(r.similarity),
          createdAt: new Date(r.createdAt),
        }))
      }
    } catch (pgError) {
      // Database didn't have pgvector or raw query syntax error, fall through to in-memory cosine
      console.warn("[pgvector fallback engaged]:", (pgError as Error)?.message || pgError)
    }
  }

  // 2. Fallback: In-memory cosine similarity or Recent Memory lookup
  const whereClause: { userId: string; category?: string } = { userId }
  if (category) whereClause.category = category

  const memories = await withDbRetry<Array<{
    id: string
    category: string
    content: string
    embedding: string | null
    createdAt: Date
  }>>(() =>
    prisma.userMemory.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: queryEmbedding ? 50 : limit,
      select: {
        id: true,
        category: true,
        content: true,
        embedding: true,
        createdAt: true,
      },
    })
  )

  // If no query embedding was generated, return recent memories directly
  if (!queryEmbedding) {
    return memories.slice(0, limit).map((m) => ({
      id: m.id,
      category: m.category,
      content: m.content,
      similarity: 1.0,
      createdAt: m.createdAt,
    }))
  }

  const results: MemorySearchResult[] = []

  for (const memory of memories) {
    if (!memory.embedding) continue

    try {
      const memoryEmbedding = deserializeEmbedding(memory.embedding)
      const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding)

      if (similarity >= threshold) {
        results.push({
          id: memory.id,
          category: memory.category,
          content: memory.content,
          similarity,
          createdAt: memory.createdAt,
        })
      }
    } catch {
      // Skip memories with invalid embeddings
      continue
    }
  }

  results.sort((a, b) => b.similarity - a.similarity)
  return results.slice(0, limit)
}

export async function embedAndSaveMemory(
  userId: string,
  content: string,
  category: string
): Promise<{ id: string; category: string; content: string }> {
  let serializedEmbedding: string | null = null
  try {
    const embedding = await generateEmbedding(content)
    serializedEmbedding = serializeEmbedding(embedding)
  } catch (err) {
    console.warn("[Save Memory Embedding skipped]:", (err as Error)?.message || err)
  }

  const memory = await withDbRetry<{ id: string; category: string; content: string }>(() =>
    prisma.userMemory.create({
      data: {
        userId,
        category,
        content,
        embedding: serializedEmbedding,
      },
    })
  )

  return memory
}