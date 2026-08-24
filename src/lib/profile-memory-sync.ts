import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"

export interface MemoryRecord {
  id: string
  userId: string
  category: string
  content: string
  source?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface UserProfileRecord {
  id: string
  userId: string
  phone?: string | null
  location?: string | null
  targetRoles: string[]
  workPreference?: string | null
  salaryExpectation?: string | null
  experienceLevel?: string | null
  currentStatus?: string | null
  linkedInUrl?: string | null
  githubUrl?: string | null
  portfolioUrl?: string | null
  strengths?: string | null
  weaknesses?: string | null
  weeklyHours?: number | null
  bestDays?: string | null
  noticePeriod?: string | null
  preferredIndustries?: string | null
  preferredCompanies?: string | null
}

export interface ProfileSyncResult {
  syncedCount: number
  newCount: number
  memories: MemoryRecord[]
}

/**
 * Synchronizes user's structured UserProfile fields into semantic UserMemory facts.
 * Avoids duplicate insertion.
 */
export async function syncUserProfileToMemories(userId: string): Promise<ProfileSyncResult> {
  if (!userId) return { syncedCount: 0, newCount: 0, memories: [] }

  const profile = await withDbRetry<UserProfileRecord | null>(() =>
    prisma.userProfile.findUnique({
      where: { userId },
    })
  )

  if (!profile) {
    const existing = await withDbRetry<MemoryRecord[]>(() =>
      prisma.userMemory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
    )
    return { syncedCount: existing.length, newCount: 0, memories: existing }
  }

  const factsToSeed: Array<{ category: string; content: string }> = []

  if (profile.targetRoles && profile.targetRoles.length > 0) {
    factsToSeed.push({
      category: "preference",
      content: `Target Roles: ${profile.targetRoles.join(", ")}`,
    })
  }

  if (profile.experienceLevel) {
    factsToSeed.push({
      category: "experience",
      content: `Experience Level: ${profile.experienceLevel}`,
    })
  }

  if (profile.workPreference) {
    factsToSeed.push({
      category: "preference",
      content: `Work Mode Preference: ${profile.workPreference}`,
    })
  }

  if (profile.location) {
    factsToSeed.push({
      category: "constraint",
      content: `Current Location: ${profile.location}`,
    })
  }

  if (profile.salaryExpectation) {
    factsToSeed.push({
      category: "constraint",
      content: `Target Salary Expectation: ${profile.salaryExpectation}`,
    })
  }

  if (profile.strengths) {
    factsToSeed.push({
      category: "skill",
      content: `Key Strengths: ${profile.strengths}`,
    })
  }

  if (profile.preferredIndustries) {
    factsToSeed.push({
      category: "preference",
      content: `Preferred Industries: ${profile.preferredIndustries}`,
    })
  }

  if (profile.preferredCompanies) {
    factsToSeed.push({
      category: "preference",
      content: `Dream Target Companies: ${profile.preferredCompanies}`,
    })
  }

  if (profile.noticePeriod) {
    factsToSeed.push({
      category: "constraint",
      content: `Notice Period: ${profile.noticePeriod}`,
    })
  }

  // Fetch existing memories to avoid duplicate creation
  const existingMemories = await withDbRetry<MemoryRecord[]>(() =>
    prisma.userMemory.findMany({
      where: { userId },
    })
  )

  const existingContentLower = new Set(
    existingMemories.map((m) => m.content.toLowerCase().trim())
  )

  let createdCount = 0

  for (const fact of factsToSeed) {
    if (!existingContentLower.has(fact.content.toLowerCase().trim())) {
      await withDbRetry(() =>
        prisma.userMemory.create({
          data: {
            userId,
            category: fact.category,
            content: fact.content,
            source: "profile",
          },
        })
      )
      createdCount++
    }
  }

  // Fetch fresh combined memory list
  const allMemories = await withDbRetry<MemoryRecord[]>(() =>
    prisma.userMemory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
  )

  // Invalidate Redis caches
  await Promise.all([
    invalidateCache(`user:memories:${userId}`),
    invalidateCache(`settings:bundle:${userId}`),
  ])

  return {
    syncedCount: allMemories.length,
    newCount: createdCount,
    memories: allMemories,
  }
}
