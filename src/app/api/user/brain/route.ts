/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"
import { z } from "zod"

export interface BrainDossierResponse {
  profile: {
    fullName: string
    title: string
    strengths: string[]
    bestProjects: Array<{ name: string; stack?: string; description?: string }>
    targetSalary?: string | null
    targetLocations?: string[]
  }
  nonNegotiables: Array<{ id: string; content: string; createdAt: string }>
  verifiedMetrics: Array<{ id: string; content: string; source?: string; createdAt: string }>
  interviewGaps: {
    active: Array<{ id: string; content: string; confidence?: number; createdAt: string }>
    resolved: Array<{ id: string; content: string; createdAt: string }>
  }
  stylePreferences: Array<{ id: string; content: string; createdAt: string }>
  knowledgeGraph: {
    nodesCount: number
    edgesCount: number
    summary?: string | null
    topNodes: Array<{ id: string; label: string; type: string; weight?: number }>
  }
}

export async function GET() {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [user, memories, knowledgeGraph] = await Promise.all([
      withDbRetry(() =>
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            profile: {
              select: {
                targetRoles: true,
                strengths: true,
                bestProjects: true,
                salaryExpectation: true,
                location: true,
              },
            },
          },
        })
      ),
      withDbRetry(() =>
        prisma.userMemory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        })
      ) as Promise<Array<{ id: string; category: string; content: string; source?: string | null; confidence?: number | null; createdAt: Date }>>,
      withDbRetry(() =>
        prisma.careerKnowledgeGraph.findUnique({
          where: { userId },
          select: {
            nodes: true,
            edges: true,
            summary: true,
          },
        })
      ),
    ])

    const nonNegotiables: BrainDossierResponse["nonNegotiables"] = []
    const verifiedMetrics: BrainDossierResponse["verifiedMetrics"] = []
    const activeGaps: BrainDossierResponse["interviewGaps"]["active"] = []
    const resolvedGaps: BrainDossierResponse["interviewGaps"]["resolved"] = []
    const stylePreferences: BrainDossierResponse["stylePreferences"] = []

    for (const mem of memories || []) {
      const cat = mem.category.toLowerCase().trim()
      const item = {
        id: mem.id,
        content: mem.content,
        createdAt: mem.createdAt.toISOString(),
      }

      if (cat === "constraint" || cat === "non_negotiable") {
        nonNegotiables.push(item)
      } else if (cat === "experience" || cat === "metric" || cat === "proof") {
        verifiedMetrics.push({ ...item, source: mem.source || "dossier" })
      } else if (cat === "weakness") {
        activeGaps.push({ ...item, confidence: mem.confidence ?? undefined })
      } else if (cat === "resolved_weakness") {
        resolvedGaps.push(item)
      } else if (cat === "preference" || cat === "style") {
        stylePreferences.push(item)
      } else {
        // general falls into verified metrics or non-negotiables based on content
        if (mem.content.toLowerCase().includes("must") || mem.content.toLowerCase().includes("minimum")) {
          nonNegotiables.push(item)
        } else {
          verifiedMetrics.push({ ...item, source: mem.source || "general" })
        }
      }
    }

    // Process Knowledge Graph Nodes
    const rawNodes = Array.isArray(knowledgeGraph?.nodes) ? (knowledgeGraph.nodes as any[]) : []
    const rawEdges = Array.isArray(knowledgeGraph?.edges) ? (knowledgeGraph.edges as any[]) : []

    const topNodes = rawNodes.slice(0, 15).map((n) => ({
      id: String(n.id || n.label),
      label: String(n.label || n.name || "Skill"),
      type: String(n.type || "skill"),
      weight: typeof n.weight === "number" ? n.weight : undefined,
    }))

    const strengthsList = user?.profile?.strengths
      ? user.profile.strengths.split(/[,/|\n]+/).map((s: string) => s.trim()).filter(Boolean)
      : []

    const bestProjects = Array.isArray(user?.profile?.bestProjects)
      ? (user.profile.bestProjects as any[])
      : []

    const response: BrainDossierResponse = {
      profile: {
        fullName: user?.name || "Candidate",
        title: user?.profile?.targetRoles?.[0] || "Software Engineer",
        strengths: strengthsList,
        bestProjects,
        targetSalary: user?.profile?.salaryExpectation || null,
        targetLocations: user?.profile?.location ? [user.profile.location] : [],
      },
      nonNegotiables,
      verifiedMetrics,
      interviewGaps: {
        active: activeGaps,
        resolved: resolvedGaps,
      },
      stylePreferences,
      knowledgeGraph: {
        nodesCount: rawNodes.length,
        edgesCount: rawEdges.length,
        summary: knowledgeGraph?.summary || null,
        topNodes,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[GET /api/user/brain] Error:", error)
    return NextResponse.json({ error: "Failed to load Career Brain dossier" }, { status: 500 })
  }
}

const createBrainMemorySchema = z.object({
  category: z.enum(["constraint", "experience", "preference", "weakness"]),
  content: z.string().min(3).max(1000),
})

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const json = await request.json()
    const parsed = createBrainMemorySchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { category, content } = parsed.data

    const newRecord = await withDbRetry(() =>
      prisma.userMemory.create({
        data: {
          userId,
          category,
          content: content.trim(),
          source: "user_brain_dossier",
          confidence: 1.0,
        },
      })
    )

    await Promise.all([
      invalidateCache(`user:memories:${userId}`),
      invalidateCache(`settings:bundle:${userId}`),
    ])

    return NextResponse.json(newRecord, { status: 201 })
  } catch (error) {
    console.error("[POST /api/user/brain] Error:", error)
    return NextResponse.json({ error: "Failed to save to Career Brain" }, { status: 500 })
  }
}

const deleteMemorySchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    const parsed = deleteMemorySchema.safeParse({ id })
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid memory ID is required" }, { status: 400 })
    }

    // Tenant isolation: verify userId matches
    const memory = await withDbRetry(() =>
      prisma.userMemory.findFirst({
        where: { id: parsed.data.id, userId },
      })
    )

    if (!memory) {
      return NextResponse.json({ error: "Memory item not found or unauthorized" }, { status: 404 })
    }

    await withDbRetry(() =>
      prisma.userMemory.delete({
        where: { id: parsed.data.id },
      })
    )

    await Promise.all([
      invalidateCache(`user:memories:${userId}`),
      invalidateCache(`settings:bundle:${userId}`),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/user/brain] Error:", error)
    return NextResponse.json({ error: "Failed to delete from Career Brain" }, { status: 500 })
  }
}
