"use client"

import React, { useState } from "react"
import {
  History,
  Calendar,
  Trash2,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Mic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { InterviewSessionItem } from "./types"
import { GapDoctorSection } from "../conversational/GapDoctorSection"

interface MockTranscriptsTabProps {
  sessions: InterviewSessionItem[]
  loading: boolean
  onDeleteSession: (id: string) => Promise<void>
  onStartMockInterview: () => void
}

export function MockTranscriptsTab({
  sessions,
  loading,
  onDeleteSession,
  onStartMockInterview,
}: MockTranscriptsTabProps) {
  const [selectedSession, setSelectedSession] = useState<InterviewSessionItem | null>(null)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground">Recorded Mock Interviews</h2>
          <p className="text-xs text-muted-foreground">Review your spoken mock conversations and AI STAR performance debriefs.</p>
        </div>
      </div>

      {loading ? (
        <div className="relative border border-border bg-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 bg-background space-y-3">
                <Skeleton className="h-4 w-32 rounded-sm" />
                <Skeleton className="h-3.5 w-48 rounded-sm" />
                <Skeleton className="h-3 w-24 rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-lg bg-card/40 space-y-3">
          <History className="size-8 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No Mock Sessions Recorded Yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Take a live spoken mock interview and your conversation transcript and score analysis will appear here.
            </p>
          </div>
          <Button
            onClick={onStartMockInterview}
            size="sm"
            className="text-xs h-8 px-4 font-medium cursor-pointer mt-2"
          >
            <Mic className="size-3.5 mr-1.5" />
            Start First Mock Interview
          </Button>
        </div>
      ) : (
        <div className="relative border border-border bg-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-background p-4 sm:p-5 flex flex-col justify-between gap-3.5 group transition-colors hover:bg-muted/10"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-muted border border-border text-foreground">
                      {session.interviewType} Round
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {session.targetCompany}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {session.targetRole}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSession(session)
                        setSessionModalOpen(true)
                      }}
                      className="h-7 text-xs px-2.5 border-border cursor-pointer font-medium"
                    >
                      <span>Review Debrief</span>
                      <ChevronRight className="size-3 ml-1" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteSession(session.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer opacity-80 group-hover:opacity-100"
                    title="Remove Session"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript & Gap Analysis Modal */}
      {selectedSession && (
        <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background border-border text-foreground p-5 sm:p-6">
            <DialogHeader className="pb-3 border-b border-border space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-muted border border-border text-foreground">
                  {selectedSession.interviewType}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {new Date(selectedSession.createdAt).toLocaleDateString()}
                </span>
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {selectedSession.targetCompany} — {selectedSession.targetRole}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Complete verbal transcript and AI STAR assessment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-2">
              {/* STAR Gap Analysis Section */}
              {selectedSession.report?.knowledgeGaps && selectedSession.report.knowledgeGaps.length > 0 && (
                <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
                  <h4 className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                    Performance Evaluation & Knowledge Gaps
                  </h4>
                  <GapDoctorSection
                    gaps={selectedSession.report.knowledgeGaps}
                    targetCompany={selectedSession.targetCompany}
                    targetRole={selectedSession.targetRole}
                  />
                </div>
              )}

              {/* Transcript Messages */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
                  Spoken Conversation Transcript
                </h4>
                <div className="space-y-2.5">
                  {selectedSession.dialogue && selectedSession.dialogue.length > 0 ? (
                    selectedSession.dialogue.map((msg: { role: string; text: string; timestamp?: string }, idx: number) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg text-xs leading-relaxed border",
                          msg.role === "user"
                            ? "bg-muted/40 border-border text-foreground ml-4 sm:ml-8"
                            : "bg-card border-border text-foreground mr-4 sm:mr-8"
                        )}
                      >
                        <span className="text-[10px] font-mono font-bold block mb-1 text-muted-foreground">
                          {msg.role === "user" ? "You (Candidate)" : "Interviewer (AI)"}
                        </span>
                        {msg.text}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No transcript messages recorded.</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionModalOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
