export enum ToolRisk {
  READ_ONLY = "read_only",       // No side effects
  LOW_MUTATION = "low_mutation", // Creates/updates non-critical data
  HIGH_MUTATION = "high_mutation", // Updates application state
  DESTRUCTIVE = "destructive",   // Deletes data
  EXTERNAL = "external",         // Sends emails, calls external APIs
}

export interface ToolRiskEntry {
  name: string
  risk: ToolRisk
  requiresConfirmation: boolean
}

/**
 * Single source of truth for tool risk classification and confirmation gates.
 * Tools not listed here default to LOW_MUTATION.
 */
export const TOOL_RISK_MAP: Record<string, ToolRiskEntry> = {
  // Read-only tools
  searchApplications:         { name: "searchApplications",         risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  listUserApplications:       { name: "listUserApplications",       risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getPrepNotes:               { name: "getPrepNotes",               risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getResumeDetails:           { name: "getResumeDetails",           risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getResumeSummary:           { name: "getResumeSummary",           risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getPipelineStats:           { name: "getPipelineStats",           risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getUserMemories:            { name: "getUserMemories",            risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getUserProfile:             { name: "getUserProfile",             risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  queryCareerKnowledgeGraph:  { name: "queryCareerKnowledgeGraph",  risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  searchExternalJobs:         { name: "searchExternalJobs",         risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },

  // Low mutation
  setWeeklyGoals:             { name: "setWeeklyGoals",             risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  createWeeklyGoal:           { name: "createWeeklyGoal",           risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  savePrepNote:               { name: "savePrepNote",               risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  saveUserMemory:             { name: "saveUserMemory",             risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  updateUserProfile:          { name: "updateUserProfile",          risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  researchCompanyIntel:       { name: "researchCompanyIntel",       risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  syncCareerKnowledgeGraph:   { name: "syncCareerKnowledgeGraph",   risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },

  // High mutation
  createApplication:          { name: "createApplication",          risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },
  updateApplicationStatus:    { name: "updateApplicationStatus",    risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },
  saveJobOpportunityToTracker:{ name: "saveJobOpportunityToTracker",risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },
  batchImportApplications:    { name: "batchImportApplications",    risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: true },
  tailorResumeForJob:         { name: "tailorResumeForJob",         risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },

  // Destructive (Strictly Human-In-The-Loop Confirmation Required)
  deleteApplication:          { name: "deleteApplication",          risk: ToolRisk.DESTRUCTIVE,    requiresConfirmation: true },
  forgetUserMemory:           { name: "forgetUserMemory",           risk: ToolRisk.DESTRUCTIVE,    requiresConfirmation: true },

  // External
  draftOutreachEmail:         { name: "draftOutreachEmail",         risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  sendOutreachEmailViaResend: { name: "sendOutreachEmailViaResend", risk: ToolRisk.EXTERNAL,       requiresConfirmation: true },
  scrapeJobLink:              { name: "scrapeJobLink",              risk: ToolRisk.EXTERNAL,       requiresConfirmation: false },
  syncToGoogleSheets:         { name: "syncToGoogleSheets",         risk: ToolRisk.EXTERNAL,       requiresConfirmation: false },
}

export function getToolRisk(toolName: string): ToolRisk {
  return TOOL_RISK_MAP[toolName]?.risk ?? ToolRisk.LOW_MUTATION
}

export function requiresConfirmation(toolName: string): boolean {
  return TOOL_RISK_MAP[toolName]?.requiresConfirmation ?? false
}

export function getToolsByRisk(risk: ToolRisk): string[] {
  return Object.values(TOOL_RISK_MAP)
    .filter((entry) => entry.risk === risk)
    .map((entry) => entry.name)
}

export function getSafeTools(): string[] {
  return Object.values(TOOL_RISK_MAP)
    .filter((entry) => entry.risk === ToolRisk.READ_ONLY || entry.risk === ToolRisk.LOW_MUTATION)
    .map((entry) => entry.name)
}
