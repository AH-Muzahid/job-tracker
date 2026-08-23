/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { getCachedKnowledgeGraph } from "@/lib/ai/knowledge-graph"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export interface ConversationTurnRequest {
  targetRole?: string
  targetCompany?: string
  interviewType?: "Technical" | "Behavioral" | "System Design" | "Leadership" | "General"
  interviewerTone?: "friendly" | "strict" | "startup-cto" | "architect"
  voiceGender?: "female" | "male"
  language?: "en" | "bn" | "mixed"
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
      history = [],
      userAnswer,
    } = body

    // Retrieve candidate knowledge graph for personalized questioning
    const knowledgeGraph = await getCachedKnowledgeGraph(userId)
    const knownSkills = knowledgeGraph?.nodes
      .filter((n) => n.type === "skill")
      .map((n) => n.name)
      .slice(0, 8)
      .join(", ")

    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as any,
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)

    let toneInstructions = ""
    switch (interviewerTone) {
      case "strict":
        toneInstructions = `
PERSONA & TONE (Strict FAANG Bar Raiser / কড়া যাচাইকারী):
- You have an exceptionally high hiring bar (like Google/Meta Bar Raiser).
- You are polite but uncompromising. Do not accept buzzwords, hand-waving, or vague high-level answers.
- When candidate answers, probe immediate edge cases, failure points, scalability limits, or algorithmic complexities.
- Verbal cues: "Okay, but what happens when...?", "Let's dig into that — how does that scale?", "What are the bottlenecks there?"`
        break
      case "startup-cto":
        toneInstructions = `
PERSONA & TONE (Fast-Paced Startup CTO / দ্রুত ও প্র্যাকটিক্যাল লিড):
- You are a pragmatic, speed-driven engineering leader.
- You care deeply about real-world shipping, debugging production incidents, and practical delivery over academic theory.
- Direct, crisp, energetic.
- Verbal cues: "Got it. How do we ship that by Friday?", "Makes sense — how did you test that in prod?", "Fair enough, what was the biggest bug you hit?"`
        break
      case "architect":
        toneInstructions = `
PERSONA & TONE (Principal Systems Architect / আর্কিটেকচার ও ট্রেড-অফ বিশেষজ্ঞ):
- You think in distributed systems, CAP theorem, data consistency, caching layers, and latency trade-offs.
- Inquisitive and methodical. Always ask candidate about why they picked X over Y and what the trade-offs were.
- Verbal cues: "Interesting trade-off. Why not Redis here?", "What happens on network partition?", "Walk me through the database write path."`
        break
      case "friendly":
      default:
        toneInstructions = `
PERSONA & TONE (Friendly & Encouraging Mentor / সহায়ক ও আন্তরিক লিড):
- Warm, supportive, and engaging. You want the candidate to succeed and feel comfortable.
- Acknowledge good points enthusiastically before transitioning to the next question.
- Verbal cues: "Great point!", "That makes a lot of sense.", "Nice! Now let's explore...", "দারুণ বলেছেন!"`
        break
    }

    let languageInstructions = ""
    if (language === "bn") {
      languageInstructions = `
LANGUAGE INSTRUCTIONS (সহজ সাবলীল চলতি কথ্য বাংলা):
- সম্পূর্ণ স্বাভাবিক "চলতি কথ্য বাংলা" ব্যবহার করুন (যেমন: "দারুণ!", "আচ্ছা বুঝলাম", "আপনার ওই প্রজেক্টে...").
- কোনো সাধু ভাষা বা বইয়ের পড়ার মতো জড়তা পরিহার করুন।
- টেকনিক্যাল শব্দগুলো (React, Redis, PostgreSQL, API, Microservices, Thread, Concurrency) স্বাভাবিক ইংরেজি টেক টার্মেই বলুন।`
    } else if (language === "mixed") {
      languageInstructions = `
LANGUAGE INSTRUCTIONS (সহজ বাংলিশ ও দ্বিভাষিক ফ্রেন্ডলি কথোপকথন):
- একজন বন্ধুভাবাপন্ন বাংলাদেশি সিনিয়র ইঞ্জিনিয়ার যেভাবে অফিসে কথা বলেন সেভাবে কথা বলুন (বাংলা বাক্যের ভেতর ইংরেজি টেক টার্ম মিশিয়ে).
- যেমন: "দারুণ পয়েন্ট! ওই সার্ভিসে যখন হাই ট্রাফিক আসে তখন রেট লিমিটিং কীভাবে হ্যান্ডেল করেছিলেন?"`
    } else {
      languageInstructions = `
LANGUAGE INSTRUCTIONS (Natural Modern English):
- Speak with natural human cadence, conversational fillers, and genuine curiosity.
- Avoid formal academic phrasing or robotic interview templates.`
    }

    const interviewerName =
      language === "en"
        ? voiceGender === "female"
          ? "Sarah"
          : "David"
        : voiceGender === "female"
        ? "তানিয়া"
        : "তানভীর"

    const systemPrompt = `You are ${interviewerName}, an Engineering Leader at ${targetCompany} conducting a live spoken voice mock interview for a ${targetRole} position.
Round: ${interviewType}

${toneInstructions}

${languageInstructions}

## STRICT CONVERSATIONAL VOICE RULES:
1. YOU ARE ON A LIVE SPOKEN CALL. Speak ONLY in 1 to 2 short, lifelike conversational sentences.
2. NEVER output markdown code blocks, JSON, suggestions tags, bullet points, asterisks (*), hashtags, or lists.
3. Use natural conversational nods at the start of your turn ("Got it.", "Makes sense!", "Alright.", "দারুণ!") before asking the next question.
4. If this is the start: Greet warmly in 1 short sentence and ask a friendly opening question.
5. Candidate's Known Skills/Stack: ${knownSkills || "Fullstack Engineering"}.
6. Speech-to-Text (STT) Tolerance: Candidate's speech is captured via live voice recognition which may have phonetic Bengali spellings for English tech words (e.g. 'রিড্যাক্স' = Redux, 'এপিআই' = API, 'নেক্সট জেএস' = Next.js, 'পোস্টগ্রেস' = PostgreSQL, 'স্টেট ম্যানেজমেন্ট' = State Management). Intelligently interpret their true technical intent and never comment on transcription typos.
7. Keep every turn concise so the voice back-and-forth feels instantaneous and real.`

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

    const response = await generateText({
      model: targetModel,
      system: systemPrompt,
      messages,
      temperature: 0.7,
    })

    let replyText = response.text.trim()
    // Strip any accidental markdown codeblocks, suggestions tags, or raw json
    replyText = replyText.replace(/```(?:suggestions|json)?[\s\S]*?```/gi, "").trim()

    return NextResponse.json({
      reply: replyText,
      language,
      turnCount: messages.length,
    })
  } catch (error) {
    console.error("Conversational interview error:", error)
    return NextResponse.json({ error: "Failed to generate conversational interview turn" }, { status: 500 })
  }
}
