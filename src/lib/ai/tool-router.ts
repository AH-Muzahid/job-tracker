/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AIMode } from "./context-builder"
import { ToolRisk, TOOL_RISK_MAP } from "./tool-registry"

/**
 * LLM-FIRST TOOL ROUTING
 * 
 * The LLM receives ALL tools and decides based on context.
 * No regex-based hard filtering — the model is smart enough.
 * 
 * Safety guardrails:
 * - DESTRUCTIVE tools (delete, forget) → requiresConfirmation: true (HITL)
 * - EXTERNAL tools (email, scrape, sheets) → requiresConfirmation: true (HITL)
 * - HIGH_MUTATION tools (create, update, batch) → exposed directly
 * - READ_ONLY / LOW_MUTATION → always safe
 */

export function filterToolsByMode(
  tools: Record<string, any>,
  _mode: AIMode
): Record<string, any> {
  // Expose ALL tools — let the LLM decide based on context
  // Confirmation guardrails handle safety for destructive operations
  return tools
}
