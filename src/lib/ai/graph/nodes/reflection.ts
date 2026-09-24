import type { AgentStateType } from "../state"

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

    if (currentStep.status === "failed") {
      // Non-retryable errors (e.g. invalid inputs, user rejections, permission errors, unknown tools)
      // should never trigger wasteful repeat execution cycles
      const isRetryable = currentStep.retryable !== false

      if (isRetryable && retryCount < 2) {
        return {
          reflection: {
            passed: false,
            feedback: `Step ${currentStep.id} failed with transient error: ${currentStep.error}. Retrying...`,
            retryCount: retryCount + 1,
          },
        }
      } else {
        // Max retries exceeded or non-retryable error: advance to next step with recorded rationale
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

    // Quality check for completed step
    const hasResult = currentStep.result !== undefined && currentStep.result !== null
    const feedback = hasResult
      ? `Step ${currentStep.id} completed with verified outcome.`
      : `Step ${currentStep.id} completed without explicit output.`

    return {
      reflection: {
        passed: true,
        feedback,
        retryCount: 0,
      },
      currentStepIndex: currentStepIndex + 1,
    }
  }
}
