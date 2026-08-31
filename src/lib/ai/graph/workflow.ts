import { StateGraph, START, END } from "@langchain/langgraph"
import { AgentState, type AgentStateType } from "./state"
import { createPlannerNode } from "./nodes/planner"
import { createExecutorNode } from "./nodes/executor"
import { createReflectionNode } from "./nodes/reflection"
import { createResponderNode } from "./nodes/responder"
import { memoryCheckpointer } from "./checkpointer"
import { getLangChainChatModel } from "./llm"
import type { AIProviderConfig } from "@/lib/ai/client"

/**
 * Builds and compiles the LangGraph StateGraph instance
 */
export function buildCareerAgentGraph(aiConfig: AIProviderConfig) {
  const model = getLangChainChatModel(aiConfig)

  const plannerNode = createPlannerNode(model)
  const executorNode = createExecutorNode()
  const reflectionNode = createReflectionNode()
  const responderNode = createResponderNode(model)

  const workflow = new StateGraph(AgentState)
    .addNode("planner", plannerNode)
    .addNode("executor", executorNode)
    .addNode("reflection", reflectionNode)
    .addNode("responder", responderNode)

    .addEdge(START, "planner")
    .addEdge("planner", "executor")
    .addEdge("executor", "reflection")

    .addConditionalEdges("reflection", (state: AgentStateType) => {
      // If reflection failed and needs retry on current step
      if (!state.reflection.passed) {
        return "executor"
      }

      // If more steps remain in plan
      if (state.plan && state.currentStepIndex < state.plan.length) {
        return "executor"
      }

      // All steps done -> synthesize response
      return "responder"
    })

    .addEdge("responder", END)

  return workflow.compile({
    checkpointer: memoryCheckpointer,
  })
}
