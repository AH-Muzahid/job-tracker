interface ToolCall {
  toolName: string
  argsHash: string
  timestamp: number
}

/**
 * Detects when the agent is stuck in a loop — calling the same tool
 * with the same arguments repeatedly.
 */
export class LoopDetector {
  private calls: ToolCall[] = []
  private readonly maxHistory: number
  private readonly repetitionThreshold: number
  private readonly timeWindowMs: number

  constructor(options?: {
    maxHistory?: number
    repetitionThreshold?: number
    timeWindowMs?: number
  }) {
    this.maxHistory = options?.maxHistory ?? 20
    this.repetitionThreshold = options?.repetitionThreshold ?? 3
    this.timeWindowMs = options?.timeWindowMs ?? 30_000
  }

  /**
   * Record a tool call. Returns true if a loop is detected.
   */
  recordCall(toolName: string, args: Record<string, unknown>): boolean {
    const argsHash = this.hashArgs(args)
    const now = Date.now()

    this.calls.push({ toolName, argsHash, timestamp: now })

    // Trim old calls
    if (this.calls.length > this.maxHistory) {
      this.calls = this.calls.slice(-this.maxHistory)
    }

    // Check for repetition within time window
    const recentCalls = this.calls.filter(
      (c) => now - c.timestamp < this.timeWindowMs
    )

    const sameToolCalls = recentCalls.filter(
      (c) => c.toolName === toolName && c.argsHash === argsHash
    )

    return sameToolCalls.length >= this.repetitionThreshold
  }

  /**
   * Check if a specific tool is being called excessively.
   */
  isToolExcessive(toolName: string, maxCalls: number = 5): boolean {
    const now = Date.now()
    const recentCalls = this.calls.filter(
      (c) => c.toolName === toolName && now - c.timestamp < this.timeWindowMs
    )
    return recentCalls.length >= maxCalls
  }

  /**
   * Get call history for debugging.
   */
  getCallHistory(): ReadonlyArray<ToolCall> {
    return [...this.calls]
  }

  /**
   * Reset the detector.
   */
  reset(): void {
    this.calls = []
  }

  private hashArgs(args: Record<string, unknown>): string {
    return JSON.stringify(args, Object.keys(args).sort())
  }
}
