/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, after } from "next/server"
import { z } from "zod"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { ResponseUtil } from "@/lib/api-response"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { generateApplicationMaterialsAgent } from "@/lib/discovery/cover-letter-agent"
import { logDiscoveryEvent } from "@/lib/discovery/telemetry"
import { invalidateUserImplicitPreferences } from "@/lib/discovery/preferences"
import { invalidateCache } from "@/lib/redis"

const PackageInputSchema = z.object({
  companyName: z.string().trim().min(1).optional(),
  jobTitle: z.string().trim().min(1).optional(),
  jobUrl: z.string().trim().optional(),
  location: z.string().trim().optional(),
  salary: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  // Enforce distributed rate limit (30 packages / min per candidate)
  const rateLimit = await checkDistributedRateLimit(`discovery:package:${userId}`, 30, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  const { id } = await params
  if (!id) {
    return ResponseUtil.error("Opportunity ID is required", 400)
  }

  let body: z.infer<typeof PackageInputSchema> = {}
  try {
    const raw = await request.json().catch(() => ({}))
    const parsed = PackageInputSchema.safeParse(raw)
    if (parsed.success) {
      body = parsed.data
    }
  } catch {
    // Body is optional if job is fully indexed
  }

  try {
    // 1. Resolve Opportunity via UserJobMatch or CanonicalJob
    const match = await withDbRetry(() =>
      prisma.userJobMatch.findFirst({
        where: {
          userId,
          OR: [{ id }, { jobId: id }],
        },
        include: { job: true },
      })
    )

    let canonical = null
    if (!match) {
      canonical = await withDbRetry(() =>
        prisma.canonicalJob.findUnique({
          where: { id },
        })
      )
    }

    const jobData = match?.job || canonical

    const companyName = (body.companyName || jobData?.company || "").trim()
    const jobTitle = (body.jobTitle || jobData?.title || "").trim()
    const jobUrl = body.jobUrl || jobData?.url || undefined
    const location = body.location || jobData?.location || undefined
    const salary =
      body.salary ||
      jobData?.salary ||
      (jobData?.salaryMin && jobData?.salaryMax
        ? `$${jobData.salaryMin} - $${jobData.salaryMax}`
        : undefined)
    const notes =
      body.notes ||
      (match?.matchRationale
        ? `Fit Score: ${match.fitScore}%\n${match.matchRationale}`
        : "Packaged via CareerTrack Autonomous Multi-Board Job Discovery Engine")

    if (!companyName || !jobTitle) {
      return ResponseUtil.error(
        "Company name and job title could not be resolved. Please provide them in the request body.",
        400
      )
    }

    // 2. Upsert Application into STAGED status
    const existingApp = await withDbRetry(() =>
      prisma.application.findFirst({
        where: {
          userId,
          companyName: { equals: companyName, mode: "insensitive" },
          jobTitle: { equals: jobTitle, mode: "insensitive" },
        },
      })
    )

    const noteParts = [
      notes,
      location ? `Location: ${location}` : null,
      salary ? `Salary: ${salary}` : null,
    ].filter(Boolean)
    const combinedNotes = noteParts.join("\n")

    let application: any
    if (existingApp) {
      application = await withDbRetry(() =>
        prisma.application.update({
          where: { id: existingApp.id },
          data: {
            status: "STAGED",
            updatedAt: new Date(),
            jobUrl: jobUrl || existingApp.jobUrl,
            notes: combinedNotes
              ? `${existingApp.notes ? existingApp.notes + "\n\n" : ""}${combinedNotes}`
              : existingApp.notes,
            statusChanges: {
              create: {
                fromStatus: existingApp.status,
                toStatus: "STAGED",
                metadata: { reason: "Packaged & staged from Discovery Hub" },
              },
            },
          },
        })
      )
    } else {
      application = await withDbRetry(() =>
        prisma.application.create({
          data: {
            userId,
            companyName,
            jobTitle,
            jobUrl: jobUrl || null,
            source: "Discovery Engine",
            status: "STAGED",
            notes: combinedNotes || "Packaged & staged from Discovery Hub",
            applicationDate: new Date(),
            statusChanges: {
              create: {
                toStatus: "STAGED",
                metadata: { reason: "Packaged & staged from Discovery Hub" },
              },
            },
          },
        })
      )
    }

    // 3. Run Application Materials Agent to pre-populate custom cover letter, highlights, and outreach draft
    const materials = await generateApplicationMaterialsAgent(userId, application.id, {
      companyName,
      jobTitle,
      jobUrl,
      location,
      notes,
      salary,
    })

    // 4. Update UserJobMatch to isSaved: true and status: "STAGED"
    const targetJobId = match?.jobId || (canonical ? id : undefined)
    await withDbRetry(() =>
      prisma.userJobMatch.updateMany({
        where: {
          userId,
          OR: [
            { id },
            { jobId: id },
            ...(targetJobId ? [{ jobId: targetJobId }] : []),
          ],
        },
        data: {
          isSaved: true,
          status: "STAGED",
        },
      })
    ).catch((err) => {
      console.warn("[PackageAPI] Failed to update UserJobMatch status:", err)
    })

    // 5. Invalidate caches for dashboard stats, applications, and user metrics
    await Promise.allSettled([
      invalidateCache(`dashboard:stats:${userId}`),
      invalidateCache(`applications:${userId}`),
      invalidateCache(`user:stats:${userId}`),
    ])

    // 6. Non-blocking background telemetry & implicit preference learning
    const runBackgroundTasks = async () => {
      try {
        await Promise.allSettled([
          Promise.resolve(
            logDiscoveryEvent({
              userId,
              eventType: "JOB_PACKAGED",
              jobId: targetJobId || id,
              metadata: {
                companyName,
                jobTitle,
                applicationId: application.id,
                fitScore: match?.fitScore,
              },
            })
          ),
          invalidateUserImplicitPreferences(userId),
        ])
      } catch (bgErr) {
        console.warn("[PackageAPI] Non-blocking background tasks error:", bgErr)
      }
    }

    try {
      after(runBackgroundTasks)
    } catch {
      // If called outside Next.js request scope (e.g. testing environments)
      void runBackgroundTasks()
    }

    return ResponseUtil.success({
      success: true,
      applicationId: application.id,
      status: application.status,
      message: `Successfully packaged application for ${jobTitle} at ${companyName} and staged in Workbench.`,
      materials,
      application,
    })
  } catch (error: any) {
    console.error("[PackageAPI] Error packaging opportunity:", error)
    return ResponseUtil.error(
      error?.message || "Failed to package opportunity into staged application",
      500
    )
  }
}
