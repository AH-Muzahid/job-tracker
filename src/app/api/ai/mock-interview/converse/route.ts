/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { getSystemBase } from "@/lib/ai/prompts/system-base"
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
LANGUAGE INSTRUCTION: You MUST conduct the entire interview in natural, friendly conversational Bengali (বাংলা).
- Use polite and professional Bengali (e.g., আপনি, আপনার অভিজ্ঞতা).
- Speak naturally like a senior tech interviewer from Dhaka/Bangalore conducting a tech interview in Bengali.
- Keep technical terms (e.g., API, Redis, Database, Concurrency) in English/phonetic Bengali as appropriate.`
    } else if (language === "mixed") {
      languageInstructions = `
LANGUAGE INSTRUCTION: You MUST conduct the interview in fluent, natural Bengali-English mixed (Bilingual/Banglish conversational style).
- Speak warmly in conversational Bangla with English tech terminology (e.g., "বেশ ভালো পয়েন্ট। Redis Streams নিয়ে যখন কাজ করছিলেন, তখন partition বা data loss কীভাবে handle করেছেন?").`
    } else {
      languageInstructions = `
LANGUAGE INSTRUCTION: Conduct the interview in clear, friendly, and professional international English.
- Speak in a natural, calm, pacing-conscious human interviewer tone.`
    }

    const systemPrompt = `${getSystemBase()}

You are an expert Engineering Leader & Hiring Bar Raiser at ${targetCompany} interviewing a candidate for the role of ${targetRole}.
Interview Type: ${interviewType}

${languageInstructions}

## INTERACTION GUIDELINES:
1. Speak in a natural, human, conversational cadence (NOT a robotic questionnaire).
2. If this is the START of the interview (no history):
   - Greet warmly, introduce the interview scope in 1-2 friendly sentences.
   - Ask the opening question (e.g. background overview or primary technical challenge).
3. If the candidate just answered:
   - Provide a brief, natural verbal nod or acknowledgement (1 short sentence, e.g. "That's a very practical approach to caching").
   - Follow up with a sharp, insightful technical or behavioral deep-dive question based directly on what they said.
   - Or transition smoothly to the next architectural/scenario question if their answer was complete.
4. Candidate's Known Skills/Stack from Knowledge Graph: ${knownSkills || "General Software Engineering"}.
5. Keep your response concise (2-4 sentences max), so it sounds natural when spoken aloud over Text-to-Speech.`

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

    const replyText = response.text.trim()

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
