import { countTokens } from "./token-counter"

/** Fail before provider billing; do not silently truncate facts or execution instructions. */
export function assertContextBudget(system: string, messages: Array<{ content: unknown }>, limit = 16000) {
  const characters = system.length + messages.reduce((sum, message) => sum + (typeof message.content === "string" ? message.content.length : JSON.stringify(message.content).length), 0)
  if (characters > 96000) throw new Error("Context is too large. Use a shorter description or fewer messages.")
  const tokens = countTokens(system) + messages.reduce((sum, message) => sum + countTokens(typeof message.content === "string" ? message.content : JSON.stringify(message.content)), 0)
  if (tokens > limit) throw new Error("Context budget exceeded. Shorten the description and retry.")
}
