"use client"

import { useEffect } from "react"
import { reportClientError } from "@/lib/ops/client-logger"

/**
 * Global Client Error Observer
 * Attaches to window error & unhandledrejection events to capture
 * client-side crashes, React render failures, or unhandled network errors.
 */
export function ClientErrorObserver() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleError = (event: ErrorEvent) => {
      // Ignore benign browser extension errors or cancelled fetches
      if (!event.error && !event.message) return
      if (event.message?.includes("ResizeObserver loop limit exceeded")) return

      reportClientError("window:error", event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      if (!reason) return

      // Ignore abort errors from user navigating away
      if (reason instanceof DOMException && reason.name === "AbortError") return

      reportClientError("window:unhandledrejection", reason)
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
