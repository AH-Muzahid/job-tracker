/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import {
  buildCareerGraphFromText,
  traverseGraphForJD,
  getCachedKnowledgeGraph,
  saveKnowledgeGraph,
} from "@/lib/ai/knowledge-graph"
import { buildVerifiedResume, ResumeRequestSchema } from "@/lib/ai/verified-resume"

export async function executeGetResumeDetails(userId: string, input: {
  resumeId?: string
}) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const resumes = await withDbRetry<any[]>(() =>
      prisma.resume.findMany({
        where: {
          userId,
          ...(input.resumeId ? { id: input.resumeId } : {}),
        },
        orderBy: { isDefault: "desc" },
        take: 3,
      })
    )

    if (resumes.length === 0) {
      return { success: false, message: "No resumes found on profile." }
    }

    return {
      success: true,
      resumes: resumes.map((r) => ({
        id: r.id,
        title: r.title,
        fileName: r.fileName,
        isDefault: r.isDefault,
        textLength: r.textContent ? r.textContent.length : 0,
      })),
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch resume details" }
  }
}

export async function executeSyncCareerKnowledgeGraph(userId: string) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const resume = await withDbRetry<any>(() =>
      prisma.resume.findFirst({
        where: { userId, isDefault: true },
      })
    )

    const profile = await withDbRetry<any>(() =>
      prisma.userProfile.findUnique({
        where: { userId },
      })
    )

    const combinedText = `
      ${resume?.textContent || ""}
      ${profile?.strengths || ""}
    `.trim()

    if (!combinedText) {
      return {
        success: false,
        message: "No resume or profile data available to build knowledge graph.",
      }
    }

    const graph = buildCareerGraphFromText(combinedText)
    await saveKnowledgeGraph(userId, graph)

    return {
      success: true,
      message: `Knowledge graph successfully synced with ${graph.nodes.length} nodes and ${graph.edges.length} relationships.`,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      graph,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to sync career knowledge graph" }
  }
}

export async function executeQueryCareerKnowledgeGraph(userId: string, input: { jobDescription: string }) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.jobDescription) return { success: false, error: "jobDescription is required" }

  try {
    const graph = await getCachedKnowledgeGraph(userId)
    if (!graph || graph.nodes.length === 0) {
      return {
        success: false,
        message: "Career knowledge graph not built yet. Please sync your resume first.",
      }
    }

    const matchResult = traverseGraphForJD(graph, input.jobDescription)
    return {
      success: true,
      matchResult,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to query career knowledge graph" }
  }
}

/**
 * Generates an ATS-optimized tailored resume for a specific Job Description and renders a downloadable PDF
 */
export async function executeTailorResumeForJob(userId: string, input: { jobDescription: string; companyName?: string; jobTitle?: string; resumeId?: string; applicationId?: string }) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.applicationId) return { success: false, error: "Select an application before saving a tailored resume.", retryable: false }
  const parsed = ResumeRequestSchema.safeParse({ jdText: input.jobDescription, targetRole: input.jobTitle, targetCompany: input.companyName, resumeId: input.resumeId, applicationId: input.applicationId })
  if (!parsed.success) return { success: false, error: "Invalid resume request", retryable: false }
  try {
    const result = await buildVerifiedResume(userId, parsed.data)
    return { success: true, ...result, title: `Resume for ${result.data.targetRole || "application"}`, companyName: result.data.targetCompany, role: result.data.targetRole, summary: result.data.summary, highlights: result.data.projects.flatMap((p) => p.bullets), downloadUrl: `/applications/${result.applicationId}`, tailoredHighlights: { targetRole: result.data.targetRole, targetCompany: result.data.targetCompany, summary: result.data.summary }, message: "Candidate-provided resume facts saved to the application package." }
  } catch (error) {
    return { success: false, error: error instanceof Error && error.message.startsWith("Add your resume") ? error.message : "Unable to prepare resume. Verify your application and retry.", retryable: false }
  }
}

export async function executeGetResumeSummary(userId: string) {
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const resume = await withDbRetry<any>(() =>
      prisma.resume.findFirst({
        where: { userId, isDefault: true },
        select: { id: true, title: true, fileName: true, textContent: true },
      })
    )

    if (!resume) {
      return { success: false, message: "No default resume found on profile." }
    }

    const excerpt = resume.textContent ? resume.textContent.slice(0, 1000) : "No text content"

    return {
      success: true,
      resumeId: resume.id,
      title: resume.title,
      fileName: resume.fileName,
      summaryExcerpt: excerpt,
      message: `Default resume "${resume.title}" retrieved.`,
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to fetch resume summary" }
  }
}
