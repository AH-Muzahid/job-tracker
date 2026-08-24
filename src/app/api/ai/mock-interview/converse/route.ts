import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { getUserAIConfig } from "@/lib/ai/config"
import { getCachedKnowledgeGraph } from "@/lib/ai/knowledge-graph"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { resilientGenerateText, getEmergencyInterviewTurn } from "@/lib/ai/resilience"

import { prisma, withDbRetry } from "@/lib/prisma"

export interface ConversationTurnRequest {
  targetRole?: string
  targetCompany?: string
  interviewType?: "Technical" | "Behavioral" | "System Design" | "Leadership" | "General"
  interviewerTone?: "friendly" | "strict" | "startup-cto" | "architect"
  voiceGender?: "female" | "male"
  language?: "en" | "bn" | "mixed"
  targetTurnCount?: number
  applicationId?: string
  history: Array<{ role: "interviewer" | "candidate"; text: string }>
  userAnswer?: string
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateCheck = checkRateLimit(`mock-converse:${userId}`, 30, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  const aiConfig = await getUserAIConfig(userId)
  if (!aiConfig) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 400 })
  }

  try {
    const body: ConversationTurnRequest = await request.json()
    const {
      targetRole = "Software Engineer",
      targetCompany = "Top Tech Company",
      interviewType = "Technical",
      interviewerTone = "friendly",
      voiceGender = "female",
      language = "en",
      targetTurnCount = 5,
      history = [],
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

    // Determine current interview stage & phase instructions
    let phaseInstruction = ""
    let currentPhaseTitle = "Warm-up & Introduction"

    if (currentCandidateTurn === 0) {
      currentPhaseTitle = "Warm-up & Introduction"
      phaseInstruction = `
STAGE 1/5: GREETING & ICEBREAKER
- Greet the candidate in 1 sentence, introduce yourself briefly as ${interviewerName}, and ask them to briefly introduce their background and the main tech stack they work with.`
    } else if (currentCandidateTurn === 1) {
      currentPhaseTitle = "Core Technical Architecture"
      phaseInstruction = `
STAGE 2/5: CORE TECHNICAL ARCHITECTURE & STACK
- Acknowledge their introduction in 3-4 words.
- Transition directly into a CORE technical question regarding ${targetRole} and their stack (e.g. React/Next.js state flow, API design, database schemas, or async handling).`
    } else if (currentCandidateTurn === 2) {
      currentPhaseTitle = "Deep-Dive & Trade-offs"
      phaseInstruction = `
STAGE 3/5: DEEP-DIVE & TRADE-OFFS
- Acknowledge their previous answer.
- Move to a practical trade-off or edge-case challenge (e.g. caching strategies, data consistency, race conditions, or optimization under high load). Do not loop indefinitely on the same sub-topic.`
    } else if (currentCandidateTurn === 3) {
      currentPhaseTitle = "Problem-Solving & Incident Handling"
      phaseInstruction = `
STAGE 4/5: SYSTEM SCALING & INCIDENT RESOLUTION
- Acknowledge their answer.
- Transition to a new dimension: ask a practical real-world scenario (e.g. diagnosing a live production incident, scaling bottleneck, or handling technical debt under tight deadlines).`
    } else {
      currentPhaseTitle = "Wrap-Up & Closing Sign-Off"
      phaseInstruction = `
STAGE 5/5: FINAL WRAP-UP & CONCLUSION (CRITICAL RULE):
- THIS IS THE END OF THE INTERVIEW. DO NOT ASK ANY MORE QUESTIONS!
- Warmly thank the candidate for their time, highlight that they communicated their points well, and state that the interview is now concluded.
- Verbal cues: "That brings us to the end of our interview today! Thank you so much for your time and thoughtful responses. I am preparing your performance evaluation report now." / (বাংলায়: "চমৎকার! আমাদের আজকের ইন্টারভিউ সেশন এখানেই শেষ হচ্ছে। আপনার মূল্যবান সময় ও চমৎকার উত্তরের জন্য অনেক ধন্যবাদ। আমি এখন আপনার ইভ্যালুয়েশন রিপোর্ট রেডি করছি।")`
    }

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
          targetAppIntel = `
## APPLICATION-SPECIFIC CONTEXT FOR ${app.companyName.toUpperCase()}:
- Role Applied: ${app.jobTitle}
- Job Notes / Requirements: ${app.notes ? app.notes.slice(0, 500) : "Standard engineering role"}
${app.company?.notes ? `- Company Culture/Tech Notes: ${app.company.notes}` : ""}
${app.analysis?.jdKeywords ? `- Key JD Keywords: ${JSON.stringify(app.analysis.jdKeywords)}` : ""}
- Instruction: Tailor your questions specifically around this company's culture, tech requirements, and challenges.`
        }
      } catch (err) {
        console.error("Failed to load application intel for mock interview:", err)
      }
    }

    const systemPrompt = `You are ${interviewerName}, an Engineering Leader at ${targetCompany} conducting a live spoken voice mock interview for a ${targetRole} position.
Round: ${interviewType}
Target Questions: ${targetTurnCount} turns. Current Turn: Question ${currentQuestionNumber} of ${targetTurnCount}.

${toneInstructions}

${languageInstructions}
${targetAppIntel}

## INTERVIEW STRUCTURE & PHASE:
${phaseInstruction}

## STRICT CONVERSATIONAL VOICE RULES:
1. YOU ARE ON A LIVE SPOKEN CALL. Speak ONLY in 1 to 2 short, lifelike conversational sentences.
2. NEVER output markdown code blocks, JSON, suggestions tags, bullet points, asterisks (*), hashtags, or lists.
3. Use natural conversational nods at the start ("Got it.", "Makes sense!", "দারুণ!").
4. Candidate's Known Skills: ${knownSkills || "Fullstack Engineering"}.
5. Speech-to-Text Tolerance: Candidate's speech is captured via live STT. Intelligently interpret their core technical intent and ignore phonetic voice typos.
6. ${isFinalWrapUp ? "CRITICAL: DO NOT ASK A QUESTION. THIS IS THE FINAL WRAP-UP CLOSING." : "Ask ONE specific question aligned with the current stage."}`

    // Format conversation history
    const formattedHistory = history.map((item) => ({
      role: item.role === "interviewer" ? ("assistant" as const) : ("user" as const),
      content: item.text,
    }))

    const messages = [...formattedHistory]
    if (userAnswer && userAnswer.trim()) {
      messages.push({
        role: "user" as const,
        content: userAnswer.trim(),
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
