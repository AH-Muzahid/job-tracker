import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getInternalUserId } from "@/lib/auth"
import { getUserAIConfig } from "@/lib/ai/config"
import { getCachedKnowledgeGraph } from "@/lib/ai/knowledge-graph"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { resilientGenerateText, getEmergencyInterviewTurn } from "@/lib/ai/resilience"
import { sanitizeUntrustedContext } from "@/lib/ai/context-builder"
import { prisma, withDbRetry } from "@/lib/prisma"

const ConversationTurnSchema = z.object({
  targetRole: z.string().max(120).optional().default("Software Engineer"),
  targetCompany: z.string().max(120).optional().default("Top Tech Company"),
  interviewType: z.enum(["Technical", "Behavioral", "System Design", "Leadership", "General"]).optional().default("Technical"),
  interviewerTone: z.enum(["friendly", "strict", "startup-cto", "architect"]).optional().default("friendly"),
  voiceGender: z.enum(["female", "male"]).optional().default("female"),
  language: z.enum(["en", "bn", "mixed"]).optional().default("en"),
  targetTurnCount: z.number().int().min(1).max(20).optional().default(5),
  applicationId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["interviewer", "candidate"]),
        text: z.string().max(4000),
      })
    )
    .optional()
    .default([]),
  userAnswer: z.string().max(5000).optional(),
})

export type ConversationTurnRequest = z.infer<typeof ConversationTurnSchema>

export interface PhaseDefinition {
  phaseTitle: string
  instruction: string
}

