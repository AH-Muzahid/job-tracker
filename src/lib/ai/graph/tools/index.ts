/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  executeCreateApplication,
  executeUpdateApplicationStatus,
  executeSearchApplications,
  executeDeleteApplication,
} from "./job-tools"
import {
  executeGetResumeDetails,
  executeSyncCareerKnowledgeGraph,
  executeQueryCareerKnowledgeGraph,
  executeTailorResumeForJob,
} from "./resume-tools"
import {
  executeGetUserProfile,
  executeUpdateUserProfile,
  executeSaveUserMemory,
  executeForgetUserMemory,
  executeGetUserMemories,
} from "./profile-tools"
import { executeCreateWeeklyGoal } from "./goal-tools"
import { executeSendOutreachEmail } from "./email-tools"
import {
  executeSearchExternalJobs,
  executeSaveJobOpportunityToTracker,
} from "./discovery-tools"

export const SENSITIVE_HITL_TOOLS = ["sendOutreachEmailViaResend", "deleteApplication"]

/**
 * Dispatches a tool execution by name and input
 */
export async function executeToolByName(
  toolName: string,
  toolInput: Record<string, any>,
  userId: string
): Promise<{ success: boolean; result?: any; error?: string; message?: string }> {
  try {
    switch (toolName) {
      case "searchExternalJobs":
        return await executeSearchExternalJobs(userId, toolInput as any)

      case "saveJobOpportunityToTracker":
        return await executeSaveJobOpportunityToTracker(userId, toolInput as any)

      case "createApplication":
        return await executeCreateApplication(userId, toolInput as any)

      case "updateApplicationStatus":
        return await executeUpdateApplicationStatus(userId, toolInput as any)

      case "searchApplications":
        return await executeSearchApplications(userId, toolInput as any)

      case "deleteApplication":
        return await executeDeleteApplication(userId, toolInput as any)

      case "getResumeDetails":
        return await executeGetResumeDetails(userId, toolInput as any)

      case "tailorResumeForJob":
        return await executeTailorResumeForJob(userId, toolInput as any)

      case "syncCareerKnowledgeGraph":
        return await executeSyncCareerKnowledgeGraph(userId)

      case "queryCareerKnowledgeGraph":
        return await executeQueryCareerKnowledgeGraph(userId, toolInput as any)

      case "getUserProfile":
        return await executeGetUserProfile(userId)

      case "updateUserProfile":
        return await executeUpdateUserProfile(userId, toolInput as any)

      case "saveUserMemory":
        return await executeSaveUserMemory(userId, toolInput as any)

      case "forgetUserMemory":
        return await executeForgetUserMemory(userId, toolInput as any)

      case "getUserMemories":
        return await executeGetUserMemories(userId, toolInput as any)

      case "createWeeklyGoal":
        return await executeCreateWeeklyGoal(userId, toolInput as any)

      case "sendOutreachEmailViaResend":
        return await executeSendOutreachEmail(userId, toolInput as any)

      default:
        return { success: false, error: `Tool "${toolName}" is not recognized.` }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || `Execution error on tool ${toolName}` }
  }
}
