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
      if (retryCount < 2) {
        return {
          reflection: {
            passed: false,
            feedback: `Step ${currentStep.id} failed: ${currentStep.error}. Retrying...`,
            retryCount: retryCount + 1,
          },
        }
      } else {
        // Max retries exceeded, proceed to next step but record feedback
        return {
          reflection: {
            passed: true,
            feedback: `Step ${currentStep.id} failed after ${retryCount} retries. Moving forward.`,
            retryCount: 0,
          },
          currentStepIndex: currentStepIndex + 1,
        }
      }
    }

    // Passed successfully, move to next step
    return {
      reflection: {
        passed: true,
        feedback: "Step completed successfully.",
        retryCount: 0,
      },
      currentStepIndex: currentStepIndex + 1,
    }
  }
}
