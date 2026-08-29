"use client"

import React, { useState } from "react"
import { DecorIcon } from "@/components/decor-icon"

interface HITLConfirmFormProps {
  toolName: string
  args: Record<string, unknown>
  onConfirm: (args: Record<string, unknown>) => void
  onCancel: () => void
  message?: string
}

export default function HITLConfirmForm({ toolName, args, onConfirm, onCancel, message }: HITLConfirmFormProps) {
  // We keep a local state of edited arguments.
  const [editedArgs, setEditedArgs] = useState<Record<string, unknown>>(() => {
    return { ...args }
  })

  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})

  const isEmail = toolName === "sendOutreachEmailViaResend"
  const isDelete = toolName === "deleteApplication"

  const handleEmailChange = (key: string, value: string) => {
    setEditedArgs((prev) => {
      const next = { ...prev }
      if (key === "to" || key === "recipientEmail") {
        next.to = value
        next.recipientEmail = value
      } else if (key === "body" || key === "bodyText") {
        next.body = value
        next.bodyText = value
      } else {
        next[key] = value
      }
      return next
    })
  }

  const handleSimpleChange = (key: string, value: string) => {
    setEditedArgs((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleComplexChange = (key: string, rawValue: string) => {
    try {
      const parsed = JSON.parse(rawValue)
      setEditedArgs((prev) => ({
        ...prev,
        [key]: parsed,
      }))
      setJsonErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch {
      setJsonErrors((prev) => ({
        ...prev,
        [key]: "Invalid JSON format",
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (Object.keys(jsonErrors).length > 0) return
    onConfirm({ ...editedArgs, confirmed: true })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative mt-2 p-4 border border-amber-500/35 bg-amber-500/5 dark:bg-amber-950/10 font-sans text-xs space-y-4 rounded-none select-none"
    >
      <DecorIcon className="size-2 text-amber-500/30" position="top-left" />
      <DecorIcon className="size-2 text-amber-500/30" position="top-right" />
      <DecorIcon className="size-2 text-amber-500/30" position="bottom-left" />
      <DecorIcon className="size-2 text-amber-500/30" position="bottom-right" />

      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          Review action: {toolName}
        </span>
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
      </div>

      {message && (
        <div className="p-2.5 border-l-2 border-amber-500 bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-300 font-sans leading-relaxed text-xs">
          {message}
        </div>
      )}

      {isEmail ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="hitl-to" className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">To (Recipient Email)</label>
            <input
              id="hitl-to"
              type="email"
              required
              value={(editedArgs.recipientEmail as string) || (editedArgs.to as string) || ""}
              onChange={(e) => handleEmailChange("to", e.target.value)}
              className="w-full bg-background border border-border p-2 text-xs outline-none rounded-none focus:border-amber-500/50 text-foreground transition-colors"
            />
          </div>
          <div>
            <label htmlFor="hitl-subject" className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Subject</label>
            <input
              id="hitl-subject"
              type="text"
              required
              value={(editedArgs.subject as string) || ""}
              onChange={(e) => handleEmailChange("subject", e.target.value)}
              className="w-full bg-background border border-border p-2 text-xs outline-none rounded-none focus:border-amber-500/50 text-foreground transition-colors"
            />
          </div>
          <div>
            <label htmlFor="hitl-body" className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Body Text</label>
            <textarea
              id="hitl-body"
              required
              value={(editedArgs.bodyText as string) || (editedArgs.body as string) || ""}
              onChange={(e) => handleEmailChange("bodyText", e.target.value)}
              className="w-full bg-background border border-border p-2 text-xs min-h-[140px] outline-none rounded-none focus:border-amber-500/50 text-foreground transition-colors font-sans resize-y"
            />
          </div>
        </div>
      ) : isDelete ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="hitl-company-or-title" className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">Company name or Job Title</label>
            <input
              id="hitl-company-or-title"
              type="text"
              required
              value={(editedArgs.companyOrTitle as string) || ""}
              onChange={(e) => handleSimpleChange("companyOrTitle", e.target.value)}
              className="w-full bg-background border border-border p-2 text-xs outline-none rounded-none focus:border-amber-500/50 text-foreground transition-colors"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(args)
            .filter(([key]) => key !== "confirmed")
            .map(([key, val]) => {
              const isValComplex = val && (typeof val === "object" || Array.isArray(val))
              const inputId = `hitl-arg-${key}`
              return (
                <div key={key}>
                  <label htmlFor={inputId} className="block text-[10px] text-muted-foreground uppercase font-bold mb-1">{key}</label>
                  {isValComplex ? (
                    <div className="space-y-1">
                      <textarea
                          id={inputId}
                          defaultValue={JSON.stringify(val, null, 2)}
                          onChange={(e) => handleComplexChange(key, e.target.value)}
                          className="w-full bg-background border border-border p-2 text-xs font-mono min-h-[120px] outline-none rounded-none focus:border-amber-500/50 text-foreground transition-colors resize-y"
                      />
                      {jsonErrors[key] && (
                        <p className="text-[10px] text-destructive font-semibold font-mono">{jsonErrors[key]}</p>
                      )}
                    </div>
                  ) : (
                    <input
                      id={inputId}
                      type="text"
                      value={(editedArgs[key] as string) ?? ""}
                      onChange={(e) => handleSimpleChange(key, e.target.value)}
                      className="w-full bg-background border border-border p-2 text-xs outline-none rounded-none focus:border-amber-500/50 text-foreground transition-colors"
                    />
                  )}
                </div>
              )
            })}
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-amber-500/10">
        <button
          type="submit"
          disabled={Object.keys(jsonErrors).length > 0}
          className="px-3 py-1.5 text-xs font-bold rounded-none bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 disabled:cursor-not-allowed text-white cursor-pointer transition-all duration-150 active:scale-95"
        >
          Confirm Action
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-bold rounded-none bg-muted hover:bg-muted/80 text-muted-foreground cursor-pointer transition-all duration-150 active:scale-95"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
