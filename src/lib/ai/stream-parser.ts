export interface ToolInvocationState {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  state: "call" | "result"
  result?: unknown
}

export interface ParsedStreamState {
  text: string
  toolInvocations: ToolInvocationState[]
  error?: string
}

/**
 * Robust Data Stream parser for Vercel AI SDK protocol
 * Consumes raw string chunks and maintains accumulated text and live toolInvocations.
 */
export function createDataStreamParser() {
  let buffer = ""
  let accumulatedText = ""
  const toolInvocationsMap = new Map<string, ToolInvocationState>()

  return {
    feed(chunk: string): ParsedStreamState {
      buffer += chunk

      const lines = buffer.split("\n")
      // Keep the last incomplete fragment in the buffer
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const colonIndex = trimmed.indexOf(":")
        if (colonIndex === -1) {
          // Plain text fallback line
          accumulatedText += trimmed + "\n"
          continue
        }

        const type = trimmed.slice(0, colonIndex).trim()
        const rawJson = trimmed.slice(colonIndex + 1).trim()

        try {
          const parsed = JSON.parse(rawJson)

          switch (type) {
            case "0": {
              // Text delta
              if (typeof parsed === "string") {
                accumulatedText += parsed
              }
              break
            }
            case "9": {
              // Tool call invocation (call)
              if (parsed && typeof parsed === "object" && parsed.toolCallId) {
                const existing = toolInvocationsMap.get(parsed.toolCallId)
                toolInvocationsMap.set(parsed.toolCallId, {
                  toolCallId: parsed.toolCallId,
                  toolName: parsed.toolName || existing?.toolName || "tool",
                  args: parsed.args || existing?.args || {},
                  state: "call",
                  result: existing?.result,
                })
              }
              break
            }
            case "a": {
              // Tool call result (result)
              if (parsed && typeof parsed === "object" && parsed.toolCallId) {
                const existing = toolInvocationsMap.get(parsed.toolCallId)
                toolInvocationsMap.set(parsed.toolCallId, {
                  toolCallId: parsed.toolCallId,
                  toolName: parsed.toolName || existing?.toolName || "tool",
                  args: parsed.args || existing?.args || {},
                  state: "result",
                  result: parsed.result,
                })
              }
              break
            }
            case "3": {
              // Error string
              console.warn("[DataStream] Stream error payload:", parsed)
              break
            }
            default: {
              // Metadata (d:), step finish (e:), data (2:)
              break
            }
          }
        } catch {
          // Fallback if not JSON
          if (type === "0") {
            accumulatedText += rawJson
          } else if (colonIndex > 3) {
            // Not a protocol line, append full line to text
            accumulatedText += trimmed + "\n"
          }
        }
      }

      return {
        text: accumulatedText,
        toolInvocations: Array.from(toolInvocationsMap.values()),
      }
    },

    finalize(): ParsedStreamState {
      if (buffer.trim()) {
        const trimmed = buffer.trim()
        const colonIndex = trimmed.indexOf(":")
        if (colonIndex !== -1) {
          const type = trimmed.slice(0, colonIndex).trim()
          const rawJson = trimmed.slice(colonIndex + 1).trim()
          try {
            const parsed = JSON.parse(rawJson)
            if (type === "0" && typeof parsed === "string") {
              accumulatedText += parsed
            } else if (type === "9" && parsed?.toolCallId) {
              const existing = toolInvocationsMap.get(parsed.toolCallId)
              toolInvocationsMap.set(parsed.toolCallId, {
                toolCallId: parsed.toolCallId,
                toolName: parsed.toolName || existing?.toolName || "tool",
                args: parsed.args || existing?.args || {},
                state: "call",
                result: existing?.result,
              })
            } else if (type === "a" && parsed?.toolCallId) {
              const existing = toolInvocationsMap.get(parsed.toolCallId)
              toolInvocationsMap.set(parsed.toolCallId, {
                toolCallId: parsed.toolCallId,
                toolName: parsed.toolName || existing?.toolName || "tool",
                args: parsed.args || existing?.args || {},
                state: "result",
                result: parsed.result,
              })
            }
          } catch {
            if (type === "0") accumulatedText += rawJson
          }
        } else {
          accumulatedText += buffer
        }
        buffer = ""
      }

      return {
        text: accumulatedText,
        toolInvocations: Array.from(toolInvocationsMap.values()),
      }
    },
  }
}
