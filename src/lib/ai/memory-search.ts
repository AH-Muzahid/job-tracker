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
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for embedding generation")
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
      dimensions: 1536,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate embedding: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
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
  options: { limit?: number; threshold?: number; category?: string } = {}
): Promise<MemorySearchResult[]> {
  const { limit = 5, threshold = 0.3, category } = options
  const queryEmbedding = await generateEmbedding(query)
  const vectorStr = `[${queryEmbedding.join(",")}]`

  // 1. Attempt native database-level pgvector similarity search
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

  // 2. Fallback: In-memory cosine similarity
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
      select: {
        id: true,
        category: true,
        content: true,
        embedding: true,
        createdAt: true,
      },
    })
  )

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
  const embedding = await generateEmbedding(content)
  const serializedEmbedding = serializeEmbedding(embedding)

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