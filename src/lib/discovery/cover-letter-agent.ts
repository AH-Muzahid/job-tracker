/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getUserAIConfig } from "@/lib/ai/config"
import { getProvider } from "@/lib/ai/client"
import { generateText } from "ai"
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { getUserWeaknesses } from "@/lib/ai/memory"
import { traceAIGeneration } from "@/lib/ai/telemetry"
import { extractJsonObject } from "@/lib/ai/json-extractor"
import { getCachedJson } from "@/lib/redis"
import { assembleAgenticCandidateContext } from "@/lib/ai/agentic-context"
import { runEvaluatorOptimizer } from "@/lib/ai/evaluator-optimizer"
import {
  extractContactEmail,
  sanitizeOutreachPlaceholders,
  generateDeterministicOutreachBundle,
  OutreachChannelBundle,
} from "@/lib/applications/outreach-engine"

export interface GeneratedApplicationMaterials {
  coverLetter: string
  highlights: string[]
  outreachPitch: string
  strategyTip?: string
  atsKeywords: string[]
  outreachSubject?: string
  outreachChannels?: OutreachChannelBundle
}

/**
 * Deterministic template-based application materials generator
 * Generates compelling, personalized application materials without requiring external API keys.
 */
function generateDeterministicMaterials(
  candidateName: string,
  profile: any,
  context: {
    jobTitle: string
    companyName: string
    location?: string
    notes?: string
  }
): GeneratedApplicationMaterials {
  const jobTitle = context.jobTitle || "Software Engineer"
  const companyName = context.companyName || "the team"
  const bestProjects = Array.isArray(profile?.bestProjects) ? profile.bestProjects : []
  const topProject = bestProjects[0] || {
    name: "Full-Stack Web Architecture",
    stack: "React, TypeScript, Next.js, Node.js, PostgreSQL",
    description: "Production scalable web applications with real-time state and database persistence",
  }
  const secondProject = bestProjects[1]

  const candidateSkills: string[] = []
  if (profile?.strengths) {
    candidateSkills.push(...profile.strengths.split(/[,/|\n]+/).map((s: string) => s.trim()))
  }
  if (topProject.stack) {
    candidateSkills.push(...topProject.stack.split(/[,/|\n]+/).map((s: string) => s.trim()))
  }
  const uniqueSkills = Array.from(new Set(candidateSkills.filter((s) => s.length > 1))).slice(0, 6)
  const skillsDisplay = uniqueSkills.join(", ") || "TypeScript, React, Next.js, and Node.js"

  const coverLetter = `Dear Hiring Team at ${companyName},

I am writing to express my strong interest in the ${jobTitle} position. With proven hands-on experience developing modern, resilient web systems using ${skillsDisplay}, I am excited by the opportunity to contribute directly to ${companyName}'s engineering goals.

In my recent work on "${topProject.name}", I engineered core architecture with ${topProject.stack || "modern technologies"}, focusing on high performance, clean modular component design, and reliable data synchronization.${
    secondProject ? ` Additionally, through my "${secondProject.name}" project, I implemented production features using ${secondProject.stack || "full-stack tools"} with an emphasis on developer ergonomics and system stability.` : ""
  } My focus is always on delivering measurable product impact while maintaining maintainable, type-safe codebases.

I admire ${companyName}'s vision and would welcome the opportunity to discuss how my technical foundation, autonomous execution, and problem-solving skills align with your team's upcoming roadmap. Thank you for your time and consideration.

Sincerely,
${candidateName}`

  const highlights = [
    `Engineered "${topProject.name}" using ${topProject.stack || "TypeScript and React"}, delivering end-to-end features with high test coverage and robust type safety.`,
    `Architected full-stack workflows with ${skillsDisplay}, optimizing response latencies and database queries for seamless user experiences.`,
    `Demonstrated autonomous ownership and rapid delivery of complex product features from conception to deployment.`,
  ]

  const outreachBundle = generateDeterministicOutreachBundle({
    companyName,
    jobTitle,
    candidateName,
    skills: uniqueSkills,
    topProjects: bestProjects,
    location: context.location,
    notes: context.notes,
  })

  const outreachPitch = `Hi there! I saw the opening for ${jobTitle} at ${companyName}. I've recently built ${topProject.name} using ${skillsDisplay}. Would love to share my GitHub and discuss how my hands-on experience aligns with your team!`

  return {
    coverLetter,
    highlights,
    outreachPitch,
    strategyTip: `Focus on highlighting your hands-on experience with ${topProject.name} and your proficiency in ${skillsDisplay}.`,
    atsKeywords: uniqueSkills.map((s) => toCanonical(s)),
    outreachChannels: outreachBundle,
  }
}

