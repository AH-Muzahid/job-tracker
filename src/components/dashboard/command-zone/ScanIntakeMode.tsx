"use client"

import { Bot, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  jdText: string
  setJdText: (text: string) => void
  detectedCompany: string | null
  detectedRole: string | null
  aiLoading: boolean
  onSubmit: (e?: React.FormEvent) => void
}

export function ScanIntakeMode({
  jdText,
  setJdText,
  detectedCompany,
  detectedRole,
  aiLoading,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <div className="relative">
        <Textarea
          placeholder="Paste job description here..."
          className="min-h-[100px] max-h-[160px] text-xs leading-relaxed resize-none bg-background/80 border-border/80 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 rounded-xl"
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />
        {(detectedCompany || detectedRole) && (
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
            {detectedCompany && (
              <span className="text-[9px] font-mono bg-muted/80 border border-border/60 text-muted-foreground px-2 py-0.5 rounded-full">
                🏢 {detectedCompany}
              </span>
            )}
            {detectedRole && (
              <span className="text-[9px] font-mono bg-muted/80 border border-border/60 text-muted-foreground px-2 py-0.5 rounded-full truncate max-w-[120px]">
                💼 {detectedRole}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground">
          {jdText.length > 0 ? `${jdText.length} chars` : "Supports full JD text"}
        </span>

        <Button
          type="submit"
          size="sm"
          disabled={aiLoading || !jdText.trim()}
          className="text-xs font-semibold h-8 px-4 cursor-pointer"
        >
          {aiLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Analyzing...
            </>
          ) : (
            <>
              <Bot className="h-3.5 w-3.5 mr-1.5 text-primary-foreground" />
              Intake & Analyze
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
