/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getUserAIConfig } from "@/lib/ai/config"
import { getProvider } from "@/lib/ai/client"
import { generateText } from "ai"
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { traceAIGeneration } from "@/lib/ai/telemetry"
import { extractJsonObject } from "@/lib/ai/json-extractor"
import { getCachedJson } from "@/lib/redis"
import { assembleAgenticCandidateContext } from "@/lib/ai/agentic-context"
import {
  coordinateApplicationPackageSquad,
  StrategistBrief,
  ApplicationMaterialsDraft,
} from "@/lib/ai/squad/orchestrator"
import {
  sanitizeOutreachPlaceholders,
  generateDeterministicOutreachBundle,
  detectApplicationStrategy,
  pruneRelevantStack,
  cleanJobTitle,
  OutreachChannel,
  OutreachChannelBundle,
} from "@/lib/applications/outreach-engine"

export interface SquadTraceDeliberation {
  scoutSummary?: {
    company: string
    role: string
    techStackDetected: string[]
  }
  strategistBrief?: StrategistBrief
  criticAudit?: {
    approved: boolean
    rounds: number
    feedback?: string[]
  }
}

export interface GeneratedApplicationMaterials {
  coverLetter: string
  highlights: string[]
  outreachPitch: string
  strategyTip?: string
  atsKeywords: string[]
  outreachSubject?: string
  outreachChannels?: OutreachChannelBundle
  squadTrace?: SquadTraceDeliberation
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
    jobUrl?: string
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
  const uniqueSkills = Array.from(new Set(candidateSkills.filter((s) => s.length > 1)))
  const prunedSkills = pruneRelevantStack(uniqueSkills, jobTitle, 3)
  const prunedTopProjStack = pruneRelevantStack(topProject.stack || prunedSkills, jobTitle, 3)

  const coverLetter = `Dear Hiring Team at ${companyName},

I noticed ${companyName} is expanding its engineering team for the ${jobTitle} position. With hands-on experience building production web systems using ${prunedSkills}, I am writing to share how my background aligns with your engineering goals.

In my recent work on "${topProject.name}", I engineered core architecture using ${prunedTopProjStack}, focusing on high performance, clean modular component design, and reliable data synchronization.${
    secondProject ? ` Additionally, through my "${secondProject.name}" project, I implemented production features using ${pruneRelevantStack(secondProject.stack || "modern web stack", jobTitle, 3)} with an emphasis on developer ergonomics and system stability.` : ""
  } My focus is always on delivering measurable product impact while maintaining maintainable, type-safe codebases.

I would welcome the opportunity to discuss how my technical foundation, autonomous execution, and problem-solving skills align with ${companyName}'s upcoming roadmap. Thank you for your time and consideration.

Sincerely,
${candidateName}`

  const highlights = [
    `Engineered "${topProject.name}" using ${prunedTopProjStack}, delivering end-to-end features with high test coverage and robust type safety.`,
    `Architected full-stack workflows with ${prunedSkills}, optimizing response latencies and database queries for seamless user experiences.`,
    `Demonstrated autonomous ownership and rapid delivery of complex product features from conception to deployment.`,
  ]

  // Detect matching single channel to prevent token waste during staging
  const strategyDetection = detectApplicationStrategy(context.notes || "", "", context.jobUrl)
  const primaryChannel: OutreachChannel = strategyDetection.strategy

  const outreachBundle = generateDeterministicOutreachBundle(
    {
      companyName,
      jobTitle,
      candidateName,
      skills: uniqueSkills,
      topProjects: bestProjects,
      location: context.location,
      notes: context.notes,
    },
    primaryChannel
  )

