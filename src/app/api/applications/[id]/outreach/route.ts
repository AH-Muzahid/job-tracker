import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const aiConfig = await getUserAIConfig(userId, undefined, { requireUserKey: true })
  if (!aiConfig) {
    return NextResponse.json(
      {
        error: "AI key required. Please configure your personal AI API key in Settings > AI Configuration to generate outreach emails.",
        code: "AI_KEY_REQUIRED",
      },
      { status: 400 }
    )
  }

  // Fast targeted DB queries for application, user identity, and profile
  const [app, user, profile, defaultResume] = await Promise.all([
    withDbRetry(() =>
      prisma.application.findUnique({
        where: { id, userId },
        include: { analysis: true },
      })
    ),
    withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })
    ),
    withDbRetry(() =>
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          linkedInUrl: true,
          githubUrl: true,
          portfolioUrl: true,
          bestProjects: true,
          strengths: true,
          experienceLevel: true,
        },
      })
    ),
    withDbRetry(() =>
      prisma.resume.findFirst({
        where: { userId, isDefault: true },
        select: { textContent: true },
      })
    ),
  ])

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

  const candidateName = user?.name || "Candidate"
  const candidateEmail = user?.email || ""

  // Format concise user profile summary
  let profileContext = `Candidate Identity:
- Name: ${candidateName}
- Email: ${candidateEmail}`

  if (profile) {
    profileContext += `
- LinkedIn: ${profile.linkedInUrl || "Not set"}
- GitHub: ${profile.githubUrl || "Not set"}
- Portfolio: ${profile.portfolioUrl || "Not set"}
- Key Skills: ${profile.strengths || "Not set"}
- Experience Level: ${profile.experienceLevel || "Not set"}`

    if (profile.bestProjects) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const projects = profile.bestProjects as Array<any>
      if (Array.isArray(projects) && projects.length > 0) {
        profileContext += "\n- Projects: " + projects.map((p) => `${p.name} (${p.stack || ""}): ${p.description || ""}`).join("; ")
      }
    }
  }

  if (defaultResume?.textContent) {
    profileContext += `\n- Resume Excerpt: ${defaultResume.textContent.slice(0, 400)}`
  }

  const systemPrompt = `You are a World-Class Executive Outreach Copywriter.
Your goal is to write a high-converting, concise, professional outreach email for a job application.

CRITICAL FORMATTING RULES:
1. LINE 1 MUST BE THE SUBJECT LINE formatted exactly as:
SUBJECT: Application for ${app.jobTitle} - ${candidateName}

2. AFTER LINE 1, LEAVE ONE BLANK LINE AND WRITE THE EMAIL BODY ONLY (Max 120 words).
   - Greeting: "Dear ${app.companyName} Hiring Team," or "Dear Hiring Manager,".
   - Paragraph 1: Interest in ${app.jobTitle} at ${app.companyName}, matching stack.
   - Paragraph 2: 2 short sentences highlighting technical achievements & real project proof from context.
   - Paragraph 3: Low-friction CTA + sign-off with candidate name "${candidateName}" & verified profile links.
   - NEVER write section labels like "Body:", "Cover Letter:", or "Subject Line 2:".
   - NEVER write placeholders like "[Your Name]" or "[Hiring Manager]".

3. VERIFIED LINKS ONLY:
   - Include ONLY the exact GitHub, LinkedIn, Portfolio links present in candidate context.

${profileContext}`

  const resolvedProvider = getProvider({
    providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
  })

  const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)
  const rawJd = app.analysis?.rawJd || app.notes || ""
  const truncatedJd = rawJd.length > 600 ? rawJd.slice(0, 600) + "..." : rawJd

  const promptMessage = `Role: ${app.jobTitle} at ${app.companyName}
JD Excerpt:
${truncatedJd}

Write line 1 as SUBJECT: ..., then write the email body.`

  try {
    const textResult = await generateText({
      model: targetModel,
      system: systemPrompt,
      prompt: promptMessage,
    })

    const rawText = textResult.text || ""
    const result = parseOutreachText(rawText, app.companyName, candidateName, app.jobTitle)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Outreach generation error:", error)
    const errMsg = error instanceof Error ? error.message : "Failed to generate outreach email"
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

function parseOutreachText(
  rawText: string,
  companyName: string,
  candidateName: string,
  jobTitle: string
) {
  let subject = `Application for ${jobTitle} - ${candidateName}`
  let emailText = rawText.trim()

  // First try JSON parsing if model returned JSON
  if (emailText.startsWith("{") || emailText.startsWith("```json")) {
    const cleaned = emailText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")
    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1))
        if (parsed.subject) subject = parsed.subject
        if (parsed.email || parsed.body || parsed.message) {
          emailText = parsed.email || parsed.body || parsed.message
        }
      } catch {
        // Continue to line parsing if JSON parse fails
      }
    }
  }

  if (emailText.includes("\n") && !emailText.startsWith("{")) {
    const lines = emailText.split("\n")
    const firstLine = lines[0].trim()
    if (firstLine.toUpperCase().startsWith("SUBJECT:")) {
      subject = firstLine.replace(/^SUBJECT:\s*/i, "").trim()
      emailText = lines.slice(1).join("\n").trimStart()
    }
  }

  // Sanitize headers or placeholders
  emailText = emailText
    .replace(/^Body:\s*/gi, "")
    .replace(/^Cover Letter:\s*/gi, "")
    .replace(/\[Hiring Manager\/Recruitment Team\]/gi, `Dear ${companyName} Hiring Team,`)
    .replace(/\[Hiring Manager\]/gi, `Dear ${companyName} Hiring Team,`)
    .replace(/\[Your Name\]/gi, candidateName)
    .replace(/\[Company Name\]/gi, companyName)
    .replace(/\[Job Title\]/gi, jobTitle)
    .trim()

  if (!emailText || emailText.length < 20) {
    emailText = `Dear ${companyName} Hiring Team,\n\nI am reaching out to express my strong interest in the ${jobTitle} position at ${companyName}. With my technical background and hands-on project experience, I am confident in my ability to add immediate value to your team.\n\nI look forward to discussing how my experience aligns with your goals.\n\nBest regards,\n${candidateName}`
  }

  return {
    subject,
    email: emailText,
  }
}
