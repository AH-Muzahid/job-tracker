/**
 * Resilient JSON Extractor for LLM Outputs
 * 
 * LLMs frequently wrap JSON in markdown blocks, append conversational explanations,
 * or include trailing characters/commas. This utility extracts and parses the
 * primary valid JSON object safely.
 */

export function extractJsonObject<T = Record<string, unknown>>(rawText: string): T | null {
  if (!rawText || typeof rawText !== "string") return null

  const text = rawText.trim()

  // 1. Direct parse attempt (fast path)
  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T
    }
  } catch {
    // Continue to extraction strategies
  }

  // 2. Check for markdown code fences (```json ... ``` or ``` ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi
  let match: RegExpExecArray | null
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const blockContent = match[1].trim()
    const parsed = tryParseJson<T>(blockContent)
    if (parsed) return parsed

    // Also check for balanced object inside code block
    const extractedInsideBlock = extractBalancedJsonObject<T>(blockContent)
    if (extractedInsideBlock) return extractedInsideBlock
  }

  // 3. Balanced brace scan across full text
  const extracted = extractBalancedJsonObject<T>(text)
  if (extracted) return extracted

  return null
}

function tryParseJson<T>(str: string): T | null {
  if (!str) return null
  try {
    const parsed = JSON.parse(str)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T
    }
  } catch {
    // Try sanitizing trailing commas before braces/brackets
    try {
      const sanitized = str.replace(/,\s*([}\]])/g, "$1")
      const parsed = JSON.parse(sanitized)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as T
      }
    } catch {
      // Fall through
    }
  }
  return null
}

function extractBalancedJsonObject<T>(text: string): T | null {
  const firstBrace = text.indexOf("{")
  if (firstBrace === -1) return null

  for (let start = firstBrace; start < text.length; start++) {
    if (text[start] !== "{") continue

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < text.length; i++) {
      const char = text[i]

      if (escaped) {
        escaped = false
        continue
      }

      if (char === "\\") {
        if (inString) escaped = true
        continue
      }

      if (char === '"') {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === "{") {
          depth++
        } else if (char === "}") {
          depth--
          if (depth === 0) {
            const candidate = text.slice(start, i + 1)
            const parsed = tryParseJson<T>(candidate)
            if (parsed) return parsed
            break // If not valid JSON, try next potential opening brace
          }
        }
      }
    }
  }

  return null
}
