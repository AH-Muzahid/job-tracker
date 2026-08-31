/* eslint-disable @typescript-eslint/no-explicit-any */
import { Annotation } from "@langchain/langgraph"
import { BaseMessage } from "@langchain/core/messages"

export interface AgentPlanStep {
  id: string
  task: string
  status: "pending" | "in_progress" | "completed" | "failed"
  toolName?: string
  toolInput?: Record<string, any>
  result?: any
  error?: string
}

export interface AgentReflection {
  passed: boolean
  feedback?: string
  retryCount?: number
}

export interface AgentInterruptPayload {
  actionRequired: string
  title: string
  description?: string
  payload: Record<string, any>
}

/**
 * CareerTrack LangGraph Core Agent State Schema
 */
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),
  userId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  sessionId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  goal: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  plan: Annotation<AgentPlanStep[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  currentStepIndex: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
  reflection: Annotation<AgentReflection>({
    reducer: (_, update) => update,
    default: () => ({ passed: true, retryCount: 0 }),
  }),
  interruptData: Annotation<AgentInterruptPayload | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  responseContent: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
})

export type AgentStateType = typeof AgentState.State