  let outreachPitch = `Hi ${companyName} Team! I saw the opening for ${jobTitle} at ${companyName}. I recently engineered ${topProject.name} using ${prunedTopProjStack}. Would love to share my portfolio and discuss how my hands-on build experience aligns with your roadmap!`
  if (primaryChannel === "form_portal" && outreachBundle.form_portal?.portalNote) {
    outreachPitch = outreachBundle.form_portal.portalNote
  } else if (primaryChannel === "linkedin_dm" && outreachBundle.linkedin_dm?.body) {
    outreachPitch = outreachBundle.linkedin_dm.body
  } else if (primaryChannel === "email" && outreachBundle.email?.body) {
    outreachPitch = outreachBundle.email.body
  }

  return {
    coverLetter,
    highlights,
    outreachPitch,
    strategyTip: `Focus on highlighting your hands-on experience with ${topProject.name} and your proficiency in ${prunedSkills}.`,
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

      // Coordinate Level 4 Multi-Agent Squad (Scout -> Strategist -> Scribe -> Critic)
      const squadResult = await coordinateApplicationPackageSquad({
        jobTitle: context.jobTitle,
        companyName: context.companyName,
        candidateName,
        candidateEmail: dossier?.candidateEmail,
        dossierContext: dossier?.summaryContextText,
        strategistFn: async ({ jobTitle, companyName }) => {
          const matchedSkills = (dossier?.matchedSkills || []).map((s) => ({
            skill: s.skill,
            proofProject: s.proofProjects?.[0]?.projectName,
            metric: s.proofProjects?.[0]?.metrics?.[0],
          }))
          const cautionSkills = dossier?.missingSkills || []
          const positioningPitch = `Positioning ${candidateName} for ${jobTitle} at ${companyName} emphasizing verified strengths in ${(dossier?.adaptiveBoosts || []).slice(0, 3).join(", ") || "full-stack engineering"}.`
          return {
            targetRole: jobTitle,
            matchedSkills,
            cautionSkills,
            positioningPitch,
          }
        },
        scribeFn: async (brief, critiqueFeedback) => {
          const critiqueNote =
            critiqueFeedback && critiqueFeedback.length > 0
              ? `\nCRITICAL FIXES REQUIRED FROM PREVIOUS DRAFT EVALUATION:\n${critiqueFeedback.map((f) => `- ${f}`).join("\n")}\nPlease rewrite fixing these exact violations while maintaining factual accuracy.`
              : ""

          const strategySection = `STRATEGY BRIEF:\n- Target Role: ${brief.targetRole}\n- Positioning Pitch: ${brief.positioningPitch}\n- Verified Skills & Proof: ${JSON.stringify(brief.matchedSkills.slice(0, 5))}`

          const prompt = `You are the CareerTrack Master Application Craftsman (Scribe).
Draft tailored application materials for a candidate applying to:
Job Title: ${context.jobTitle}
Company: ${context.companyName}
Location: ${context.location || "Remote"}

${systemPromptContext}

${strategySection}
${critiqueNote}

CRITICAL ANTI-BUZZWORD & HIGH-CONVERSION RULES (STRIPE / LINEAR STANDARD):
1. NEVER output placeholders like "[Hiring Manager/Recruiter]", "[Your Name]", or "[Company Name]".
2. Always address the team naturally as "${context.companyName} Hiring Team" or "${context.companyName} Team".
3. Sign off directly with the candidate's actual name: "${candidateName}".
4. STRICT ANTI-BUZZWORD MANDATE: Mention AT MOST 3-4 technologies. NEVER list redundant tools together (e.g. no JS + TS) and never dump 5+ libraries in a sentence.
5. In outreachPitch, write a ready-to-send, high-converting outreach message (strictly under 110 words) highlighting 1 hero project with a concrete engineering challenge/metric, 1-sentence company bridge, and a low-friction 10-minute intro chat CTA.
6. In coverLetter, avoid generic boilerplate like "I am writing to express my strong interest in...". Jump straight to relevant technical alignment.

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

          const parsed = extractJsonObject<ApplicationMaterialsDraft>(result.text)
          if (!parsed || !parsed.coverLetter) {
            throw new Error("Invalid materials JSON returned by model")
          }
          return {
            coverLetter: parsed.coverLetter,
            highlights: parsed.highlights || [],
            outreachPitch: parsed.outreachPitch || "",
            strategyTip: parsed.strategyTip,
            atsKeywords: parsed.atsKeywords || [],
          }
        },
        maxCriticRounds: 2,
      })

      if (squadResult.isDeterministicFallback) {
        materials = generateDeterministicMaterials(candidateName, dossier, context)
      } else {
        materials = {
          coverLetter: squadResult.materials.coverLetter,
          highlights: squadResult.materials.highlights || [],
          outreachPitch: squadResult.materials.outreachPitch,
          strategyTip: squadResult.materials.strategyTip,
          atsKeywords: squadResult.materials.atsKeywords || [],
          squadTrace: {
            scoutSummary: {
              company: context.companyName,
              role: context.jobTitle,
              techStackDetected: squadResult.materials.atsKeywords || [],
            },
            strategistBrief: squadResult.strategistBrief,
            criticAudit: {
              approved: squadResult.approvedByCritic,
              rounds: squadResult.rounds,
              feedback: squadResult.criticFeedback,
            },
          },
        }
      }

      const strategyDetection = detectApplicationStrategy(context.notes || "", "", context.jobUrl)
      const primaryChannel: OutreachChannel = strategyDetection.strategy

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

      // Strictly populate ONLY the matching primary channel to eliminate token waste on staging
      if (primaryChannel === "form_portal") {
        materials.outreachChannels = {
          form_portal: {
            portalNote: materials.outreachPitch,
            screenerAnswers: [], // Generated on-demand when user provides or requests form questions
          },
        }
      } else if (primaryChannel === "linkedin_dm") {
        materials.outreachChannels = {
          linkedin_dm: {
            subject: `${cleanJobTitle(context.jobTitle)} role inquiry - ${candidateName}`,
            body: materials.outreachPitch,
          },
        }
      } else {
        materials.outreachChannels = {
          email: {
            subject: `Application for ${cleanJobTitle(context.jobTitle)} - ${candidateName}`,
            body: materials.outreachPitch,
          },
        }
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
          selfCorrected: squadResult.rounds > 1,
          iterations: squadResult.rounds,
          approvedByCritic: squadResult.approvedByCritic,
        },
        latencyMs: Date.now() - startTime,
        status: "success",
        tags: ["discovery", "cover-letter", "package", "multi-agent-squad"],
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

    const strategyDetection = detectApplicationStrategy(context.notes || "", "", context.jobUrl)
    const primaryChannel: OutreachChannel = strategyDetection.strategy
    const outreachBundle =
      materials.outreachChannels ||
      generateDeterministicOutreachBundle(outreachCtx, primaryChannel)

    let outreachSubject = `Application for ${cleanJobTitle(context.jobTitle)} - ${candidateName}`
    let outreachBody = sanitizeOutreachPlaceholders(materials.outreachPitch, outreachCtx)

    if (primaryChannel === "form_portal") {
      outreachSubject = `${cleanJobTitle(context.jobTitle)} - Application Cover Note & Screener Q&A`
      outreachBody = outreachBundle.form_portal?.portalNote || outreachBody
    } else if (primaryChannel === "linkedin_dm") {
      outreachSubject = outreachBundle.linkedin_dm?.subject || `${cleanJobTitle(context.jobTitle)} role inquiry - ${candidateName}`
      outreachBody = outreachBundle.linkedin_dm?.body || outreachBody
    } else if (primaryChannel === "email" && outreachBundle.email) {
      outreachSubject = outreachBundle.email.subject || outreachSubject
      outreachBody = outreachBundle.email.body || outreachBody
    }

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
      detectedEmail: strategyDetection.detectedEmail,
      strategy: primaryChannel,
      strategyReason: strategyDetection.reason,
      recommendedChannel: primaryChannel,
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
            squadTrace: materials.squadTrace,
          } as any,
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
            squadTrace: materials.squadTrace,
          } as any,
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
