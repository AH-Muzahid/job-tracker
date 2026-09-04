import { PrismaClient } from "@prisma/client"
import {
  CURATED_SEED_RESERVOIR,
  DAILY_LINKEDIN_SOCIAL_POSTS,
} from "../src/lib/discovery/scrapers"
import {
  normalizeJobFingerprint,
  detectJobWorkMode,
  deduplicateJobs,
} from "../src/lib/discovery/matching"

const prisma = new PrismaClient()

async function main() {
  console.log("?? Starting CanonicalJob catalog seed...")

  const combined = deduplicateJobs([...CURATED_SEED_RESERVOIR, ...DAILY_LINKEDIN_SOCIAL_POSTS])
  console.log(`Found ${combined.length} initial seed opportunities.`)

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let inserted = 0

  for (const job of combined) {
    const workMode = detectJobWorkMode(job)
    const isRemote = workMode === "remote"
    const fingerprint = normalizeJobFingerprint(job.company, job.title, job.location, isRemote)

    await prisma.canonicalJob.upsert({
      where: { fingerprint },
      create: {
        fingerprint,
        sourceBoard: job.sourceBoard,
        externalId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote,
        url: job.url,
        salary: job.salaryText || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : null),
        salaryMin: job.salaryMin || null,
        salaryMax: job.salaryMax || null,
        tags: job.tags || [],
        description: job.description || null,
        postedAt: now,
        expiresAt: thirtyDaysFromNow,
        isExpired: false,
      },
      update: {
        url: job.url,
        salary: job.salaryText || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : undefined),
        salaryMin: job.salaryMin || undefined,
        salaryMax: job.salaryMax || undefined,
        tags: job.tags && job.tags.length > 0 ? job.tags : undefined,
        description: job.description || undefined,
        expiresAt: thirtyDaysFromNow,
        isExpired: false,
      },
    })
    inserted++
  }

  console.log(`Successfully seeded ${inserted} canonical jobs into database!`)
}

main()
  .catch((e) => {
    console.error("? Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
