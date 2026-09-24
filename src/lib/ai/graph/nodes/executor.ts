/* eslint-disable @typescript-eslint/no-explicit-any */
import { interrupt } from "@langchain/langgraph"
import type { AgentStateType, AgentPlanStep } from "../state"
import {
  executeToolByName,
  isHITLRequired,
  isAllowedInHeadless,
} from "../tools/tool-manifest"

export function createExecutorNode() {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const { plan, currentStepIndex, userId, isHeadlessMode } = state
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
        retryable: false,
      }
      return {
        plan: updatedPlan,
      }
    }

    const toolName = currentStep.toolName
    const hitlRequired = isHITLRequired(toolName)
    const allowedInHeadless = isAllowedInHeadless(toolName)

    // Headless execution safety guardrail: NEVER hang on interrupt in background tasks
    if (isHeadlessMode && (hitlRequired || !allowedInHeadless)) {
      updatedPlan[currentStepIndex] = {
        ...currentStep,
        status: "failed",
        error: `Action "${toolName}" requires human confirmation and is restricted in headless background mode.`,
        retryable: false,
      }
      return {
        plan: updatedPlan,
        interruptData: null,
      }
    }

    // Interactive Human-in-the-Loop (HITL) interrupt for sensitive tools
    if (hitlRequired && !state.interruptData?.payload?.__approved) {
      const interruptPayload = {
        actionRequired: "CONFIRM_ACTION",
        title: `Approval required for ${toolName}`,
        description: `The agent wishes to execute sensitive action ${toolName} with input: ${JSON.stringify(currentStep.toolInput)}`,
        payload: currentStep.toolInput || {},
      }

      // LangGraph native server interrupt
      const resumedValue: any = interrupt(interruptPayload)
      if (!resumedValue || (resumedValue.action !== "APPROVE" && resumedValue.action !== "approved")) {
        updatedPlan[currentStepIndex] = {
          ...currentStep,
          status: "failed",
          error: "Action rejected by user.",
          retryable: false,
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
      toolName,
      currentStep.toolInput || {},
      userId,
      { isHeadless: Boolean(isHeadlessMode) }
    )

    if (execution.success) {
      updatedPlan[currentStepIndex] = {
        ...currentStep,
        status: "completed",
        result: execution.result || execution,
        retryable: false,
      }
    } else {
      updatedPlan[currentStepIndex] = {
        ...currentStep,
        status: "failed",
        error: execution.error || "Tool execution failed",
        retryable: execution.retryable ?? false,
      }
    }

    return {
      plan: updatedPlan,
      interruptData: null,
    }
  }
}
