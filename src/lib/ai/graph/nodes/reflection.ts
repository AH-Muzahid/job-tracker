/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AgentStateType } from "../state"

/**
 * Inspects a step result to determine if it succeeded logically/semantically
 * rather than just checking if the object exists.
 */
function evaluateStepSemanticOutcome(result: any, hasTool = true): { isSuccess: boolean; reason?: string } {
  if (!hasTool && (result === undefined || result === null)) {
    return { isSuccess: true }
  }
  if (result === undefined || result === null) {
    return { isSuccess: false, reason: "No outcome was produced by tool execution." }
  }

  // Explicit tool failure response
  if (typeof result === "object") {
    if (result.success === false) {
      return { isSuccess: false, reason: result.error || result.message || "Tool execution returned an unsuccessful status." }
    }
    if (result.error && !result.data) {
      return { isSuccess: false, reason: String(result.error) }
    }
    // Empty collections where items were expected
    if (Array.isArray(result) && result.length === 0) {
      return { isSuccess: false, reason: "Tool returned an empty collection (0 items found)." }
    }
    if (Array.isArray(result.jobs) && result.jobs.length === 0) {
      return { isSuccess: false, reason: "0 matching jobs found." }
    }
  }

  return { isSuccess: true }
}

export function createReflectionNode() {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    const { plan, currentStepIndex, reflection } = state
    if (!plan || plan.length === 0 || currentStepIndex >= plan.length) {
      return {
        reflection: { passed: true, retryCount: 0 },
      }
    }

    const currentStep = plan[currentStepIndex]
    const retryCount = reflection?.retryCount || 0
    const isRetryable = currentStep.retryable !== false

    // 1. Explicit Step Failure (e.g. tool execution threw an exception)
    if (currentStep.status === "failed") {
      if (isRetryable && retryCount < 2) {
        return {
          reflection: {
            passed: false,
            feedback: `Step ${currentStep.id} failed with error: ${currentStep.error}. Retrying with adapted parameters...`,
            retryCount: retryCount + 1,
          },
        }
      } else {
        return {
          reflection: {
            passed: true,
            feedback: `Step ${currentStep.id} terminated (${currentStep.error || "Execution failed"}). Advancing workflow.`,
            retryCount: 0,
          },
          currentStepIndex: currentStepIndex + 1,
        }
      }
    }

    // 2. Semantic Evaluation of Completed Step
    const semanticEval = evaluateStepSemanticOutcome(currentStep.result, Boolean(currentStep.toolName))

    if (!semanticEval.isSuccess) {
      if (isRetryable && retryCount < 2) {
        return {
          reflection: {
            passed: false,
            feedback: `Step ${currentStep.id} completed with semantic warning: ${semanticEval.reason}. Retrying with broader parameters...`,
            retryCount: retryCount + 1,
          },
        }
      } else {
        return {
          reflection: {
            passed: true,
            feedback: `Max retries exceeded for Step ${currentStep.id} (${semanticEval.reason}). Advancing workflow.`,
            retryCount: 0,
          },
          currentStepIndex: currentStepIndex + 1,
        }
      }
    }

    // 3. Verified Success
    return {
      reflection: {
        passed: true,
        feedback: `Step ${currentStep.id} completed with verified outcome.`,
        retryCount: 0,
      },
      currentStepIndex: currentStepIndex + 1,
    }
  }
}
