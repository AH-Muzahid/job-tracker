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
  targetTurnCount: z.number().int().min(1).max(25).optional().default(8),
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

import { getTurnArchetypePhase } from "./archetypes"

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

    // Calculate candidate answer count accurately without double-counting
    const candidatePastCount = history.filter((item) => item.role === "candidate").length
    const lastHistoryItem = history.length > 0 ? history[history.length - 1] : null
    const isCurrentAnswerInHistory =
      lastHistoryItem &&
      lastHistoryItem.role === "candidate" &&
      userAnswer &&
      lastHistoryItem.text.trim() === userAnswer.trim()

    const currentCandidateTurn = isCurrentAnswerInHistory
      ? candidatePastCount
      : candidatePastCount + (userAnswer && userAnswer.trim() ? 1 : 0)
    const isFinalWrapUp = currentCandidateTurn >= targetTurnCount - 1
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
LANGUAGE INSTRUCTIONS (কড়া নির্দেশ - সম্পূর্ণ চলতি কথ্য বাংলা):
- আপনি একজন বাংলাদেশি সিনিয়র ইঞ্জিনিয়ারিং লিড।
- আপনার প্রতিটি কথা ও প্রশ্ন ১০০% সাবলীল চলতি কথ্য বাংলায় লিখুন (যেমন: "দারুণ!", "বুঝতে পেরেছি।", "আপনার প্রজেক্টের আর্কিটেকচার নিয়ে কিছু বলুন...").
- শুধুমাত্র প্রোগ্রামিং এবং আর্কিটেকচারাল কীওয়ার্ড (যেমন: React, Next.js, Redux, PostgreSQL, API, Redis, Docker, Kafka) স্বাভাবিক ইংরেজি টেক টার্মে রাখবেন।
- কোনো বাক্য ইংরেজিতে বলা সম্পূর্ণ নিষিদ্ধ! ক্যান্ডিডেটকে বাংলায় ইন্টারভিউ নিতে হবে।`
    } else if (language === "mixed") {
      languageInstructions = `
LANGUAGE INSTRUCTIONS (সহজ দ্বিভাষিক বাংলিশ ও প্রফেশনাল কথ্য বাংলা):
- বাংলাদেশি টেক অফিসের সিনিয়র ইঞ্জিনিয়ার যেভাবে কথা বলেন, সেভাবে বাংলা বাক্যের মধ্যে স্বাভাবিক টেকনিক্যাল ইংরেজি শব্দ মিশিয়ে কথা বলুন।
- উদাহরণ: "দারুণ পয়েন্ট! ওই প্রজেক্টে যখন হাই ট্রাফিক আসত তখন ডেটা ক্যাশিং কীভাবে হ্যান্ডেল করেছিলেন?"
- বাক্য সবসময় বাংলায় শুরু ও শেষ করবেন। কোনো অবস্থাতেই পুরো বাক্য ইংরেজিতে বলবেন না।`
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
3. Use natural conversational nods at the start ("Got it.", "Makes sense!", "দারুণ!", "বুঝতে পেরেছি।").
4. Candidate's Known Skills: ${knownSkills || "Fullstack Engineering"}.
5. Speech-to-Text Tolerance: Candidate's speech is captured via live STT. Intelligently interpret their core technical intent and ignore phonetic voice typos.
6. ${isFinalWrapUp ? "CRITICAL: DO NOT ASK A QUESTION. THIS IS THE FINAL WRAP-UP CLOSING." : "Ask ONE specific question aligned with the current stage."}
7. LANGUAGE MANDATE (CRITICAL): ${
  language === "bn"
    ? "MANDATORY: Output strictly in colloquial Bengali (বাংলা). It is strictly forbidden to output English sentences. Keep technical terms (e.g. Next.js, API, Redis) in English."
    : language === "mixed"
    ? "MANDATORY: Output in conversational Bengali/Banglish (বাংলায় কথা বলুন টেক শব্দ ইংরেজিতে রেখে). Never output pure English sentences."
    : "Speak in clear, natural English."
}`

    // Format conversation history with sanitization and role alternation guarantee
    const messages: Array<{ role: "user" | "assistant"; content: string }> = []

    for (const item of history) {
      const role = item.role === "interviewer" ? ("assistant" as const) : ("user" as const)
      const content = sanitizeUntrustedContext(item.text).trim()
      if (!content) continue

      if (messages.length > 0 && messages[messages.length - 1].role === role) {
        messages[messages.length - 1].content += `\n${content}`
      } else {
        messages.push({ role, content })
      }
    }

    if (userAnswer && userAnswer.trim()) {
      const sanitizedUserAnswer = sanitizeUntrustedContext(userAnswer).trim()
      const langHint =
        language === "bn"
          ? "\n\n(অনুগ্রহ করে বাংলায় ১-২ বাক্যে উত্তর দিন ও পরবর্তী প্রশ্ন করুন)"
          : language === "mixed"
          ? "\n\n(দয়া করে বাংলিশ/বাংলায় ১-২ বাক্যে উত্তর দিন ও পরবর্তী প্রশ্ন করুন)"
          : ""
      const fullAnswerText = `${sanitizedUserAnswer}${langHint}`

      if (
        messages.length === 0 ||
        messages[messages.length - 1].role === "assistant"
      ) {
        messages.push({
          role: "user",
          content: fullAnswerText,
        })
      } else if (messages[messages.length - 1].content !== sanitizedUserAnswer) {
        messages[messages.length - 1].content += `\n${fullAnswerText}`
      }
    } else if (messages.length === 0) {
      const langPrompt =
        language === "bn"
          ? "দয়া করে সম্পূর্ণ সহজ সাবলীল চলতি কথ্য বাংলায় কথা বলুন এবং প্রথম প্রশ্নটি করুন।"
          : language === "mixed"
          ? "দয়া করে সাবলীল দ্বিভাষিক বাংলিশে (বাংলা বাক্যের ভেতর টেকনিক্যাল ইংরেজি শব্দ মিশিয়ে) কথা বলুন এবং প্রথম প্রশ্নটি করুন।"
          : "Please speak in clear, natural English and ask your opening question."

      messages.push({
        role: "user",
        content: `Start the ${interviewType} mock interview for the ${targetRole} position at ${targetCompany}. ${langPrompt}`.trim(),
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
        currentQuestionNumber,
        language
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
