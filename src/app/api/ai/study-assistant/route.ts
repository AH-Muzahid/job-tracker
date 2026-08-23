/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getInternalUserId } from "@/lib/auth"
import { getProvider } from "@/lib/ai/client"
import { getUserAIConfig } from "@/lib/ai/config"
import { getCachedKnowledgeGraph } from "@/lib/ai/knowledge-graph"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export interface StudyQueryRequest {
  topic?: string
  question: string
  language?: "en" | "bn" | "mixed"
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
}

export async function POST(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rateCheck = checkRateLimit(`ai-study:${userId}`, 30, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  const aiConfig = await getUserAIConfig(userId)
  if (!aiConfig) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 400 })
  }

  try {
    const body: StudyQueryRequest = await request.json()
    const { topic = "General", question, language = "mixed", conversationHistory = [] } = body

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const knowledgeGraph = await getCachedKnowledgeGraph(userId)
    const knownSkills = knowledgeGraph?.nodes
      .filter((n) => n.type === "skill")
      .map((n) => n.name)
      .slice(0, 10)
      .join(", ")

    const resolvedProvider = getProvider({
      providerType: aiConfig.providerType as any,
      apiKey: aiConfig.apiKey,
      baseUrl: aiConfig.baseUrl,
      model: aiConfig.model,
    })

    const targetModel = resolvedProvider.model(aiConfig.model || resolvedProvider.defaultModel)

    let languageRule = ""
    if (language === "bn") {
      languageRule = "বাংলা ভাষায় সহজ সাবলীল ভাষায় ব্যাখ্যা দিন। টেকনিক্যাল শব্দগুলো (যেমন React, Next.js, API, Indexing, Goroutines) ইংরেজি টেক টার্মে রাখুন।"
    } else if (language === "mixed") {
      languageRule = "সহজ বাংলিশ ও বাংলা-ইংরেজি মিশ্রিত ভাষায় প্র্যাকটিক্যালভাবে ব্যাখ্যা করুন, যেভাবে সফটওয়্যার ইঞ্জিনিয়ারিং টিম আলোচনা করে।"
    } else {
      languageRule = "Explain in natural, structured, high-clarity professional English."
    }

    const systemPrompt = `You are a Principal Tech Interview Coach and Senior Staff Engineer.
Your goal is to deeply educate the candidate on software engineering, system design, data structures, fullstack development, databases, and behavioral interview mastery.
Topic Focus: ${topic}
Candidate Skills: ${knownSkills || "Software Engineering"}
Language preference: ${languageRule}

When explaining any concept or answering a question:
1. Provide a crystal-clear, high-yield mental model of the core concept.
2. Provide concrete real-world production examples or clean code snippets (in TypeScript/React/Node/SQL/Go as appropriate).
3. Highlight architectural trade-offs, scalability considerations, and common pitfalls.
4. Give a dedicated "💡 How to Answer in an Interview" tip (e.g. structured bullet points a candidate can verbalize to impress a Staff/Principal interviewer).
5. Format your output with clean, beautiful GitHub markdown, bold headers, and crisp code blocks.`

    const messages = [
      ...conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      {
        role: "user" as const,
        content: `Topic: ${topic}\nQuestion: ${question}`,
      },
    ]

    const response = await generateText({
      model: targetModel,
      system: systemPrompt,
      messages,
      temperature: 0.7,
    })

    return NextResponse.json({
      answer: response.text,
      topic,
      suggestedFollowUps: [
        "What are the main performance trade-offs?",
        "How would you test and monitor this in production?",
        "What edge cases should I mention during the interview?",
      ],
    })
  } catch (error) {
    console.error("AI Study Assistant error:", error)
    return NextResponse.json(
      { error: "Failed to generate study answer" },
      { status: 500 }
    )
  }
}
