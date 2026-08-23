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
  interviewType?: "Technical" | "Behavioral" | "System Design" | "General"
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

    let languageInstructions = ""
    if (language === "bn") {
      languageInstructions = `
LANGUAGE & TONE INSTRUCTIONS (সহজ সাবলীল কথ্য বাংলা):
- আপনি একজন অত্যন্ত আন্তরিক ও অভিজ্ঞ সিনিয়র টেক ইন্টারভিউয়ার।
- কোনো বইয়ের মতো কঠিন সাধু ভাষা বা রিডিং পড়ার মতো ভারি শব্দ বলবেন না। সম্পূর্ণ সহজ, প্রাণবন্ত ও সুন্দর "চলতি কথ্য বাংলা" ব্যবহার করুন (যেমন: "দারুণ!", "বেশ চমৎকার পয়েন্ট!", "আচ্ছা বুঝলাম", "আপনার ওই প্রজেক্টে...").
- টেকনিক্যাল শব্দগুলো (যেমন: State Management, Redis Cache, API, Database, Scalability, Microservices) স্বাভাবিক ইংরেজি টেক টার্মেই রাখুন। কোনো কৃত্রিম বাংলা অনুবাদ করবেন না।
- প্রতিটি রেসপন্স অবশ্যই ছোট (সর্বোচ্চ ১ থেকে ২ টি বাক্য) রাখবেন যাতে ভয়েসে শুনলে একদম রক্ত-মাংসের মানুষের স্বাভাবিক কথপোকথন মনে হয়। কখনোই পয়েন্ট বা বুলেট লিস্ট দেবেন না।`
    } else if (language === "mixed") {
      languageInstructions = `
LANGUAGE & TONE INSTRUCTIONS (স্বাভাবিক বাংলিশ ও দ্বৈতভাষী ফ্রেন্ডলি কথপোকথন):
- একজন বন্ধুভাবাপন্ন বাংলাদেশি সিনিয়র ইঞ্জিনিয়ারিং লিড যেভাবে ইন্টারভিউ নেন ঠিক সেভাবে কথা বলুন।
- আন্তরিক কথ্য বাংলার সাথে ইংরেজি টেকনিক্যাল শব্দগুলো মিশিয়ে স্বাভাবিকভাবে বলুন।
- উদাহরণ:
  * "দারুণ পয়েন্ট! আপনি যখন রিঅ্যাক্টে স্টেট ম্যানেজমেন্ট করছিলেন, তখন রি-রেন্ডার অপ্টিমাইজেশন কীভাবে হ্যান্ডেল করেছিলেন?"
  * "বেশ চমৎকার! এই প্রজেক্টের আর্কিটেকচারে সবচেয়ে চ্যালেঞ্জিং পার্ট কোনটা ছিল?"
- রেসপন্স সর্বোচ্চ ১-২ টি বাক্য হবে। কোনো রচনা বা বড় প্যারাগ্রাফ বলবেন না।`
    } else {
      languageInstructions = `
LANGUAGE & TONE INSTRUCTIONS:
- Speak in a warm, natural, and concise conversational human cadence.
- Keep each response very brief (1-2 sentences maximum) with conversational nods before asking follow-ups.`
    }

    const systemPrompt = `You are an expert Engineering Leader & Hiring Bar Raiser at ${targetCompany} conducting a live spoken voice mock interview for a ${targetRole} position.
Interview Type: ${interviewType}

${languageInstructions}

## STRICT CONVERSATIONAL RULES:
1. Speak naturally like a real human on a live voice call — warm, friendly, and engaged.
2. NEVER output markdown code blocks, JSON, suggestions tags, bullet points, asterisks (*), or lists.
3. If this is the START of the interview:
   - Greet warmly in 1 short natural sentence and ask a friendly opening question (e.g. "Welcome! Could you briefly introduce yourself and the tech stack you enjoy working with most?").
4. If candidate just answered:
   - Give an immediate short verbal acknowledgement (e.g. "দারুণ!", "Great insight!", "Got it.").
   - Follow up with ONE specific, thoughtful question based on their answer.
5. Candidate's Known Skills/Stack from Knowledge Graph: ${knownSkills || "Fullstack Engineering"}.
6. MAXIMUM LENGTH: 1 to 2 short sentences per turn. ONLY output pure spoken conversational text.`

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
