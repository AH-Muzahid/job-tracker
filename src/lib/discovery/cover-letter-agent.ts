/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getUserAIConfig } from "@/lib/ai/config"
import { getProvider } from "@/lib/ai/client"
import { generateText } from "ai"
import { toCanonical } from "@/lib/ai/knowledge-graph"

export interface GeneratedApplicationMaterials {
  coverLetter: string
  highlights: string[]
  outreachPitch: string
  strategyTip?: string
  atsKeywords: string[]
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

  const outreachPitch = `Hi there! I saw the opening for ${jobTitle} at ${companyName}. I've recently built ${topProject.name} using ${skillsDisplay}. Would love to share my GitHub and discuss how my hands-on experience aligns with your team!`

  return {
    coverLetter,
    highlights,
    outreachPitch,
    strategyTip: `Focus on highlighting your hands-on experience with ${topProject.name} and your proficiency in ${skillsDisplay}.`,
    atsKeywords: uniqueSkills.map((s) => toCanonical(s)),
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
  }
): Promise<GeneratedApplicationMaterials> {
  const [profile, user] = await Promise.all([
    withDbRetry<any>(() => prisma.userProfile.findUnique({ where: { userId } })),
    withDbRetry<any>(() => prisma.user.findUnique({ where: { id: userId }, select: { name: true } })),
  ])

  const candidateName = user?.name || profile?.fullName || "Applicant"

  let materials: GeneratedApplicationMaterials

  try {
    const aiConfig = await getUserAIConfig(userId)
    if (aiConfig?.apiKey) {
      const resolved = getProvider(aiConfig)
      const modelToUse = aiConfig.model || resolved.defaultModel
      const prompt = `You are an elite career coach and staff software engineer.
Draft tailored application materials for a candidate applying to:
Job Title: ${context.jobTitle}
Company: ${context.companyName}
Location: ${context.location || "Remote"}
Candidate Profile:
- Name: ${candidateName}
- Target Roles: ${(profile?.targetRoles || []).join(", ")}
- Strengths & Tech: ${profile?.strengths || "React, TypeScript, Node.js"}
- Best Projects: ${JSON.stringify(profile?.bestProjects || [])}
- Experience Level: ${profile?.experienceLevel || "Mid-level"}

Respond in valid JSON format:
{
  "coverLetter": "Full 3-paragraph professional cover letter in markdown format",
  "highlights": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "outreachPitch": "2-sentence outreach message for LinkedIn",
  "strategyTip": "Strategic advice for applying",
  "atsKeywords": ["skill1", "skill2", "skill3"]
} `

      const { text } = await generateText({
        model: resolved.model(modelToUse),
        prompt,
      })

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        materials = JSON.parse(jsonMatch[0])
      } else {
        materials = generateDeterministicMaterials(candidateName, profile, context)
      }
    } else {
      materials = generateDeterministicMaterials(candidateName, profile, context)
    }
  } catch (error) {
    console.warn("[CoverLetterAgent] AI generation failed, using deterministic materials:", error)
    materials = generateDeterministicMaterials(candidateName, profile, context)
  }

  // Persist the generated materials to ApplicationAnalysis
  try {
    await withDbRetry(() =>
      prisma.applicationAnalysis.upsert({
        where: { applicationId },
        create: {
          applicationId,
          matchScore: 85,
          confidence: "high",
          verdict: "AI Application Draft Ready",
          resumeAdvice: {
            highlights: materials.highlights,
            atsKeywords: materials.atsKeywords,
          },
          applyStrategy: {
            outreachPitch: materials.outreachPitch,
            strategyTip: materials.strategyTip,
          },
          rawAnalysis: materials.coverLetter,
        },
        update: {
          resumeAdvice: {
            highlights: materials.highlights,
            atsKeywords: materials.atsKeywords,
          },
          applyStrategy: {
            outreachPitch: materials.outreachPitch,
            strategyTip: materials.strategyTip,
          },
          rawAnalysis: materials.coverLetter,
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
