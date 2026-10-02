import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { checkDistributedRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { prisma, withDbRetry } from "@/lib/prisma"
import {
  extractSkillsFromJobData,
  diffSkillsAgainstProfile,
  calculateGapHeatmap,
  generateLearningRoadmap,
  analyzeJobSkillGapsTargeted,
  type JobSkillSource,
} from "@/lib/ai/upskill-engine"
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { z } from "zod"

export const dynamic = "force-dynamic"

const TargetedUpskillSchema = z.object({
  jobId: z.string().optional(),
  jobDescription: z.string().optional(),
})

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkDistributedRateLimit(`upskill:${userId}`, 30, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  try {
    // 1. Gather Candidate Profile Skills from CareerKnowledgeGraph & UserMemory
    const knowledgeGraph = await withDbRetry(() =>
      prisma.careerKnowledgeGraph.findUnique({
        where: { userId },
        select: { nodes: true },
      })
    )
    const userMemories = await withDbRetry(() =>
      prisma.userMemory.findMany({
        where: { userId, category: "skill" },
        select: { content: true },
      })
    )

    const candidateSkills = new Set<string>()

    if (knowledgeGraph?.nodes && Array.isArray(knowledgeGraph.nodes)) {
      for (const node of knowledgeGraph.nodes as Array<{ name?: string; canonicalName?: string }>) {
        if (node.canonicalName) candidateSkills.add(node.canonicalName)
        else if (node.name) candidateSkills.add(toCanonical(node.name))
      }
    }

    if (userMemories && Array.isArray(userMemories)) {
      for (const mem of userMemories) {
        if (mem.content) candidateSkills.add(toCanonical(mem.content))
      }
    }

    // 2. Fetch User's Saved Opportunities, Applications, and Unqualified Dismissals
    const [savedMatches, applications, unqualifiedDismissals] = await Promise.all([
      withDbRetry(() =>
        prisma.userJobMatch.findMany({
          where: { userId, isSaved: true },
          include: { job: true },
          take: 75,
        })
      ),
      withDbRetry(() =>
        prisma.application.findMany({
          where: { userId },
          take: 75,
        })
      ),
      withDbRetry(() =>
        prisma.userJobMatch.findMany({
          where: { userId, dismissReason: "unqualified" },
          include: { job: true },
          take: 50,
        })
      ),
    ])

    const jobSources: JobSkillSource[] = []

    // Map saved matches
    for (const match of savedMatches) {
      if (match.job) {
        jobSources.push({
          id: match.job.id,
          title: match.job.title,
          company: match.job.company,
          fitScore: match.fitScore,
          explicitSkills: match.job.tags,
          description: match.job.description || undefined,
        })
      }
    }

    // Map applications
    for (const app of applications) {
      jobSources.push({
        id: app.id,
        title: app.jobTitle,
        company: app.companyName,
        fitScore: 75,
        notes: app.notes || undefined,
      })
    }

    // Map unqualified dismissals (high weight on gaps)
    for (const match of unqualifiedDismissals) {
      if (match.job) {
        jobSources.push({
          id: match.job.id,
          title: match.job.title,
          company: match.job.company,
          fitScore: match.fitScore || 35,
          explicitSkills: match.job.tags,
          description: match.job.description || undefined,
        })
      }
    }

    const candidateSkillArray = [...candidateSkills]

    // 3. Run Upskill Aggregation Pipeline
    const extractedGaps = extractSkillsFromJobData(jobSources)
    const diffedGaps = diffSkillsAgainstProfile(extractedGaps, candidateSkillArray)
    const heatmap = calculateGapHeatmap(diffedGaps)
    const roadmap = generateLearningRoadmap(heatmap, candidateSkillArray)

    return NextResponse.json({
      success: true,
      heatmap,
      roadmap,
      stats: {
        totalAnalyzedJobs: jobSources.length,
        totalIdentifiedGaps: heatmap.length,
        candidateKnownSkillsCount: candidateSkillArray.length,
      },
    })
  } catch (error) {
    console.error("[UpskillAggregateRouteError]:", error)
    return NextResponse.json(
      { error: "Internal server error analyzing career skill gaps" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateLimit = await checkDistributedRateLimit(`upskill:${userId}`, 30, 60)
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const validation = TargetedUpskillSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: validation.error.flatten() },
      { status: 400 }
    )
  }

  const { jobId, jobDescription } = validation.data
  if (!jobId && !jobDescription) {
    return NextResponse.json(
      { error: "Either jobId or jobDescription must be provided" },
      { status: 400 }
    )
  }

  try {
    // Fetch candidate skills
    const knowledgeGraph = await withDbRetry(() =>
      prisma.careerKnowledgeGraph.findUnique({
        where: { userId },
        select: { nodes: true },
      })
    )

    const candidateSkills = new Set<string>()
    if (knowledgeGraph?.nodes && Array.isArray(knowledgeGraph.nodes)) {
      for (const node of knowledgeGraph.nodes as Array<{ name?: string; canonicalName?: string }>) {
        if (node.canonicalName) candidateSkills.add(node.canonicalName)
        else if (node.name) candidateSkills.add(toCanonical(node.name))
      }
    }

    let descriptionText = jobDescription || ""
    if (jobId && !descriptionText) {
      const job = await withDbRetry(() =>
        prisma.canonicalJob.findUnique({
          where: { id: jobId },
          select: { description: true, tags: true, title: true },
        })
      )
      if (job) {
        descriptionText = `${job.title} ${job.tags.join(" ")} ${job.description || ""}`
      }
    }

    const candidateSkillArray = [...candidateSkills]
    const targetedResult = analyzeJobSkillGapsTargeted(descriptionText, candidateSkillArray)

    // Generate learning roadmap for the targeted missing skills
    const mappedGaps = targetedResult.missingSkills.map((s) => ({
      name: s.name,
      canonical: s.canonical,
      category: s.category,
      count: 1,
      weightedScore: 1.0,
      provenance: "recorded_gap" as const,
      sampleJobs: ["Targeted Posting"],
    }))

    const roadmap = generateLearningRoadmap(mappedGaps, candidateSkillArray)

    return NextResponse.json({
      success: true,
      targeted: targetedResult,
      roadmap,
    })
  } catch (error) {
    console.error("[UpskillTargetedRouteError]:", error)
    return NextResponse.json(
      { error: "Internal server error performing targeted skill gap analysis" },
      { status: 500 }
    )
  }
}
