import { generateText } from "ai"
import { getProvider } from "./client"
import { getUserAIConfig } from "./config"
import { prisma } from "@/lib/prisma"

/**
 * Intelligent heuristic fallback for generating clean 2-4 word chat titles
 */
export function generateHeuristicTitle(prompt: string): string {
  const clean = prompt.trim().replace(/^["'`]|["'`]$/g, "")
  const lower = clean.toLowerCase()

  // 1. Job Description Analysis
  if (lower.includes("job description") || lower.startsWith("analyze this") || lower.includes("jd")) {
    const compMatch = clean.match(/(?:at|for|company:?)\s+([A-Z][A-Za-z0-9\s&.-]{2,25})/i)
    if (compMatch?.[1]) {
      return `${compMatch[1].trim()} JD Review`
    }
    return "Job Description Review"
  }

  // 2. Cold Outreach / Email
  if (lower.includes("outreach") || lower.includes("cold email") || lower.includes("cover letter") || lower.includes("draft a professional") || lower.includes("draft an email")) {
    const compMatch = clean.match(/(?:for|to|at)\s+(?:the\s+)?([A-Z][A-Za-z0-9\s&.-]{2,25})/i)
    if (compMatch?.[1]) {
      return `${compMatch[1].trim()} Outreach`
    }
    return "Outreach Email Draft"
  }

  // 3. System Design & Diagrams
  if (lower.includes("diagram") || lower.includes("websocket") || lower.includes("architecture") || lower.includes("system design")) {
    if (lower.includes("websocket") || lower.includes("we socket")) return "WebSocket Architecture"
    if (lower.includes("oauth") || lower.includes("auth")) return "Auth Flow Diagram"
    if (lower.includes("pipeline") || lower.includes("ci/cd")) return "CI/CD Pipeline Design"
    return "System Architecture Diagram"
  }

  // 4. Interview Prep
  if (lower.includes("interview") || lower.includes("mock") || lower.includes("questions")) {
    const compMatch = clean.match(/(?:for|at)\s+([A-Z][A-Za-z0-9\s&.-]{2,25})/i)
    if (compMatch?.[1]) {
      return `${compMatch[1].trim()} Interview Prep`
    }
    return "Interview Preparation"
  }

  // 5. Resume & Portfolio
  if (lower.includes("resume") || lower.includes("cv") || lower.includes("portfolio")) {
    return "Resume Review & Polish"
  }

  // 6. Greetings / Casual
  if (lower === "hi" || lower === "hi bro" || lower === "hello" || lower === "hey" || lower.startsWith("hi ") || lower.startsWith("hello ")) {
    return "Career Strategy Chat"
  }

  // 7. General concise fallback (first 3-5 words without trailing punctuation)
  const words = clean.split(/\s+/).slice(0, 4).join(" ")
  return words.length > 35 ? words.slice(0, 35) + "..." : words || "New Chat"
}

export async function generateAndSaveSessionTitle(
  sessionId: string,
  userMessage: string,
  assistantResponse?: string
): Promise<void> {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    })
    if (!session?.userId) return

    const aiConfig = await getUserAIConfig(session.userId)
    if (!aiConfig?.apiKey) {
      const fallbackTitle = generateHeuristicTitle(userMessage)
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: fallbackTitle },
      })
      return
    }

    const resolved = getProvider(aiConfig)
    const modelToUse = aiConfig.model || resolved.defaultModel

    let smartTitle = ""
    try {
      const { text } = await generateText({
        model: resolved.model(modelToUse),
        system:
          "You are an expert title generator. Create a short, highly meaningful, professional 2 to 4 word title for this chat conversation. Return ONLY the 2-4 word title with NO quotes, NO markdown, and NO period at the end.",
        prompt: `User request: "${userMessage.slice(0, 250)}"\nAssistant output summary: "${assistantResponse?.slice(0, 200) || ""}"\nTitle:`,
        temperature: 0.2,
      })

      smartTitle = text.replace(/["'*#.]/g, "").trim()
    } catch {
      // Fallback to heuristic
    }

    if (!smartTitle || smartTitle.length < 3 || smartTitle.length > 50 || smartTitle.toLowerCase().includes("user request")) {
      smartTitle = generateHeuristicTitle(userMessage)
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: smartTitle },
    })
  } catch (err) {
    console.error("Failed to generate or save session title:", err)
    // Emergency heuristic fallback directly in DB
    try {
      const fallbackTitle = generateHeuristicTitle(userMessage)
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: fallbackTitle },
      })
    } catch {}
  }
}
