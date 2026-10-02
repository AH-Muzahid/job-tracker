import { recordAppLogToRing, type AppLogRingItem } from "./telemetry-ring"

export interface LogParams {
  source: string
  message: string
  error?: unknown
  metadata?: Record<string, unknown>
  userId?: string
}

/**
 * Universal application logger that outputs to standard server logs (Vercel/Console)
 * and non-blockingly streams to the Ops & Observability Ring Buffer (/admin/ops).
 */
export const appLogger = {
  /**
   * Records an application or operational failure.
   */
  error: (
    source: string,
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>,
    userId?: string
  ): Promise<AppLogRingItem> => {
    console.error(`[AppLogger:ERROR][${source}] ${message}`, error ?? "")
    return recordAppLogToRing({
      level: "error",
      source,
      message,
      error,
      metadata,
      userId,
    })
  },

  /**
   * Records a warning, anomaly, or recoverable degradation.
   */
  warn: (
    source: string,
    message: string,
    metadata?: Record<string, unknown>,
    userId?: string
  ): Promise<AppLogRingItem> => {
    console.warn(`[AppLogger:WARN][${source}] ${message}`, metadata ?? "")
    return recordAppLogToRing({
      level: "warn",
      source,
      message,
      metadata,
      userId,
    })
  },

  /**
   * Records an important business, operational, or pipeline milestone.
   */
  info: (
    source: string,
    message: string,
    metadata?: Record<string, unknown>,
    userId?: string
  ): Promise<AppLogRingItem> => {
    console.log(`[AppLogger:INFO][${source}] ${message}`, metadata ?? "")
    return recordAppLogToRing({
      level: "info",
      source,
      message,
      metadata,
      userId,
    })
  },
}