export function getTurnArchetypePhase({
  interviewType,
  currentCandidateTurn,
  targetTurnCount,
  interviewerName,
  targetRole,
  targetCompany,
}: {
  interviewType: "Technical" | "Behavioral" | "System Design" | "Leadership" | "General"
  currentCandidateTurn: number
  targetTurnCount: number
  interviewerName: string
  targetRole: string
  targetCompany: string
}): PhaseDefinition {
  if (currentCandidateTurn >= targetTurnCount) {
    return {
      phaseTitle: "Wrap-Up & Closing Sign-Off",
      instruction: `
STAGE: FINAL WRAP-UP & CONCLUSION (CRITICAL RULE):
- THIS IS THE END OF THE INTERVIEW. DO NOT ASK ANY MORE QUESTIONS!
- Warmly thank the candidate for their time, highlight that they communicated their points well, and state that the interview is now concluded.
- Verbal cues: "That brings us to the end of our interview today! Thank you so much for your time and thoughtful responses. I am preparing your performance evaluation report now." / (বাংলায়: "চমৎকার! আমাদের আজকের ইন্টারভিউ সেশন এখানেই শেষ হচ্ছে। আপনার মূল্যবান সময় ও চমৎকার উত্তরের জন্য অনেক ধন্যবাদ। আমি এখন আপনার ইভ্যালুয়েশন রিপোর্ট রেডি করছি।")`,
    }
  }

  // Determine stage progression index (0 to 3)
  const normalizedIndex =
    targetTurnCount <= 4
      ? Math.min(currentCandidateTurn, targetTurnCount - 1)
      : Math.min(Math.floor((currentCandidateTurn / (targetTurnCount - 1)) * 4), 3)

  switch (interviewType) {
    case "Behavioral": {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Background & Role Motivation",
          instruction: `
STAGE 1/4 (BEHAVIORAL - INTRODUCTION & MOTIVATION):
- Greet the candidate in 1 short sentence, introduce yourself as ${interviewerName}, and ask them to share their professional background and what motivated them to pursue the ${targetRole} opportunity at ${targetCompany}.`,
        },
        {
          phaseTitle: "STAR: Situation & High Stakes Challenge",
          instruction: `
STAGE 2/4 (BEHAVIORAL - SITUATION & TASK UNDER PRESSURE):
- Acknowledge their intro in 3-4 words.
- Ask for a concrete high-stakes situation: a project with an impossible deadline, severe resource constraint, or conflicting stakeholder priorities. Ask what specific goal they were tasked with delivering.`,
        },
        {
          phaseTitle: "STAR: Action & Conflict Resolution",
          instruction: `
STAGE 3/4 (BEHAVIORAL - PERSONAL ACTION & DISAGREEMENT):
- Acknowledge their situation in 3-4 words.
- Probe the specific personal actions THEY took: how did they handle pushback, disagreement with teammates/leaders, or uncertainty? Do not accept "we did", insist on what *they* individually drove.`,
        },
        {
          phaseTitle: "STAR: Result, Impact & Reflection",
          instruction: `
STAGE 4/4 (BEHAVIORAL - QUANTIFIED IMPACT & RETROSPECTIVE):
- Acknowledge their action in 3-4 words.
- Ask for the measurable, quantifiable outcome of their work and what critical lesson they learned that changed how they work today.`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }

    case "System Design": {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Requirements & Scope Formulation",
          instruction: `
STAGE 1/4 (SYSTEM DESIGN - REQUIREMENTS & CAPACITY ESTIMATION):
- Greet candidate in 1 sentence as ${interviewerName}.
- Pose a high-scale distributed system problem relevant to ${targetRole} at ${targetCompany} (e.g. real-time event ingestion, globally distributed feed, distributed lock manager, or notification engine).
- Ask them to clarify functional vs non-functional requirements and state scale assumptions (QPS, throughput, latency targets).`,
        },
        {
          phaseTitle: "High-Level Architecture & Core Data Entities",
          instruction: `
STAGE 2/4 (SYSTEM DESIGN - HIGH-LEVEL ARCHITECTURE & STORAGE):
- Acknowledge their scope in 3-4 words.
- Ask them to outline the end-to-end architecture: client entrypoints, load balancers, API gateways, core microservices, and database models (SQL vs NoSQL trade-offs).`,
        },
        {
          phaseTitle: "Data Partitioning & Bottleneck Mitigation",
          instruction: `
STAGE 3/4 (SYSTEM DESIGN - DEEP DIVE & SCALING BOTTLENECKS):
- Acknowledge their architectural choices.
- Challenge them on scaling bottlenecks: how will they partition/shard data, prevent hot spots, handle cache invalidation, and ensure read-after-write consistency?`,
        },
        {
          phaseTitle: "Failure Modes, Resiliency & Observability",
          instruction: `
STAGE 4/4 (SYSTEM DESIGN - FAULT TOLERANCE & CHAOS RESILIENCY):
- Acknowledge their scaling approach.
- Push on failure scenarios: what happens during a regional database failover, network partition, or cascade downstream failure? How do they ensure circuit breaking, rate limiting, and 99.99% availability?`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }

    case "Leadership": {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Leadership Philosophy & Engineering Culture",
          instruction: `
STAGE 1/4 (LEADERSHIP - VISION & CULTURE):
- Greet candidate in 1 sentence as ${interviewerName}.
- Ask them about their core leadership philosophy: how do they build high-trust engineering culture, maintain high technical bars, and empower engineers?`,
        },
        {
          phaseTitle: "Mentorship & Performance Management",
          instruction: `
STAGE 2/4 (LEADERSHIP - PEOPLE & MENTORSHIP):
- Acknowledge their philosophy.
- Ask about a specific instance where they coached a struggling engineer or handled an underperforming team member during a high-stress delivery timeline.`,
        },
        {
          phaseTitle: "Cross-Functional Influence & Stakeholder Conflict",
          instruction: `
STAGE 3/4 (LEADERSHIP - INFLUENCE & CONFLICT):
- Acknowledge their answer.
- Ask about navigating intense cross-functional disagreement with Product or Executive leadership when engineering health and business demands clashed.`,
        },
        {
          phaseTitle: "Technical Debt vs Velocity Strategy",
          instruction: `
STAGE 4/4 (LEADERSHIP - ARCHITECTURAL STRATEGY & DEBT):
- Acknowledge their answer.
- Ask how they systematically prioritize and negotiate legacy refactoring and tech debt reduction against rapid roadmap feature pressure.`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }

    case "General": {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Career Journey & Role Alignment",
          instruction: `
STAGE 1/4 (GENERAL - JOURNEY & ALIGNMENT):
- Greet candidate in 1 sentence as ${interviewerName}.
- Ask them to walk through key turning points in their career and why this ${targetRole} role at ${targetCompany} is the ideal next step.`,
        },
        {
          phaseTitle: "Key Accomplishments & Strengths",
          instruction: `
STAGE 2/4 (GENERAL - SIGNATURE ACHIEVEMENT):
- Acknowledge their intro in 3-4 words.
- Ask them to highlight their proudest technical or project achievement and the specific capabilities that enabled them to succeed.`,
        },
        {
          phaseTitle: "Navigating Failure & Technical Adversity",
          instruction: `
STAGE 3/4 (GENERAL - RESILIENCE & OWNERSHIP):
- Acknowledge their achievement.
- Ask about an instance where a major initiative failed, a production bug slipped through, or an assumption was wrong. How did they take ownership and bounce back?`,
        },
        {
          phaseTitle: "Team Collaboration & Values",
          instruction: `
STAGE 4/4 (GENERAL - CULTURE FIT & TEAM DYNAMICS):
- Acknowledge their response.
- Ask how they foster collaboration, handle constructive code reviews, and contribute to high-performing team dynamics.`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }

    case "Technical":
    default: {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Core Fundamentals & Stack Warm-up",
          instruction: `
STAGE 1/4 (TECHNICAL - CORE STACK & CONCURRENCY):
- Greet the candidate in 1 sentence, introduce yourself as ${interviewerName}, and dive directly into a foundational question on their primary stack for ${targetRole} (e.g. event loop/concurrency, memory management, database indexing, or state flow).`,
        },
        {
          phaseTitle: "Algorithmic & Component Architecture",
          instruction: `
STAGE 2/4 (TECHNICAL - IMPLEMENTATION & ALGORITHMS):
- Acknowledge their response in 3-4 words.
- Pose a concrete implementation problem (e.g. designing an in-memory TTL cache, rate limiter token bucket, debounce/throttle mechanism, or recursive tree traversal). Ask for their algorithmic choices and trade-offs.`,
        },
        {
          phaseTitle: "Edge Cases, Race Conditions & Complexity",
          instruction: `
STAGE 3/4 (TECHNICAL - EDGE CASES & HARDENING):
- Acknowledge their design.
- Probe the edge cases: what happens under concurrent writes, race conditions, network failures, or unhandled exceptions? What is the Big-O time and space complexity?`,
        },
        {
          phaseTitle: "Live Incident Debugging & Performance Triage",
          instruction: `
STAGE 4/4 (TECHNICAL - PRODUCTION TRIAGE & OPTIMIZATION):
- Acknowledge their analysis.
- Transition to a live triage scenario: "Your service is experiencing a 99th-percentile latency spike and intermittent 504 errors in production." Ask for their step-by-step diagnostic and remediation process.`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }
  }
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateCheck = checkRateLimit(`mock-converse:${userId}`, 30, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  const aiConfig = await getUserAIConfig(userId, undefined, { requireUserKey: true })
  if (!aiConfig) {
    return NextResponse.json(
      {
        error: "AI key required. Please configure your personal AI API key in Settings > AI Configuration for mock interviews.",
        code: "AI_KEY_REQUIRED",
      },
      { status: 400 }
    )
  }

  try {
    const rawBody = await request.json().catch(() => null)
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parseResult = ConversationTurnSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const body = parseResult.data
    const targetRole = sanitizeUntrustedContext(body.targetRole).trim() || "Software Engineer"
    const targetCompany = sanitizeUntrustedContext(body.targetCompany).trim() || "Top Tech Company"
    const {
      interviewType,
      interviewerTone,
      voiceGender,
      language,
      targetTurnCount,
      history,
      userAnswer,
    } = body

    // Calculate candidate answer count
    const candidatePastCount = history.filter((item) => item.role === "candidate").length
    const currentCandidateTurn = candidatePastCount + (userAnswer ? 1 : 0)
    const isFinalWrapUp = currentCandidateTurn >= targetTurnCount
    const currentQuestionNumber = Math.min(currentCandidateTurn + 1, targetTurnCount)

    // Retrieve candidate knowledge graph for personalized questioning
    const knowledgeGraph = await getCachedKnowledgeGraph(userId)
    const knownSkills = knowledgeGraph?.nodes
      .filter((n) => n.type === "skill")
      .map((n) => n.name)
      .slice(0, 8)
      .join(", ")

    const interviewerName =
      language === "en"
        ? voiceGender === "female"
          ? "Sarah"
          : "David"
        : voiceGender === "female"
        ? "তানিয়া"
        : "তানভীর"

    let toneInstructions = ""
    switch (interviewerTone) {
      case "strict":
        toneInstructions = `
PERSONA & TONE (Strict FAANG Bar Raiser / কড়া যাচাইকারী):
- You have an exceptionally high hiring bar (like Google/Meta Bar Raiser).
- Polite, razor-sharp, and direct. Probes edge cases, complexity, and concrete scalability limits.`
        break
      case "startup-cto":
        toneInstructions = `
PERSONA & TONE (Fast-Paced Startup CTO / দ্রুত ও প্র্যাকটিক্যাল লিড):
- Pragmatic, crisp, and focused on real-world shipping and production reliability over theoretical lectures.`
        break
      case "architect":
        toneInstructions = `
PERSONA & TONE (Principal Systems Architect / আর্কিটেকচার ও ট্রেড-অফ বিশেষজ্ঞ):
- Inquisitive and methodical. Focuses on distributed architecture, trade-offs, and failure handling.`
        break
      case "friendly":
      default:
        toneInstructions = `
PERSONA & TONE (Friendly & Encouraging Mentor / সহায়ক ও আন্তরিক লিড):
- Warm, supportive, and engaging. Builds confidence and guides smoothly between topics.`
        break
    }

    // Determine current interview stage & phase instructions dynamically based on archetype
    const currentPhaseDef = getTurnArchetypePhase({
      interviewType,
      currentCandidateTurn,
      targetTurnCount,
      interviewerName,
      targetRole,
      targetCompany,
    })

    const currentPhaseTitle = currentPhaseDef.phaseTitle
    const phaseInstruction = currentPhaseDef.instruction

    let languageInstructions = ""
    if (language === "bn") {
      languageInstructions = `
LANGUAGE INSTRUCTIONS (সহজ সাবলীল চলতি কথ্য বাংলা):
- সম্পূর্ণ স্বাভাবিক "চলতি কথ্য বাংলা" ব্যবহার করুন (যেমন: "দারুণ!", "আচ্ছা বুঝলাম", "আপনার ওই প্রজেক্টে...").
- টেকনিক্যাল শব্দগুলো (React, Redis, PostgreSQL, API, Microservices, Next.js, Docker) স্বাভাবিক ইংরেজি টেক টার্মেই বলুন।`
    } else if (language === "mixed") {
      languageInstructions = `
LANGUAGE INSTRUCTIONS (সহজ বাংলিশ ও দ্বিভাষিক ফ্রেন্ডলি কথোপকথন):
- একজন বন্ধুভাবাপন্ন বাংলাদেশি সিনিয়র ইঞ্জিনিয়ার যেভাবে অফিসে কথা বলেন সেভাবে কথা বলুন (বাংলা বাক্যের ভেতর ইংরেজি টেক টার্ম মিশিয়ে).
- যেমন: "দারুণ পয়েন্ট! ওই সার্ভিসে যখন হাই ট্রাফিক আসে তখন রেট লিমিটিং কীভাবে হ্যান্ডেল করেছিলেন?"`
    } else {
      languageInstructions = `
LANGUAGE INSTRUCTIONS (Natural Modern English):
- Speak with natural human cadence and clear conversational transitions.`
    }

    let targetAppIntel = ""
    if (body.applicationId) {
      try {
        const app = await withDbRetry(() =>
          prisma.application.findFirst({
            where: { id: body.applicationId, userId },
            include: { company: true, analysis: true },
          })
        )
        if (app) {
          const sanitizedCompanyName = sanitizeUntrustedContext(app.companyName)
          const sanitizedJobTitle = sanitizeUntrustedContext(app.jobTitle)
          const sanitizedNotes = sanitizeUntrustedContext(app.notes ? app.notes.slice(0, 500) : "Standard engineering role")
          const sanitizedCompanyNotes = app.company?.notes ? sanitizeUntrustedContext(app.company.notes.slice(0, 500)) : ""
          targetAppIntel = `
## APPLICATION-SPECIFIC CONTEXT FOR ${sanitizedCompanyName.toUpperCase()}:
- Role Applied: ${sanitizedJobTitle}
- Job Notes / Requirements: ${sanitizedNotes}
${sanitizedCompanyNotes ? `- Company Culture/Tech Notes: ${sanitizedCompanyNotes}` : ""}
${app.analysis?.jdKeywords ? `- Key JD Keywords: ${JSON.stringify(app.analysis.jdKeywords)}` : ""}
- Instruction: Tailor your questions specifically around this company's culture, tech requirements, and challenges.`
        }
      } catch (err) {
        console.error("Failed to load application intel for mock interview:", err)
      }
    }

    // Query past candidate weaknesses to probe actively during Turn 3 (or mid-interview)
    let weaknessProbingContext = ""
    if (currentQuestionNumber === 3 || (targetTurnCount <= 3 && currentQuestionNumber === 2)) {
      try {
        const { getUserWeaknesses, buildWeaknessProbingInstruction } = await import("@/lib/ai/memory")
        const pastWeaknesses = await getUserWeaknesses(userId, 3)
        if (pastWeaknesses && pastWeaknesses.length > 0) {
          weaknessProbingContext = buildWeaknessProbingInstruction(pastWeaknesses[0].content)
        }
      } catch (err) {
        console.warn("[Weakness Probing Load Warning]:", err)
      }
    }

    const systemPrompt = `You are ${interviewerName}, an Engineering Leader at ${targetCompany} conducting a live spoken voice mock interview for a ${targetRole} position.
Round: ${interviewType}
Target Questions: ${targetTurnCount} turns. Current Turn: Question ${currentQuestionNumber} of ${targetTurnCount}.

${toneInstructions}

${languageInstructions}
${targetAppIntel}
${weaknessProbingContext ? `\n${weaknessProbingContext}\n` : ""}
## INTERVIEW STRUCTURE & PHASE:
${phaseInstruction}

## STRICT CONVERSATIONAL VOICE RULES:
1. YOU ARE ON A LIVE SPOKEN CALL. Speak ONLY in 1 to 2 short, lifelike conversational sentences.
2. NEVER output markdown code blocks, JSON, suggestions tags, bullet points, asterisks (*), hashtags, or lists.
3. Use natural conversational nods at the start ("Got it.", "Makes sense!", "দারুণ!").
4. Candidate's Known Skills: ${knownSkills || "Fullstack Engineering"}.
5. Speech-to-Text Tolerance: Candidate's speech is captured via live STT. Intelligently interpret their core technical intent and ignore phonetic voice typos.
6. ${isFinalWrapUp ? "CRITICAL: DO NOT ASK A QUESTION. THIS IS THE FINAL WRAP-UP CLOSING." : "Ask ONE specific question aligned with the current stage."}`

    // Format conversation history with sanitization
    const formattedHistory = history.map((item) => ({
      role: item.role === "interviewer" ? ("assistant" as const) : ("user" as const),
      content: sanitizeUntrustedContext(item.text),
    }))

    const messages = [...formattedHistory]
    if (userAnswer && userAnswer.trim()) {
      messages.push({
        role: "user" as const,
        content: sanitizeUntrustedContext(userAnswer).trim(),
      })
    } else if (messages.length === 0) {
      messages.push({
        role: "user" as const,
        content: `Start the ${interviewType} mock interview for the ${targetRole} position at ${targetCompany}.`,
      })
    }

    let replyText = ""
    let fallbackTriggered = false

    try {
      const resilientResult = await resilientGenerateText({
        userId,
        systemPrompt,
        messages,
        temperature: 0.7,
        maxRetriesPerModel: 2,
        timeoutMs: 12000,
      })
      replyText = resilientResult.text
      fallbackTriggered = resilientResult.fallbackTriggered
    } catch (llmErr) {
      console.warn("All LLM providers failed in mock interview converse; using emergency dialogue engine:", llmErr)
      replyText = getEmergencyInterviewTurn(
        targetRole,
        targetCompany,
        currentPhaseTitle,
        currentQuestionNumber
      )
      fallbackTriggered = true
    }

    replyText = replyText.replace(/```(?:suggestions|json)?[\s\S]*?```/gi, "").trim()

    return NextResponse.json({
      reply: replyText,
      language,
      turnCount: messages.length,
      currentQuestionNumber,
      totalQuestions: targetTurnCount,
      currentPhase: currentPhaseTitle,
      isComplete: isFinalWrapUp,
      fallbackTriggered,
    })
  } catch (error) {
    console.error("Conversational interview fatal error:", error)
    return NextResponse.json(
      { error: "Failed to process conversational interview turn" },
      { status: 500 }
    )
  }
}
