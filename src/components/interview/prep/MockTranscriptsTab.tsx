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
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-foreground">Recorded Mock Interviews</h2>
          <p className="text-xs text-muted-foreground">Review your spoken mock conversations and AI STAR performance debriefs</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card className="rounded-3xl border border-dashed p-8 text-center space-y-3">
          <History className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold">No Mock Sessions Recorded Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Take a live spoken mock interview to practice with Tanya, Tanvir, Sarah, or David and your transcript will be saved here automatically!
            </p>
          </div>
          <Button
            onClick={onStartMockInterview}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 px-4 rounded-xl font-medium"
          >
            Start First Mock Interview
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="rounded-3xl border border-border hover:border-border/80 transition-all p-4 sm:p-5 flex flex-col justify-between gap-3 bg-card shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium bg-muted/50 text-foreground"
                  >
                    {session.interviewType} Round
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {session.targetCompany}
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    {session.targetRole}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {session.score !== null && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-bold",
                        session.score >= 80
                          ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                          : session.score >= 60
                          ? "border-amber-500 text-amber-600 bg-amber-500/10"
                          : "border-red-500 text-red-600 bg-red-500/10"
                      )}
                    >
                      Score: {session.score}/100
                    </Badge>
                  )}
                  {session.verdict && (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {session.verdict}
                    </Badge>
                  )}
                  <span className="text-[10.5px] text-muted-foreground">
                    {Array.isArray(session.dialogue) ? session.dialogue.length : 0} Turns
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteSession(session.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-7 px-2 rounded-lg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedSession(session)
                    setSessionModalOpen(true)
                  }}
                  className="text-xs h-8 px-3 gap-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  <span>Review Transcript</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* SESSION TRANSCRIPT & DEBRIEF MODAL */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-3xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-bold flex items-center justify-between gap-2 flex-wrap">
              <span>{selectedSession?.targetCompany} — {selectedSession?.targetRole}</span>
              {selectedSession?.score !== null && (
                <Badge className="bg-emerald-600 text-white text-xs">
                  Score: {selectedSession?.score}/100
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recorded {selectedSession?.interviewType} Round on {selectedSession?.createdAt ? new Date(selectedSession.createdAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-3">
            {/* Executive Summary */}
            {selectedSession?.report?.executiveSummary && (
              <div className="rounded-2xl border border-border bg-muted/20 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Executive Feedback</span>
                </span>
                <p className="text-xs leading-relaxed text-foreground">
                  {selectedSession.report.executiveSummary}
                </p>
              </div>
            )}

            {/* Strengths & Improvement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedSession?.report?.strengths && selectedSession.report.strengths.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                  <span className="text-[10.5px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Key Strengths</span>
                  </span>
                  <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                    {selectedSession.report.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedSession?.report?.improvementAreas && selectedSession.report.improvementAreas.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                  <span className="text-[10.5px] font-bold text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Areas to Polish</span>
                  </span>
                  <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                    {selectedSession.report.improvementAreas.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Targeted Knowledge Gaps & Remediation */}
            {selectedSession?.report?.knowledgeGaps && selectedSession.report.knowledgeGaps.length > 0 && (
              <div className="pt-2 border-t">
                <GapDoctorSection
                  gaps={selectedSession.report.knowledgeGaps}
                  targetCompany={selectedSession.targetCompany}
                  targetRole={selectedSession.targetRole}
                />
              </div>
            )}

            {/* Complete Spoken Dialogue Transcript */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Full Spoken Dialogue Transcript
              </span>
              <div className="space-y-2 rounded-2xl border bg-muted/10 p-3">
                {Array.isArray(selectedSession?.dialogue) &&
                  selectedSession.dialogue.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex flex-col",
                        msg.role === "interviewer" ? "items-start" : "items-end"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground mb-0.5">
                        {msg.role === "interviewer" ? "Interviewer" : "You (Candidate)"} • {msg.timestamp || ""}
                      </span>
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-xs max-w-[90%] leading-relaxed",
                          msg.role === "interviewer"
                            ? "bg-muted text-foreground border border-border rounded-tl-sm"
                            : "bg-primary text-primary-foreground rounded-tr-sm"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
