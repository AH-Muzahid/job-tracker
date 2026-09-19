"use client"

import { UniversalJDEvaluator } from "@/components/discovery/UniversalJDEvaluator"

/**
 * @deprecated Use `UniversalJDEvaluator` from `@/components/discovery/UniversalJDEvaluator` instead.
 */
export function JDIntakePanel(props: {
  initialText?: string
  initialUrl?: string
  onFinished?: () => void
  embedded?: boolean
}) {
  return <UniversalJDEvaluator {...props} />
}

export default JDIntakePanel