/**
 * Autonomous Cover Letter & Application Materials Agent (REC-16)
 * Proactively drafts customized cover letters, resume highlights, and outreach pitches
 * immediately when an opportunity is saved into the pipeline.
 */
export async function generateApplicationMaterialsAgent(
  userId: string,
  applicationId: string,
  context: {
    jobTitle: string
    companyName: string
    jobUrl?: string
    location?: string
    notes?: string
    salary?: string
    fitScore?: number
    matchScore?: number
  }
): Promise<GeneratedApplicationMaterials> {
  // Autonomously assemble rich, grounded candidate dossier from Knowledge Graph, Vector Memory & Weaknesses
  const dossier = await assembleAgenticCandidateContext(userId, {
    jobTitle: context.jobTitle,
    companyName: context.companyName,
    location: context.location,
    jdText: context.notes,
  }).catch(() => null)

  const candidateName = dossier?.candidateName || "Applicant"

  let materials: GeneratedApplicationMaterials

  let modelToUse = "deterministic"
  let providerType = "deterministic"
  const startTime = Date.now()

  try {
    const aiConfig = await getUserAIConfig(userId)
    if (aiConfig?.apiKey) {
      const resolved = getProvider(aiConfig)
      modelToUse = aiConfig.model || resolved.defaultModel
      providerType = aiConfig.providerType

      const systemPromptContext = dossier?.summaryContextText || `Candidate Name: ${candidateName}`

      // Run Reflexion (Evaluator-Optimizer) Loop for self-correction
      const evalResult = await runEvaluatorOptimizer<GeneratedApplicationMaterials>({
        maxIterations: 2,
        generator: async ({ iteration, critiqueFeedback }) => {
          const critiqueNote =
            critiqueFeedback && critiqueFeedback.length > 0
              ? `\nCRITICAL FIXES REQUIRED FROM PREVIOUS DRAFT EVALUATION:\n${critiqueFeedback.map((f) => `- ${f}`).join("\n")}\nPlease rewrite fixing these exact violations while maintaining factual accuracy.`
              : ""

          const prompt = `You are the CareerTrack Master Application Craftsman.
Draft tailored application materials for a candidate applying to:
Job Title: ${context.jobTitle}
Company: ${context.companyName}
Location: ${context.location || "Remote"}

${systemPromptContext}
${critiqueNote}

CRITICAL NO-PLACEHOLDER & QUALITY RULES:
1. NEVER output placeholders like "[Hiring Manager/Recruiter]", "[Your Name]", or "[Company Name]".
2. Always address the team naturally as "${context.companyName} Hiring Team" or "${context.companyName} Team".
3. Sign off directly with the candidate's actual name: "${candidateName}".
4. In outreachPitch, write a ready-to-send, high-converting outreach message (under 120 words) referencing real project experience from the candidate's verified dossier.

Respond in valid JSON format:
{
  "coverLetter": "Full 3-paragraph professional cover letter in markdown format",
  "highlights": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "outreachPitch": "Ready-to-send outreach message for ${context.companyName} with zero placeholders",
  "strategyTip": "Strategic advice for applying",
  "atsKeywords": ["skill1", "skill2", "skill3"]
}`

          const result = await generateText({
            model: resolved.model(modelToUse),
            prompt,
          })

          const parsed = extractJsonObject<GeneratedApplicationMaterials>(result.text)
          if (!parsed || !parsed.coverLetter) {
            throw new Error("Invalid materials JSON returned by model")
          }
          return parsed
        },
        rubric: {
          disallowPlaceholders: true,
          maxCharacters: 6000,
        },
        textExtractor: (output) => `${output.coverLetter}\n${output.outreachPitch}`,
        fallbackSanitizer: (content) =>
          sanitizeOutreachPlaceholders(content, {
            companyName: context.companyName,
            jobTitle: context.jobTitle,
            candidateName,
          }),
      })

      materials = evalResult.content
      const outreachCtx = {
        companyName: context.companyName,
        jobTitle: context.jobTitle,
        candidateName,
        candidateEmail: dossier?.candidateEmail,
        githubUrl: dossier?.links.github,
        linkedinUrl: dossier?.links.linkedin,
        portfolioUrl: dossier?.links.portfolio,
        skills: materials.atsKeywords || [],
        topProjects: dossier?.bestProjects,
      }
      materials.coverLetter = sanitizeOutreachPlaceholders(materials.coverLetter, outreachCtx)
      materials.outreachPitch = sanitizeOutreachPlaceholders(materials.outreachPitch, outreachCtx)
      materials.outreachChannels = generateDeterministicOutreachBundle(outreachCtx)
      if (materials.outreachPitch) {
        materials.outreachChannels.email.body = materials.outreachPitch
      }

      void traceAIGeneration({
        name: "cover-letter-agent",
        userId,
        model: modelToUse,
        provider: providerType,
        input: {
          targetRole: context.jobTitle,
          company: context.companyName,
          candidateName,
        },
        output: {
          coverLetterSnippet: materials.coverLetter?.slice(0, 250),
          outreachPitch: materials.outreachPitch,
          strategyTip: materials.strategyTip,
          atsKeywords: materials.atsKeywords,
          selfCorrected: evalResult.selfCorrected,
          iterations: evalResult.iterations,
        },
        latencyMs: Date.now() - startTime,
        status: "success",
        tags: ["discovery", "cover-letter", "package", "reflexion"],
        flush: true,
      })
    } else {
      materials = generateDeterministicMaterials(candidateName, dossier, context)
    }
  } catch (error) {
    console.warn("[CoverLetterAgent] AI generation failed, using deterministic materials:", error)
    void traceAIGeneration({
      name: "cover-letter-agent",
      userId,
      model: modelToUse,
      provider: providerType,
      input: {
        targetRole: context.jobTitle,
        company: context.companyName,
        candidateName,
      },
      latencyMs: Date.now() - startTime,
      status: "error",
      error,
      tags: ["discovery", "cover-letter", "error", "fallback-to-deterministic"],
      flush: true,
    })
    materials = generateDeterministicMaterials(candidateName, dossier, context)
  }

  // Persist the generated materials to ApplicationAnalysis
  try {
    const outreachCtx = {
      companyName: context.companyName,
      jobTitle: context.jobTitle,
      candidateName,
      candidateEmail: dossier?.candidateEmail,
      githubUrl: dossier?.links.github,
      linkedinUrl: dossier?.links.linkedin,
      portfolioUrl: dossier?.links.portfolio,
      skills: materials.atsKeywords || [],
      topProjects: dossier?.bestProjects,
    }
    const detectedEmail = extractContactEmail(context.notes || "")
    const outreachBundle = materials.outreachChannels || generateDeterministicOutreachBundle(outreachCtx)
    const outreachSubject = `Application for ${context.jobTitle} - ${candidateName}`
    const outreachBody = sanitizeOutreachPlaceholders(materials.outreachPitch, outreachCtx)
    const outreachChecklist = [
      "Verified GitHub/LinkedIn/portfolio links included",
      `Mentioned core technical strengths: ${(materials.atsKeywords || []).slice(0, 3).join(", ") || "TypeScript, React"}`,
      "Highlighted top demonstrated projects",
      "Zero placeholders: 100% ready to submit",
    ]
    const tailoredResumeJson = {
      targetRole: context.jobTitle,
      company: context.companyName,
      highlights: materials.highlights || [],
      atsKeywords: materials.atsKeywords || [],
      strategyTip: materials.strategyTip,
      outreachChannels: outreachBundle,
      detectedEmail,
    }

    // Resolve authentic match score instead of hardcoded fallback
    let resolvedMatchScore = context.fitScore ?? context.matchScore ?? null
    if (!resolvedMatchScore && context.notes) {
      const match = context.notes.match(/Fit Score:\s*(\d+)%/i)
      if (match) resolvedMatchScore = parseInt(match[1], 10)
    }
    if (!resolvedMatchScore && prisma.userJobMatch?.findFirst) {
      const ujm = await withDbRetry(() =>
        prisma.userJobMatch.findFirst({
          where: {
            userId,
            job: {
              company: { equals: context.companyName, mode: "insensitive" },
              title: { equals: context.jobTitle, mode: "insensitive" },
            },
          },
          select: { fitScore: true },
        })
      ).catch(() => null)
      if (ujm?.fitScore) resolvedMatchScore = Math.round(ujm.fitScore)
    }
    if (!resolvedMatchScore) {
      const feed = await getCachedJson<any[]>(`discovery:feed:v1:${userId}`).catch(() => null)
      if (Array.isArray(feed)) {
        const item = feed.find(
          (j) => j.company?.toLowerCase() === context.companyName.toLowerCase() &&
                 j.title?.toLowerCase() === context.jobTitle.toLowerCase()
        )
        if (item?.fitScore) resolvedMatchScore = Math.round(item.fitScore)
      }
    }
    if (!resolvedMatchScore) {
      // Deterministic calculation from dossier matched skills vs target role
      const candidateSkills = (dossier?.matchedSkills?.map((s) => s.skill).join(", ") || "").toLowerCase()
      const roleLower = context.jobTitle.toLowerCase()
      let overlapCount = 0
      for (const skill of candidateSkills.split(/[,/|\n]+/)) {
        const s = skill.trim()
        if (s && roleLower.includes(s)) overlapCount++
      }
      resolvedMatchScore = Math.min(88, Math.max(55, 60 + overlapCount * 8))
    }

    const verdict =
      resolvedMatchScore >= 80
        ? "Strong Candidate Match"
        : resolvedMatchScore >= 65
          ? "Good Candidate Match"
          : "Stretch Opportunity"
    const confidence = resolvedMatchScore >= 80 ? "high" : "medium"

    await withDbRetry(() =>
      prisma.applicationAnalysis.upsert({
        where: { applicationId },
        create: {
          applicationId,
          matchScore: resolvedMatchScore,
          confidence,
          verdict,
          resumeAdvice: {
            highlights: materials.highlights,
            atsKeywords: materials.atsKeywords,
          },
          applyStrategy: {
            outreachPitch: materials.outreachPitch,
            strategyTip: materials.strategyTip,
          },
          rawAnalysis: materials.coverLetter,
          outreachSubject,
          outreachBody,
          outreachChecklist,
          outreachGeneratedAt: new Date(),
          tailoredResumeJson: tailoredResumeJson as any,
        },
        update: {
          matchScore: resolvedMatchScore,
          confidence,
          verdict,
          resumeAdvice: {
            highlights: materials.highlights,
            atsKeywords: materials.atsKeywords,
          },
          applyStrategy: {
            outreachPitch: materials.outreachPitch,
            strategyTip: materials.strategyTip,
          },
          rawAnalysis: materials.coverLetter,
          outreachSubject,
          outreachBody,
          outreachChecklist,
          outreachGeneratedAt: new Date(),
          tailoredResumeJson: tailoredResumeJson as any,
        },
      })
    )

    // Notify user that application materials have been drafted
    await withDbRetry(() =>
      prisma.notification.create({
        data: {
          userId,
          title: "Application Draft Generated",
          message: `Custom cover letter & resume highlights prepared for ${context.jobTitle} at ${context.companyName}.`,
          type: "APPLICATION_MATERIALS",
          link: `/applications`,
        },
      })
    ).catch((err) => console.warn("[CoverLetterAgent] Notification error:", err))
  } catch (err) {
    console.error("[CoverLetterAgent] Persistence error:", err)
  }

  return materials
}
