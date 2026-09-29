/* eslint-disable @typescript-eslint/no-explicit-any */
import { SystemMessage, HumanMessage } from "@langchain/core/messages"
import type { AgentStateType, AgentPlanStep } from "../state"
import type { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { getCachedSessionSummary } from "@/lib/ai/conversation-summarizer"
import { extractJsonObject } from "@/lib/ai/json-extractor"
import { getToolCatalogForPlanner } from "../tools/tool-manifest"
import { getChatPolicyPack } from "@/lib/ai/prompts/system-base"
import { sanitizeUntrustedContext } from "@/lib/ai/context-builder"
import { GREETING_REGEX, MAX_PLAN_STEPS, PLANNING_ERROR_FALLBACK } from "../constants"

export function getPlannerSystemPrompt(): string {
  return `${getChatPolicyPack()}

You are the CareerTrack AI Autonomous Master Planner.
Your purpose is to act as a proactive career operating agent. Rather than being a passive autocomplete bot, you break down user goals into concrete, tool-grounded execution steps.

AUTONOMOUS PLANNING DIRECTIVES:
1. Proactive Tool Orchestration:
   - When the user asks to write an outreach email, cover letter, or application message (e.g. "Defdone er apply korar jonne mail lekho", "Draft email for Stripe", "Help me apply to Google", "cold email to Vercel"):
     Do NOT return empty steps! Formulate a proactive multi-step pipeline:
     - Step 1: "searchApplications" with { "query": "<Company>" } (check existing tracking history)
     - Step 2: "getUserMemories" with { "category": "skill" } (retrieve verified background)
     - Step 3: "draftOutreachEmail" with { "companyName": "<Company>", "role": "<Role>" } (generate structured email package)
   - When the user asks to search, find, or discover jobs (e.g. "find react jobs in Berlin", "remote rust role khojo"):
     - Step: "searchExternalJobs" with { "query": "...", "location": "..." }
   - When the user asks about their applications, pipeline stats, or application counts (e.g. "how many applied", "dekhao kothai apply korsi", "pipeline status"):
     - Step: "listUserApplications" or "getPipelineStats"
   - When the user asks to track, add, or update an application (e.g. "Google e apply korlam", "track Stripe as Applied"):
     - Step: "createApplication" or "updateApplicationStatus"
   - When the user asks to tailor a resume or analyze JD alignment:
     - Step 1: "queryCareerKnowledgeGraph" or "getUserProfile"
     - Step 2: "tailorResumeForJob"
   - When the user asks about company background, interview rounds, or prep notes:
     - Step: "researchCompanyIntel" or "getPrepNotes"

2. Multilingual & Banglish Intent Recognition:
   - Bengali / Banglish:
     - "mail lekho" / "email lekho" / "mail likhe dao" -> draft outreach email pipeline
     - "apply kora ache kina dekho" / "khojo" -> search applications / external jobs
     - "track koro" / "save koro" -> create application
     - "amar ki ki skill ache" / "profile dekho" -> getUserProfile / getUserMemories
   - Extract parameters carefully (company name, role, status).

3. When to return steps: []:
   - ONLY return "steps": [] if the user's message is strictly a greeting (e.g. "hi", "hello", "hey", "assalamu alaikum"), casual chit-chat ("thank you", "ok got it"), or answering a clarifying question without requesting an action.

4. Plan Efficiency:
   - Formulate focused plans with 1 to ${MAX_PLAN_STEPS} steps.
   - Extract parameters from user request and active screen context. Never invent fake IDs.

Available Tools:
${getToolCatalogForPlanner()}

Output strictly valid JSON with the format:
{
  "goal": "Summary of user goal",
  "steps": [
    {
      "id": "step-1",
      "task": "Description of step",
      "toolName": "toolName or null",
      "toolInput": {}
    }
  ]
}
`
}

export function createPlannerNode(model: BaseChatModel) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const lastUserMessage = state.messages
      .slice()
      .reverse()
      .find((m) => m._getType() === "human" || (m as any).role === "user")

    const rawUserText = lastUserMessage ? String(lastUserMessage.content) : state.goal || ""
    const userText = sanitizeUntrustedContext(rawUserText)

    // Fast-path: Greetings or brief conversational queries don't need tool execution
    const cleanUserText = userText.trim().toLowerCase()
    const isGreeting = GREETING_REGEX.test(cleanUserText)
    if (isGreeting) {
      return {
        goal: userText,
        plan: [],
        currentStepIndex: 0,
      }
    }

    const sessionSummary = state.sessionId ? await getCachedSessionSummary(state.sessionId).catch(() => null) : null

    let routeContextText = ""
    if (state.routeContext) {
      const { currentRoute, entityType, entityId, entitySummary, metadata } = state.routeContext as any
      const sanitizedSummary = entitySummary ? sanitizeUntrustedContext(JSON.stringify(entitySummary)) : ""

      routeContextText = `Active Screen Context:\n- Route: ${currentRoute || "Unknown"}`
      if (entityType) routeContextText += `\n- Entity Type: ${entityType}`
      if (entityId) routeContextText += `\n- Entity ID: ${entityId}`
      if (metadata?.candidate) {
        routeContextText += `\n- Candidate Background: ${sanitizeUntrustedContext(metadata.candidate)}`
      }
      if (sanitizedSummary) {
        routeContextText += `\n- Entity Details:\n<untrusted_content>\n${sanitizedSummary}\n</untrusted_content>`
      }
      routeContextText += "\n\n"
    }

    const summarySection = sessionSummary ? `Previous Session Context Summary:\n${sessionSummary}\n\n` : ""
    const promptText = `${summarySection}${routeContextText}User Request: "${userText}"`

    try {
      const systemPrompt = getPlannerSystemPrompt()
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(promptText),
      ])

      const content = String(response.content)
      const parsed = extractJsonObject<{ goal?: string; steps?: any[] }>(content)

      if (parsed) {
        const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : []
        const validSteps: AgentPlanStep[] = rawSteps
          .filter((s: any) => s && (s.toolName || s.task))
          .slice(0, MAX_PLAN_STEPS)
          .map((s: any, idx: number) => ({
            id: s.id || `step-${idx + 1}`,
            task: s.task || "Execute task",
            status: "pending",
            toolName: s.toolName || undefined,
            toolInput: typeof s.toolInput === "object" && s.toolInput !== null ? s.toolInput : {},
          }))

        return {
          goal: parsed.goal || userText,
          plan: validSteps,
          currentStepIndex: 0,
        }
      }

      // If model returned text that did not contain valid JSON on an actionable request, fail closed
      console.warn("[Planner Parse Failure]: LLM did not return parseable JSON for:", userText)
      return {
        goal: userText,
        plan: [],
        currentStepIndex: 0,
        responseContent: PLANNING_ERROR_FALLBACK,
      }
    } catch (err) {
      console.warn("[Planner Node Error]:", err)
      return {
        goal: userText,
        plan: [],
        currentStepIndex: 0,
        responseContent: PLANNING_ERROR_FALLBACK,
      }
    }
  }
}
