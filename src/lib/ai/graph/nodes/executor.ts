/* eslint-disable @typescript-eslint/no-explicit-any */
import { interrupt } from "@langchain/langgraph"
import type { AgentStateType, AgentPlanStep } from "../state"
import { executeToolByName, SENSITIVE_HITL_TOOLS } from "../tools"

export function createExecutorNode() {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const { plan, currentStepIndex, userId } = state
    if (!plan || plan.length === 0 || currentStepIndex >= plan.length) {
      return {}
    }

    const currentStep = plan[currentStepIndex]
    const updatedPlan: AgentPlanStep[] = [...plan]

    // If no tool is needed for this step, mark completed
    if (!currentStep.toolName) {
      updatedPlan[currentStepIndex] = {
        ...currentStep,
        status: "completed",
        result: "Task acknowledged without external tool execution.",
      }
      return {
        plan: updatedPlan,
      }
    }

    // Check for Human-in-the-Loop (HITL) interrupt for sensitive tools
    if (SENSITIVE_HITL_TOOLS.includes(currentStep.toolName) && !state.interruptData?.payload?.__approved) {
      const interruptPayload = {
        actionRequired: "CONFIRM_ACTION",
        title: `Approval required for ${currentStep.toolName}`,
        description: `The agent wishes to execute sensitive action ${currentStep.toolName} with input: ${JSON.stringify(currentStep.toolInput)}`,
        payload: currentStep.toolInput || {},
      }

      // LangGraph native server interrupt
      const resumedValue: any = interrupt(interruptPayload)
      if (!resumedValue || resumedValue.action !== "APPROVE") {
        updatedPlan[currentStepIndex] = {
          ...currentStep,
          status: "failed",
          error: "Action rejected by user.",
        }
        return {
          plan: updatedPlan,
          interruptData: null,
        }
      }
    }

    // Execute tool
    updatedPlan[currentStepIndex] = {
      ...currentStep,
      status: "in_progress",
    }

    const execution = await executeToolByName(
      currentStep.toolName,
      currentStep.toolInput || {},
      userId
    )

    if (execution.success) {
      updatedPlan[currentStepIndex] = {
        ...currentStep,
        status: "completed",
        result: execution.result || execution,
      }
    } else {
      updatedPlan[currentStepIndex] = {
        ...currentStep,
        status: "failed",
        error: execution.error || "Tool execution failed",
      }
    }

    return {
      plan: updatedPlan,
      interruptData: null,
    }
  }
}
