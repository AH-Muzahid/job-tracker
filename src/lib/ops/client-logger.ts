/**
 * Client-Side Telemetry & Error Reporter for Ops Console
 * Captures browser-side exceptions, failed network calls, and UI action failures,
 * and streams them non-blockingly to /api/admin/ops/logs so the Ops team has
 * 100% real-time visibility into user-facing issues.
 */

interface ClientErrorPayload {
  level?: "error" | "warn" | "info"
  source: string
  message: string
  error?: {
    name?: string
    message: string
    stack?: string
  }
  metadata?: Record<string, unknown>
}

// Memory cache to debounce and prevent error flooding
const recentErrorTimestamps = new Map<string, number>()
const DEBOUNCE_MS = 4000

/**
 * Reports a client-side error to the Ops console
 */
export function reportClientError(
  source: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return

  try {
    let message = "Unknown client error"
    let stack: string | undefined = undefined
    let name = "Error"

    if (error instanceof Error) {
      message = error.message
      stack = error.stack
      name = error.name
    } else if (typeof error === "string") {
      message = error
    } else if (error && typeof error === "object") {
      message = (error as { message?: string }).message || JSON.stringify(error)
    }

    // Debounce duplicate errors
    const dedupeKey = `${source}:${message}`
    const now = Date.now()
    const lastReported = recentErrorTimestamps.get(dedupeKey) || 0
    if (now - lastReported < DEBOUNCE_MS) {
      return
    }
    recentErrorTimestamps.set(dedupeKey, now)

    // Cleanup old keys periodically
    if (recentErrorTimestamps.size > 100) {
      for (const [key, ts] of recentErrorTimestamps.entries()) {
        if (now - ts > DEBOUNCE_MS * 4) {
          recentErrorTimestamps.delete(key)
        }
      }
    }

    const payload: ClientErrorPayload = {
      level: "error",
      source: `client:${source}`,
      message,
      error: {
        name,
        message,
        stack,
      },
      metadata: {
        ...metadata,
        url: window.location.pathname + window.location.search,
        userAgent: navigator.userAgent.slice(0, 150),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
      },
    }

    // Dispatch non-blockingly via fetch with keepalive
    fetch("/api/admin/ops/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Fire-and-forget: fail silently if offline
    })
  } catch {
    // Fail silently to never disrupt the client UI
  }
}

/**
 * Reports an informational or warning client event to Ops console
 */
export function reportClientEvent(
  source: string,
  message: string,
  metadata?: Record<string, unknown>,
  level: "info" | "warn" = "info"
): void {
  if (typeof window === "undefined") return

  try {
    const payload: ClientErrorPayload = {
      level,
      source: `client:${source}`,
      message,
      metadata: {
        ...metadata,
        url: window.location.pathname + window.location.search,
        timestamp: new Date().toISOString(),
      },
    }

    fetch("/api/admin/ops/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Fail silently
  }
}
