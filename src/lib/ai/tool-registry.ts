export enum ToolRisk {
  READ_ONLY = "read_only",       // No side effects
  LOW_MUTATION = "low_mutation", // Creates/updates non-critical data
  HIGH_MUTATION = "high_mutation", // Updates application state
  DESTRUCTIVE = "destructive",   // Deletes data
  EXTERNAL = "external",         // Sends emails, calls external APIs
}

interface ToolRiskEntry {
  name: string
  risk: ToolRisk
  requiresConfirmation: boolean
}

/**
 * Risk classification for all AI tools.
 * Tools not listed here default to LOW_MUTATION.
 */
export const TOOL_RISK_MAP: Record<string, ToolRiskEntry> = {
  // Read-only tools
  searchApplications:         { name: "searchApplications",         risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  listUserApplications:       { name: "listUserApplications",       risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getPrepNotes:               { name: "getPrepNotes",               risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getResumeSummary:           { name: "getResumeSummary",           risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getPipelineStats:           { name: "getPipelineStats",           risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  getUserMemories:            { name: "getUserMemories",            risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  queryCareerKnowledgeGraph:  { name: "queryCareerKnowledgeGraph",  risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },

  // Low mutation (non-critical creates/updates)
  setWeeklyGoals:             { name: "setWeeklyGoals",             risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  addPrepQuestions:           { name: "addPrepQuestions",           risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  savePrepNote:               { name: "savePrepNote",               risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  saveUserMemory:             { name: "saveUserMemory",             risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  recordMockInterviewScore:   { name: "recordMockInterviewScore",   risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  researchCompanyIntel:       { name: "researchCompanyIntel",       risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },
  syncCareerKnowledgeGraph:   { name: "syncCareerKnowledgeGraph",   risk: ToolRisk.LOW_MUTATION,   requiresConfirmation: false },

  // High mutation (application state changes)
  createApplication:          { name: "createApplication",          risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },
  updateApplicationStatus:    { name: "updateApplicationStatus",    risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },
  batchImportApplications:    { name: "batchImportApplications",    risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: true },
  tailorResumeForJob:         { name: "tailorResumeForJob",         risk: ToolRisk.HIGH_MUTATION,  requiresConfirmation: false },

  // Destructive
  deleteApplication:          { name: "deleteApplication",          risk: ToolRisk.DESTRUCTIVE,    requiresConfirmation: true },
  forgetUserMemory:           { name: "forgetUserMemory",           risk: ToolRisk.DESTRUCTIVE,    requiresConfirmation: true },

  // External (sends data outside the system)
  draftOutreachEmail:         { name: "draftOutreachEmail",         risk: ToolRisk.READ_ONLY,      requiresConfirmation: false },
  sendOutreachEmailViaResend: { name: "sendOutreachEmailViaResend", risk: ToolRisk.EXTERNAL,       requiresConfirmation: true },
  scrapeJobLink:              { name: "scrapeJobLink",              risk: ToolRisk.EXTERNAL,       requiresConfirmation: false },
  syncToGoogleSheets:         { name: "syncToGoogleSheets",         risk: ToolRisk.EXTERNAL,       requiresConfirmation: false },
}

/**
 * Get risk level for a tool. Defaults to LOW_MUTATION if unknown.
 */
export function getToolRisk(toolName: string): ToolRisk {
  return TOOL_RISK_MAP[toolName]?.risk ?? ToolRisk.LOW_MUTATION
}

/**
 * Check if a tool requires user confirmation before execution.
 */
export function requiresConfirmation(toolName: string): boolean {
  return TOOL_RISK_MAP[toolName]?.requiresConfirmation ?? false
}

/**
 * Get all tools filtered by risk level.
 */
export function getToolsByRisk(risk: ToolRisk): string[] {
  return Object.values(TOOL_RISK_MAP)
    .filter((entry) => entry.risk === risk)
    .map((entry) => entry.name)
}

/**
 * Get only safe (read-only + low mutation) tool names.
 * Used for dynamic tool routing — only expose safe tools by default.
 */
export function getSafeTools(): string[] {
  return Object.values(TOOL_RISK_MAP)
    .filter((entry) => entry.risk === ToolRisk.READ_ONLY || entry.risk === ToolRisk.LOW_MUTATION)
    .map((entry) => entry.name)
}
