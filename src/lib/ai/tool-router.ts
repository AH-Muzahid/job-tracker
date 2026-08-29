/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AIMode } from "./context-builder"
import { ToolRisk, TOOL_RISK_MAP } from "./tool-registry"

const MODE_TOOL_CATEGORIES: Record<AIMode, ToolRisk[]> = {
  tracker:     [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION, ToolRisk.HIGH_MUTATION],
  application: [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION, ToolRisk.HIGH_MUTATION],
  "jd-scan":   [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION, ToolRisk.EXTERNAL],
  interview:   [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  weekly:      [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  response:    [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  recovery:    [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  profile:     [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
  general:     [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION],
}

const ALWAYS_EXPOSE: ToolRisk[] = [ToolRisk.READ_ONLY, ToolRisk.LOW_MUTATION]

const MODE_SPECIFIC_TOOLS: Partial<Record<AIMode, string[]>> = {
  tracker: ["createApplication", "updateApplicationStatus", "deleteApplication", "batchImportApplications", "syncToGoogleSheets"],
  application: ["createApplication", "tailorResumeForJob", "draftOutreachEmail", "sendOutreachEmailViaResend"],
  "jd-scan": ["scrapeJobLink", "researchCompanyIntel", "queryCareerKnowledgeGraph"],
  interview: ["addPrepQuestions", "savePrepNote", "getPrepNotes", "recordMockInterviewScore"],
  weekly: ["setWeeklyGoals"],
  profile: ["syncCareerKnowledgeGraph"],
}

export function filterToolsByMode(
  tools: Record<string, any>,
  mode: AIMode
): Record<string, any> {
  const allowedRisks = MODE_TOOL_CATEGORIES[mode] ?? ALWAYS_EXPOSE
  const allowedSpecific = MODE_SPECIFIC_TOOLS[mode] ?? []

  return Object.fromEntries(
    Object.entries(tools).filter(([name]) => {
      const risk = TOOL_RISK_MAP[name]?.risk ?? ToolRisk.LOW_MUTATION
      return allowedRisks.includes(risk) || allowedSpecific.includes(name)
    })
  )
}
