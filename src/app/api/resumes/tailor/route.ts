export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { 
  getCachedKnowledgeGraph, 
  buildCareerGraphFromText, 
  traverseGraphForJD,
  formatGraphForContext 
} from "@/lib/ai/knowledge-graph"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import type { TailoredResumeData } from "@/types/tailored-resume"

export async function POST(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rateCheck = checkRateLimit(`resume-tailor:${userId}`, 10, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  const aiConfig = await getUserAIConfig(userId)
  if (!aiConfig) {
    return NextResponse.json(
      { error: "AI provider not configured. Please set your API key in Settings." },
      { status: 400 }
    )
  }

  let body: {
    jdText: string
    targetRole?: string
    targetCompany?: string
    applicationId?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const { jdText, targetRole, targetCompany } = body
  if (!jdText || typeof jdText !== "string" || jdText.trim().length < 20) {
    return NextResponse.json(
      { error: "A valid Job Description (minimum 20 characters) is required." },
      { status: 400 }
    )
  }

  // 1. Fetch user data in parallel
  const [user, profile, defaultResume, cachedGraph] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
    }),
    prisma.resume.findFirst({
      where: { userId, isDefault: true },
      select: { title: true, fileName: true, textContent: true },
    }),
    getCachedKnowledgeGraph(userId),
  ])

  let activeGraph = cachedGraph
  if (!activeGraph && defaultResume?.textContent) {
    try {
      activeGraph = buildCareerGraphFromText(defaultResume.textContent, profile)
    } catch {
      // ignore
    }
  }

  // 2. Perform Vector-less Graph RAG Traversal against the target JD
  let graphEvidence = ""
  let matchScore = 85
  if (activeGraph && activeGraph.nodes.length > 0) {
    const traversal = traverseGraphForJD(activeGraph, jdText)
    matchScore = traversal.matchScore
    graphEvidence = formatGraphForContext(activeGraph)
  }

  // 3. Construct System Prompt & User Prompt
  const displayName = user?.name || profile?.targetRoles?.[0] || "Candidate"
  const candidateEmail = user?.email || "candidate@email.com"

  const systemPrompt = `You are an expert Technical Resume Strategist and ATS Optimization Engine.
Your task is to generate a pristine, single-page, ATS-optimized technical resume in strict JSON format.

CRITICAL RULES:
1. ONLY use the candidate's actual projects, verified skills, and quantifiable metrics from the provided Career Knowledge Graph and Profile.
2. Tailor the Professional Summary and Bullet Points specifically to highlight the skills matching the target Job Description.
3. Every bullet point MUST use the STAR/Action-Result format (Action Verb + Context/Tool + Measurable Impact/Metric).
4. Strictly NO generic AI filler words ("passionate", "motivated", "detail-oriented").
5. Return ONLY a single valid JSON object adhering strictly to the required schema with no extra text or markdown formatting outside the JSON.`

  const userPrompt = `TARGET JOB DETAILS:
- Company: ${targetCompany || "Target Employer"}
- Target Role: ${targetRole || profile?.targetRoles?.[0] || "Software Engineer"}
- Job Description:
${jdText.slice(0, 4000)}

CANDIDATE INFORMATION:
- Name: ${displayName}
- Email: ${candidateEmail}
- Phone: ${profile?.location ? "+1 (555) 019-2834" : ""}
- Location: ${profile?.location || "Remote / Hybrid"}
- LinkedIn: ${profile?.linkedInUrl || ""}
- GitHub: ${profile?.githubUrl || ""}
- Portfolio: ${profile?.portfolioUrl || ""}
- Target Roles: ${profile?.targetRoles?.join(", ") || ""}

${graphEvidence ? `CANDIDATE CAREER KNOWLEDGE GRAPH (EVIDENCE):\n${graphEvidence}` : `RESUME EXCERPT:\n${defaultResume?.textContent?.slice(0, 3000) || "Standard software developer background"}`}

Generate the tailored resume JSON in this exact structure:
{
  "header": {
    "fullName": "${displayName}",
    "title": "${targetRole || profile?.targetRoles?.[0] || "Software Engineer"}",
    "email": "${candidateEmail}",
    "location": "${profile?.location || "United States"}",
    "linkedinUrl": "${profile?.linkedInUrl || ""}",
    "githubUrl": "${profile?.githubUrl || ""}",
    "portfolioUrl": "${profile?.portfolioUrl || ""}"
  },
  "summary": "2-3 sentence high-impact technical summary targeting the role with core stack and experience proof.",
  "skillsByDomain": [
    { "domain": "Languages & Core", "skills": ["TypeScript", "Go", "Python"] },
    { "domain": "Frameworks & Libraries", "skills": ["React", "Next.js", "Node.js"] },
    { "domain": "Infrastructure & Tools", "skills": ["PostgreSQL", "Docker", "AWS", "Redis"] }
  ],
  "experience": [
    {
      "role": "Software Engineer",
      "company": "Tech Company",
      "location": "Remote",
      "duration": "2023 - Present",
      "bullets": [
        "Architected high-throughput microservices reducing API latency by 35%.",
        "Engineered scalable fullstack features using Next.js, Prisma, and PostgreSQL."
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "stack": ["React", "Next.js", "TailwindCSS"],
      "bullets": [
        "Built responsive web app serving 10k active users with 99.9% uptime.",
        "Implemented Redis caching and optimistic UI reducing render latency by 45%."
      ],
      "link": "https://github.com/..."
    }
  ],
  "education": [
    {
      "degree": "B.S. in Computer Science",
      "institution": "University",
      "year": "2022"
    }
  ]
}`

  const resolvedProvider = getProvider({
    providerType: aiConfig.providerType as "openai" | "anthropic" | "google" | "custom-openai",
    apiKey: aiConfig.apiKey,
    baseUrl: aiConfig.baseUrl,
    model: aiConfig.model,
  })

  const modelToUse = aiConfig.model || resolvedProvider.defaultModel

  try {
    const result = await generateText({
      model: resolvedProvider.model(modelToUse),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
    })

    // Clean JSON output (strip ```json fences if present)
    let cleanedText = result.text.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }

    const parsedData = JSON.parse(cleanedText) as TailoredResumeData
    parsedData.targetCompany = targetCompany
    parsedData.targetRole = targetRole
    parsedData.matchScore = matchScore
    parsedData.generatedAt = new Date().toISOString()

    return NextResponse.json({
      success: true,
      data: parsedData,
      matchScore,
    })
  } catch (err: any) {
    console.error("Tailored resume generation error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to generate tailored resume" },
      { status: 500 }
    )
  }
}
