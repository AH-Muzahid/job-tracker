/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { generateEmbedding, serializeEmbedding } from "@/lib/ai/memory-search"
import { sanitizeUntrustedContext } from "@/lib/ai/context-builder"
import { invalidateCache } from "@/lib/redis"

export async function executeGetUserProfile(userId: string) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const profile = await withDbRetry<any>(() =>
      prisma.userProfile.findUnique({
        where: { userId },
      })
    )

    return {
      success: true,
      profile: profile || null,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to get user profile" }
  }
}

export async function executeUpdateUserProfile(userId: string, input: {
  skills?: string[]
  targetRoles?: string[]
  location?: string
  salaryExpectation?: string
  experienceLevel?: string
  currentStatus?: string
  linkedInUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  strengths?: string
  weaknesses?: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const profile = await withDbRetry<any>(() =>
      prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          targetRoles: input.targetRoles || [],
          location: input.location,
          salaryExpectation: input.salaryExpectation,
          experienceLevel: input.experienceLevel,
          currentStatus: input.currentStatus,
          linkedInUrl: input.linkedInUrl,
          githubUrl: input.githubUrl,
          portfolioUrl: input.portfolioUrl,
          strengths: input.strengths,
          weaknesses: input.weaknesses,
        },
        update: {
          ...(input.targetRoles !== undefined ? { targetRoles: input.targetRoles } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
          ...(input.salaryExpectation !== undefined ? { salaryExpectation: input.salaryExpectation } : {}),
          ...(input.experienceLevel !== undefined ? { experienceLevel: input.experienceLevel } : {}),
          ...(input.currentStatus !== undefined ? { currentStatus: input.currentStatus } : {}),
          ...(input.linkedInUrl !== undefined ? { linkedInUrl: input.linkedInUrl } : {}),
          ...(input.githubUrl !== undefined ? { githubUrl: input.githubUrl } : {}),
          ...(input.portfolioUrl !== undefined ? { portfolioUrl: input.portfolioUrl } : {}),
          ...(input.strengths !== undefined ? { strengths: input.strengths } : {}),
          ...(input.weaknesses !== undefined ? { weaknesses: input.weaknesses } : {}),
        },
      })
    )

    return {
      success: true,
      message: "User profile successfully updated",
      profile,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update profile" }
  }
}

export async function executeSaveUserMemory(userId: string, input: {
  category: "preference" | "skill" | "experience" | "constraint" | "general"
  content: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.content || typeof input.content !== "string") {
    return { success: false, error: "Content is required" }
  }

  const sanitizedContent = sanitizeUntrustedContext(input.content).trim()
  if (sanitizedContent.length < 3) {
    return { success: false, error: "Memory content too short or invalid after sanitization" }
  }
  if (sanitizedContent.length > 2000) {
    return { success: false, error: "Memory content exceeds maximum limit of 2000 characters" }
  }

  try {
    let serializedEmbedding: string | null = null
    try {
      const emb = await generateEmbedding(sanitizedContent)
      serializedEmbedding = serializeEmbedding(emb)
    } catch {
      // Embedding optional
    }

    const memory = await withDbRetry<any>(() =>
      prisma.userMemory.create({
        data: {
          userId,
          category: input.category || "general",
          content: sanitizedContent,
          embedding: serializedEmbedding,
          source: "chat",
          confidence: 0.85,
        },
      })
    )

    await invalidateCache(`user:memories:${userId}`)

    return {
      success: true,
      message: `Remembered: "${memory?.content || ""}"`,
      memory,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save memory" }
  }
}

export async function executeForgetUserMemory(userId: string, input: { memoryId: string }) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.memoryId) return { success: false, error: "memoryId is required" }

  try {
    await withDbRetry(() =>
      prisma.userMemory.delete({
        where: { id: input.memoryId, userId },
      })
    )

    await invalidateCache(`user:memories:${userId}`)

    return { success: true, message: "Memory forgotten successfully." }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to forget memory" }
  }
}

export async function executeGetUserMemories(userId: string, input: { category?: string } = {}) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const memories = await withDbRetry<any[]>(() =>
      prisma.userMemory.findMany({
        where: {
          userId,
          ...(input.category ? { category: input.category } : {}),
        },
        orderBy: { createdAt: "desc" },
      })
    )
    return { success: true, count: memories?.length || 0, memories: memories || [] }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to retrieve memories" }
  }
}
