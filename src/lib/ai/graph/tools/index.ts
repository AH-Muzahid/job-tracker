export * from "./tool-manifest"
export * from "./job-tools"
export * from "./resume-tools"
export * from "./profile-tools"
export * from "./goal-tools"
export * from "./email-tools"
export * from "./discovery-tools"

// Legacy backward-compatibility alias: derived dynamically from manifest
import { TOOL_MANIFEST } from "./tool-manifest"

export const SENSITIVE_HITL_TOOLS = Object.values(TOOL_MANIFEST)
  .filter((t) => t.requiresConfirmation)
  .map((t) => t.name)
