"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useUI } from "@/lib/store"
import { UniversalJDEvaluator } from "./UniversalJDEvaluator"

export function UniversalJDEvaluatorModal() {
  const evaluatorModal = useUI((s) => s.evaluatorModal)
  const setEvaluatorModal = useUI((s) => s.setEvaluatorModal)

  return (
    <Dialog
      open={evaluatorModal.open}
      onOpenChange={(open) => {
        if (!open) setEvaluatorModal(false)
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border border-border bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>Universal Opportunity Evaluator</DialogTitle>
          <DialogDescription>
            Evaluate external job postings for instant fit and 1-click application staging.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 sm:p-6">
          <UniversalJDEvaluator
            initialText={evaluatorModal.initialText}
            initialUrl={evaluatorModal.initialUrl}
            onFinished={() => setEvaluatorModal(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
