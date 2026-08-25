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
        let trimmed = line.trim()
        if (!trimmed) continue

        // Strip SSE data: prefix if present
        if (trimmed.startsWith("data:")) {
          trimmed = trimmed.slice(5).trim()
          if (!trimmed) continue
        }

        const colonIndex = trimmed.indexOf(":")
        if (colonIndex === -1) {
          // Check if whole line is JSON
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
              const parsed = JSON.parse(trimmed)
              if (parsed && typeof parsed === "object") {
                const callId = parsed.toolCallId || parsed.id
                if (callId) {
                  const isResult = parsed.type === "tool-result" || Boolean(parsed.result)
                  const existing = toolInvocationsMap.get(callId)
                  toolInvocationsMap.set(callId, {
                    toolCallId: callId,
                    toolName: parsed.toolName || existing?.toolName || "tool",
                    args: parsed.args || parsed.input || existing?.args || {},
                    state: isResult ? "result" : "call",
                    result: parsed.result ?? existing?.result,
                  })
                  continue
                }
              }
            } catch {}
          }

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
            case "9":
            case "b": {
              // Tool call invocation (call)
              if (parsed && typeof parsed === "object") {
                const callId = parsed.toolCallId || parsed.id || `tool-${Date.now()}`
                const existing = toolInvocationsMap.get(callId)
                toolInvocationsMap.set(callId, {
                  toolCallId: callId,
                  toolName: parsed.toolName || existing?.toolName || "tool",
                  args: parsed.args || parsed.input || existing?.args || {},
                  state: "call",
                  result: existing?.result,
                })
              }
              break
            }
            case "a":
            case "c": {
              // Tool call result (result)
              if (parsed && typeof parsed === "object") {
                const callId = parsed.toolCallId || parsed.id || `tool-${Date.now()}`
                const existing = toolInvocationsMap.get(callId)
                toolInvocationsMap.set(callId, {
                  toolCallId: callId,
                  toolName: parsed.toolName || existing?.toolName || "tool",
                  args: parsed.args || parsed.input || existing?.args || {},
                  state: "result",
                  result: parsed.result ?? parsed.output,
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
              // If type is not standard single-char code, check if parsed has toolCallId
              if (parsed && typeof parsed === "object" && (parsed.toolCallId || parsed.id)) {
                const callId = parsed.toolCallId || parsed.id
                const isResult = parsed.type === "tool-result" || Boolean(parsed.result)
                const existing = toolInvocationsMap.get(callId)
                toolInvocationsMap.set(callId, {
                  toolCallId: callId,
                  toolName: parsed.toolName || existing?.toolName || "tool",
                  args: parsed.args || parsed.input || existing?.args || {},
                  state: isResult ? "result" : "call",
                  result: parsed.result ?? existing?.result,
                })
              }
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
        let trimmed = buffer.trim()
        if (trimmed.startsWith("data:")) {
          trimmed = trimmed.slice(5).trim()
        }
        const colonIndex = trimmed.indexOf(":")
        if (colonIndex !== -1) {
          const type = trimmed.slice(0, colonIndex).trim()
          const rawJson = trimmed.slice(colonIndex + 1).trim()
          try {
            const parsed = JSON.parse(rawJson)
            if (type === "0" && typeof parsed === "string") {
              accumulatedText += parsed
            } else if (type === "9" || type === "b") {
              const callId = parsed.toolCallId || parsed.id || `tool-${Date.now()}`
              const existing = toolInvocationsMap.get(callId)
              toolInvocationsMap.set(callId, {
                toolCallId: callId,
                toolName: parsed.toolName || existing?.toolName || "tool",
                args: parsed.args || existing?.args || {},
                state: "call",
                result: existing?.result,
              })
            } else if (type === "a" || type === "c") {
              const callId = parsed.toolCallId || parsed.id || `tool-${Date.now()}`
              const existing = toolInvocationsMap.get(callId)
              toolInvocationsMap.set(callId, {
                toolCallId: callId,
                toolName: parsed.toolName || existing?.toolName || "tool",
                args: parsed.args || existing?.args || {},
                state: "result",
                result: parsed.result ?? parsed.output,
              })
            }
          } catch {
            if (type === "0") accumulatedText += rawJson
          }
        } else {
          accumulatedText += trimmed
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
