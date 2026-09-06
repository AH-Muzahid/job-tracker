import { PrismaClient } from "@prisma/client"
import {
  fetchGreenhouseJobs,
  fetchRemoteOkJobs,
  fetchJobicyJobs,
  fetchArbeitnowJobs,
  fetchLinkedInGuestJobs,
  CURATED_SEED_RESERVOIR,
  DAILY_LINKEDIN_SOCIAL_POSTS,
} from "../src/lib/discovery/scrapers"
import {
  normalizeJobFingerprint,
  detectJobWorkMode,
  deduplicateJobs,
  evaluateJobScamRisk,
  detectVisaSponsorship,
  detectEmploymentType,
  isValidJobPostingUrl,
} from "../src/lib/discovery/matching"
import { processUserJobBatch } from "../src/inngest/functions/batch-job-pipeline"

const prisma = new PrismaClient()

async function main() {
  console.log("🚀 Starting Real CanonicalJob catalog seed from live ATS & remote boards...")

  // 1. Fetch real active tech jobs concurrently across Greenhouse, RemoteOK, Jobicy, Arbeitnow, LinkedIn
  const [ghRes, rokDevRes, rokReactRes, jobicyRes, arbeitDevRes, arbeitReactRes, liReactRes, liFrontendRes] = await Promise.allSettled([
    fetchGreenhouseJobs({ limitPerBoard: 15 }),
    fetchRemoteOkJobs("dev"),
    fetchRemoteOkJobs("react"),
    fetchJobicyJobs(),
    fetchArbeitnowJobs("developer"),
    fetchArbeitnowJobs("react"),
    fetchLinkedInGuestJobs("react", "Bangladesh"),
    fetchLinkedInGuestJobs("frontend", "Bangladesh"),
  ])

  const fetchedJobs: any[] = []
  if (ghRes.status === "fulfilled") {
    console.log(`Greenhouse: ${ghRes.value.length} jobs`)
    fetchedJobs.push(...ghRes.value)
  }
  if (rokDevRes.status === "fulfilled") {
    console.log(`RemoteOK (dev): ${rokDevRes.value.length} jobs`)
    fetchedJobs.push(...rokDevRes.value)
  }
  if (rokReactRes.status === "fulfilled") {
    console.log(`RemoteOK (react): ${rokReactRes.value.length} jobs`)
    fetchedJobs.push(...rokReactRes.value)
  }
  if (jobicyRes.status === "fulfilled") {
    console.log(`Jobicy: ${jobicyRes.value.length} jobs`)
    fetchedJobs.push(...jobicyRes.value)
  }
  if (arbeitDevRes.status === "fulfilled") {
    console.log(`Arbeitnow (developer): ${arbeitDevRes.value.length} jobs`)
    fetchedJobs.push(...arbeitDevRes.value)
  }
  if (arbeitReactRes.status === "fulfilled") {
    console.log(`Arbeitnow (react): ${arbeitReactRes.value.length} jobs`)
    fetchedJobs.push(...arbeitReactRes.value)
  }
  if (liReactRes.status === "fulfilled") {
    console.log(`LinkedIn (react BD): ${liReactRes.value.length} jobs`)
    fetchedJobs.push(...liReactRes.value)
  }
  if (liFrontendRes.status === "fulfilled") {
    console.log(`LinkedIn (frontend BD): ${liFrontendRes.value.length} jobs`)
    fetchedJobs.push(...liFrontendRes.value)
  }

  // Include curated verified remote jobs AND organic LinkedIn founder hiring posts
  fetchedJobs.push(...CURATED_SEED_RESERVOIR)
  fetchedJobs.push(...DAILY_LINKEDIN_SOCIAL_POSTS)

  // Deduplicate and filter dead links
  const combined = deduplicateJobs(fetchedJobs).filter((j) => isValidJobPostingUrl(j.url))
  console.log(`Total unique verified opportunities: ${combined.length}`)

  // 2. Clean out old fake placeholder jobs with generic /careers or homepage URLs
  console.log("🧹 Purging old placeholder jobs with generic URLs...")
  const deletedOld = await prisma.canonicalJob.deleteMany({
    where: {
      OR: [
        { url: { endsWith: "/careers" } },
        { url: { endsWith: "/career" } },
        { url: { endsWith: "/work-with-us" } },
        { url: { equals: "https://remoteok.com" } },
        { url: { equals: "https://stripe.com/jobs" } },
      ],
    },
  })
  console.log(`Purged ${deletedOld.count} fake placeholder jobs.`)

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let inserted = 0

  for (const job of combined) {
    const workMode = detectJobWorkMode(job)
    const isRemote = workMode === "remote" || Boolean(job.isRemote)
    const fingerprint = normalizeJobFingerprint(job.company, job.title, job.location, isRemote)
    const scamEval = evaluateJobScamRisk(job)
    const visaSponsorship = job.visaSponsorship || detectVisaSponsorship(job.description, job.title)
    const employmentType = detectEmploymentType({
      title: job.title,
      description: job.description || "",
      tags: job.tags || [],
    })
    const postedAtDate = job.postedAt ? new Date(job.postedAt) : now
    const validPostedAt = isNaN(postedAtDate.getTime()) ? now : postedAtDate

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
        postedAt: validPostedAt,
        expiresAt: thirtyDaysFromNow,
        isExpired: scamEval.isSuspicious,
        scamScore: scamEval.scamScore,
        visaSponsorship,
        employmentType,
      },
      update: {
        url: job.url,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote,
        tags: job.tags && job.tags.length > 0 ? job.tags : undefined,
        description: job.description || undefined,
        postedAt: validPostedAt,
        expiresAt: thirtyDaysFromNow,
        isExpired: scamEval.isSuspicious,
        scamScore: scamEval.scamScore,
        visaSponsorship: visaSponsorship !== "unknown" ? visaSponsorship : undefined,
        employmentType,
      },
    })
    inserted++
  }

  console.log(`✅ Successfully seeded ${inserted} real canonical jobs into database!`)

  // 3. Clear published UserJobMatch so users get re-matched with real jobs
  const clearedMatches = await prisma.userJobMatch.deleteMany({
    where: { isSaved: false },
  })
  console.log(`Cleared ${clearedMatches.count} unsaved user matches to trigger fresh real matches.`)

  // 4. Trigger fresh published batch generation for active users
  const users = await prisma.user.findMany({ select: { id: true } })
  for (const u of users) {
    console.log(`Generating fresh published batch for userId=${u.id}...`)
    await processUserJobBatch(u.id, { forceImmediatePublish: true, notify: false })
  }
  console.log("🎉 Seeding & matching completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

