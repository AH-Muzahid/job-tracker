import { StateGraph, START, END } from "@langchain/langgraph"
import { AgentState, type AgentStateType } from "./state"
import { createPlannerNode } from "./nodes/planner"
import { createExecutorNode } from "./nodes/executor"
import { createReflectionNode } from "./nodes/reflection"
import { createReplannerNode } from "./nodes/replanner"
import { createResponderNode } from "./nodes/responder"
import { getGraphCheckpointer } from "./checkpointer"
import { getLangChainChatModel } from "./llm"
import type { AIProviderConfig } from "@/lib/ai/client"

/**
 * Builds and compiles the LangGraph StateGraph instance with persistent checkpointer
 */
export async function buildCareerAgentGraph(
  aiConfig: AIProviderConfig,
  callbacks?: {
    modelName?: string
    onToken?: (delta: string) => void
  }
) {
  const model = getLangChainChatModel(aiConfig, { streaming: true, modelName: callbacks?.modelName })

  const plannerNode = createPlannerNode(model)
  const executorNode = createExecutorNode()
  const reflectionNode = createReflectionNode()
  const replannerNode = createReplannerNode(model)
  const responderNode = createResponderNode(model, callbacks?.onToken)

  const workflow = new StateGraph(AgentState)
    .addNode("planner", plannerNode)
    .addNode("executor", executorNode)
    .addNode("reflector", reflectionNode)
    .addNode("replanner", replannerNode)
    .addNode("responder", responderNode)

    .addEdge(START, "planner")
    .addConditionalEdges("planner", (state: AgentStateType) => {
      // Fast path: If plan has no tools (e.g. conversational turn, greeting, direct answer), route straight to responder!
      if (!state.plan || state.plan.length === 0) {
        return "responder"
      }
      return "executor"
    })
    .addEdge("executor", "reflector")

    .addConditionalEdges("reflector", (state: AgentStateType) => {
      // If reflection failed and needs retry on current step -> route to Cognitive Re-Planner!
      if (!state.reflection.passed) {
        return "replanner"
      }

      // If more steps remain in plan
      if (state.plan && state.currentStepIndex < state.plan.length) {
        return "executor"
      }

      // All steps done -> synthesize response
      return "responder"
    })

    .addEdge("replanner", "executor")
    .addEdge("responder", END)

  const checkpointer = await getGraphCheckpointer()

  return workflow.compile({
    checkpointer,
  })
}
