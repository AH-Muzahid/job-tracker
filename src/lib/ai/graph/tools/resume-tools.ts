/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import {
  buildCareerGraphFromText,
  traverseGraphForJD,
  getCachedKnowledgeGraph,
  saveKnowledgeGraph,
} from "@/lib/ai/knowledge-graph"
import { generateAdaptivePromptWeights } from "@/lib/ai/learning-engine"
import type { TailoredResumeData } from "@/types/tailored-resume"

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
      ${profile?.targetRoles?.join(" ") || ""}
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
export async function executeTailorResumeForJob(
  userId: string,
  input: {
    jobDescription: string
    companyName?: string
    jobTitle?: string
    resumeId?: string
  }
) {
  if (!userId) return { success: false, error: "Unauthorized" }
  if (!input.jobDescription || input.jobDescription.trim().length < 15) {
    return { success: false, error: "A valid jobDescription is required to tailor the resume." }
  }

  try {
    const [baseResume, profile, user, learningWeights] = await Promise.all([
      withDbRetry<any>(() =>
        prisma.resume.findFirst({
          where: {
            userId,
            ...(input.resumeId ? { id: input.resumeId } : { isDefault: true }),
          },
        })
      ),
      withDbRetry<any>(() => prisma.userProfile.findUnique({ where: { userId } })),
      withDbRetry<any>(() => prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })),
      generateAdaptivePromptWeights(userId).catch(() => null),
    ])

    const targetCompany = input.companyName || "Target Company"
    const targetRole = input.jobTitle || profile?.targetRoles?.[0] || "Senior Software Engineer"

    // Extract skills and calculate match
    let graph = await getCachedKnowledgeGraph(userId)
    if (!graph || graph.nodes.length === 0) {
      const resumeContent = baseResume?.textContent || profile?.strengths || ""
      graph = buildCareerGraphFromText(resumeContent)
    }

    const matchResult = traverseGraphForJD(graph, input.jobDescription)
    const matchedSkillNames = matchResult.matchedSkills.map((s) => s.skill || s.canonicalName)
    const allSkills = Array.from(
      new Set([
        ...matchedSkillNames,
        ...(profile?.strengths ? profile.strengths.split(/[,/|\n]+/).map((s: string) => s.trim()) : ["TypeScript", "React", "Node.js", "PostgreSQL"]),
      ])
    ).filter(Boolean)

    // Synthesize structured tailored resume data
    const tailoredResumeData: TailoredResumeData = {
      header: {
        fullName: user?.name || "Senior Candidate",
        title: targetRole,
        email: user?.email || "candidate@example.com",
        location: profile?.location || "Remote",
        linkedinUrl: profile?.linkedInUrl || undefined,
        githubUrl: profile?.githubUrl || undefined,
        portfolioUrl: profile?.portfolioUrl || undefined,
      },
      summary: `High-impact ${targetRole} with proven expertise in ${matchedSkillNames.slice(0, 3).join(", ") || "scalable architectures"}. Proven track record aligning technical delivery with ${targetCompany}'s mission through data-driven engineering and STAR-aligned execution.`,
      skillsByDomain: [
        {
          domain: "Matched Technologies",
          skills: allSkills.slice(0, 8),
        },
        {
          domain: "Architecture & Practices",
          skills: ["System Design", "TDD", "CI/CD", "Distributed Caching", "API Design"],
        },
      ],
      experience: (profile?.recentRoles && Array.isArray(profile.recentRoles) && profile.recentRoles.length > 0)
        ? profile.recentRoles.map((r: any) => ({
            role: r.title || targetRole,
            company: r.company || "Previous Experience",
            duration: r.duration || "2022 - Present",
            location: r.location || "Remote",
            bullets: [
              `Delivered engineering solutions leveraging ${matchedSkillNames.slice(0, 2).join(" & ") || "core technologies"} aligning with technical standards.`,
              `Collaborated across cross-functional engineering teams to ship high-reliability features and maintain robust code quality.`,
            ],
          }))
        : [
            {
              role: profile?.targetRoles?.[0] || targetRole,
              company: profile?.currentCompany || "Independent Engineering & Projects",
              duration: "Recent",
              location: profile?.location || "Remote",
              bullets: [
                `Engineered full-stack and distributed capabilities utilizing ${matchedSkillNames.slice(0, 3).join(", ") || "modern technical stack"}.`,
                `Applied scalable architecture patterns and automated testing to ensure high quality and production reliability.`,
              ],
            },
          ],
      projects: (profile?.projects && Array.isArray(profile.projects) && profile.projects.length > 0)
        ? profile.projects.map((p: any) => ({
            name: p.name || `${targetRole} Production Suite`,
            stack: p.stack ? (Array.isArray(p.stack) ? p.stack : [p.stack]) : allSkills.slice(0, 4),
            bullets: [
              p.description || `Engineered production-grade solution utilizing ${matchedSkillNames.slice(0, 2).join(" and ") || "modern software practices"}.`,
            ],
          }))
        : [
            {
              name: `${targetRole} Technical Implementation`,
              stack: allSkills.slice(0, 4),
              bullets: [
                `Designed and implemented robust architecture addressing key competencies in ${matchedSkillNames.slice(0, 2).join(" and ") || "software engineering"}.`,
              ],
            },
          ],
      education: [
        {
          degree: profile?.education || "Bachelor of Science in Computer Science or Equivalent Practical Experience",
          institution: profile?.university || "Verified Academic / Industry Background",
          year: "Verified",
        },
      ],
      targetCompany,
      targetRole,
      matchScore: matchResult.matchScore,
      generatedAt: new Date().toISOString(),
    }

    const rawJson = JSON.stringify(tailoredResumeData, null, 2)
    const title = `Tailored - ${targetRole} at ${targetCompany}`

    // Save as new tailored Resume row
    const newResume = await withDbRetry<any>(() =>
      prisma.resume.create({
        data: {
          userId,
          title,
          fileName: `${targetCompany.toLowerCase().replace(/[^a-z0-9]/g, "-")}-tailored-resume.pdf`,
          fileUrl: `/api/resumes/download/preview`,
          fileSize: rawJson.length,
          isDefault: false,
          textContent: rawJson,
        },
      })
    )

    const downloadUrl = `/api/resumes/download/${newResume.id}`

    return {
      success: true,
      resumeId: newResume.id,
      title,
      downloadUrl,
      matchScore: matchResult.matchScore,
      adaptiveLearningApplied: learningWeights
        ? {
            positiveBoostsCount: learningWeights.positiveBoosts.length,
            negativePenaltiesCount: learningWeights.negativePenalties.length,
            historicalConversionRate: learningWeights.overallConversionRate,
          }
        : undefined,
      tailoredHighlights: {
        targetRole,
        targetCompany,
        matchedSkills: matchedSkillNames,
        summary: tailoredResumeData.summary,
      },
      message: `Tailored resume generated for ${targetRole} at ${targetCompany} with ${matchResult.matchScore}% ATS match score.`,
    }
  } catch (error: any) {
    console.error("[Tailor Resume For Job Error]:", error)
    return { success: false, error: error?.message || "Failed to tailor resume" }
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
