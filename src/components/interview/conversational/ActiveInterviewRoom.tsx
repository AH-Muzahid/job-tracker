"use client"

import React, { RefObject } from "react"
import {
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  BrainCircuit,
  Loader2,
  Award,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  DialogueMessage,
  InterviewerTone,
  VoiceGender,
  InterviewLanguage,
} from "./types"

interface ActiveInterviewRoomProps {
  targetCompany: string
  targetRole: string
  interviewType: string
  interviewerTone: InterviewerTone
  voiceGender: VoiceGender
  language: InterviewLanguage
  isPaused: boolean
  togglePause: () => void
  showTranscriptDrawer: boolean
  setShowTranscriptDrawer: (val: boolean) => void
  onEndInterview: () => void
  isAiSpeaking: boolean
  isListening: boolean
  isAiThinking: boolean
  autoTurnActive: boolean
  onMicClick: () => void
  speechInputLang: "bn-BD" | "en-US"
  setSpeechInputLang: (val: "bn-BD" | "en-US") => void
  onToggleMute: () => void
  currentTranscript: string
  setCurrentTranscript: (val: string) => void
  onSendTurn: (text?: string) => void
  dialogue: DialogueMessage[]
  messagesEndRef: RefObject<HTMLDivElement | null>
  currentQuestionNumber: number
  targetTurnCount: number
  currentPhase: string
  isInterviewComplete: boolean
}

export function ActiveInterviewRoom({
  targetCompany,
  targetRole,
  interviewType,
  interviewerTone,
  voiceGender,
  language,
  isPaused,
  togglePause,
  showTranscriptDrawer,
  setShowTranscriptDrawer,
  onEndInterview,
  isAiSpeaking,
  isListening,
  isAiThinking,
  autoTurnActive,
  onMicClick,
  speechInputLang,
  setSpeechInputLang,
  onToggleMute,
  currentTranscript,
  setCurrentTranscript,
  onSendTurn,
  dialogue,
  messagesEndRef,
  currentQuestionNumber,
  targetTurnCount,
  currentPhase,
  isInterviewComplete,
}: ActiveInterviewRoomProps) {
  const getInterviewerToneLabel = (tone: InterviewerTone) => {
    switch (tone) {
      case "strict":
        return "FAANG Bar Raiser"
      case "startup-cto":
        return "Startup CTO"
      case "architect":
        return "System Architect"
      case "friendly":
      default:
        return "Friendly"
    }
  }

  const getInterviewerName = () => {
    if (language === "en") {
      return voiceGender === "female" ? "Sarah" : "David"
    }
    return voiceGender === "female" ? "তানিয়া" : "তানভীর"
  }

  const progressPercentage = Math.round(
    (Math.min(currentQuestionNumber, targetTurnCount) / targetTurnCount) * 100
  )

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-3 sm:space-y-4">
      {/* Header Status Bar */}
      <div className="flex flex-col border-b pb-2.5 sm:pb-3 shrink-0 gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                {targetCompany} — {targetRole}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                Interviewer: <span className="font-semibold text-foreground">{getInterviewerName()}</span> ({getInterviewerToneLabel(interviewerTone)}) • {interviewType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={togglePause}
              className={cn(
                "text-[11px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 gap-1 font-medium transition-colors",
                isPaused
                  ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "hover:bg-accent"
              )}
            >
              {isPaused ? <Play className="h-3 w-3 fill-current" /> : <Pause className="h-3 w-3" />}
              <span>{isPaused ? "Resume" : "Pause"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
              className="text-[11px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
            >
              {showTranscriptDrawer ? "Hide Transcript" : "Show Transcript"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onEndInterview}
              className="text-[11px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 gap-1"
            >
              <Square className="h-3 w-3" />
              <span>End & Report</span>
            </Button>
          </div>
        </div>

        {/* Phase & Turn Progress Bar */}
        <div className="pt-1 space-y-1">
          <div className="flex justify-between items-center text-[10px] sm:text-[11px]">
            <span className="font-semibold text-primary flex items-center gap-1">
              <span>{isInterviewComplete ? "Interview Concluded" : `Question ${currentQuestionNumber} of ${targetTurnCount}`}</span>
              <span className="text-muted-foreground font-normal">• [{currentPhase}]</span>
            </span>
            <span className="text-muted-foreground font-medium">{progressPercentage}% Completed</span>
          </div>
          <Progress value={progressPercentage} className="h-1.5 bg-muted" />
        </div>
      </div>

      {/* Completion Banner (if finished) */}
      {isInterviewComplete && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Award className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-xs font-bold">Interview Completed</p>
              <p className="text-[10.5px] text-muted-foreground">The interviewer has wrapped up. Click below to view your performance report.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onEndInterview}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 px-4 font-medium shadow-xs cursor-pointer w-full sm:w-auto"
          >
            <span>View STAR Report</span>
          </Button>
        </div>
      )}

      {/* Central Modern Audio Waveform & Status Hub */}
      <div className="rounded-2xl border border-border bg-card p-2.5 sm:p-3.5 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        {/* Left: Interactive Mic & Speaker Orb */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center shrink-0">
            {!isPaused && isAiSpeaking && (
              <div className="absolute -inset-1.5 rounded-full bg-primary/30 animate-ping opacity-60" />
            )}
            {!isPaused && isListening && (
              <div className="absolute -inset-1.5 rounded-full bg-emerald-500/30 animate-ping opacity-60" />
            )}
            {!isPaused && isAiThinking && (
              <div className="absolute -inset-1.5 rounded-full bg-primary/30 animate-pulse" />
            )}
            <button
              type="button"
              onClick={onMicClick}
              disabled={isInterviewComplete}
              title="Microphone Status"
              className={cn(
                "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center shadow-md transition-all duration-300 cursor-pointer shrink-0",
                isInterviewComplete
                  ? "bg-emerald-600 text-white shadow-emerald-500/30"
                  : isPaused
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/40 cursor-not-allowed"
                  : isAiSpeaking
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-xs"
                  : isListening
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-400/40 shadow-xs"
                  : isAiThinking
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/40 shadow-xs"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isInterviewComplete ? (
                <Award className="h-5 w-5 text-white" />
              ) : isPaused ? (
                <Pause className="h-5 w-5 text-amber-500" />
              ) : isAiSpeaking ? (
                <Volume2 className="h-5 w-5 animate-pulse" />
              ) : isListening ? (
                <Mic className="h-5 w-5 animate-pulse" />
              ) : isAiThinking ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Status Label */}
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                {isInterviewComplete
                  ? "Interview Completed"
                  : isPaused
                  ? "Interview Paused"
                  : isAiSpeaking
                  ? `${getInterviewerName()} is speaking...`
                  : isListening
                  ? "Listening to you..."
                  : isAiThinking
                  ? "Evaluating & thinking..."
                  : "Ready"}
              </p>
              {isAiThinking && (
                <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                  <BrainCircuit className="h-2.5 w-2.5 animate-pulse" />
                  <span>Analyzing</span>
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
              {isInterviewComplete
                ? "All rounds completed. Review your report below."
                : isPaused
                ? "Click Resume to continue."
                : isListening && autoTurnActive
                ? "Pause for 2s to submit automatically."
                : isAiThinking
                ? "Processing your answer..."
                : "Duplex live voice session."}
            </p>
          </div>
        </div>

        {/* Right: Sleek Dynamic Visualizer Bars */}
        {!isPaused && !isInterviewComplete && (
          <div className="flex items-center gap-1 h-7 px-2 shrink-0">
            {isAiThinking ? (
              <div className="flex items-center gap-1">
                {[40, 80, 50, 90, 60].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-purple-500 animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                ))}
              </div>
            ) : isAiSpeaking || isListening ? (
              [30, 65, 45, 90, 55, 100, 50, 80, 40, 70].map((h, i) => (
                <div
                  key={i}
                  className={`w-0.5 sm:w-1 rounded-full transition-all duration-150 animate-pulse ${
                    isAiSpeaking
                      ? "bg-primary"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    height: `${h}%`,
                    animationDelay: `${(i % 4) * 120}ms`,
                  }}
                />
              ))
            ) : (
              <div className="flex items-center gap-1 opacity-30">
                {[30, 30, 30, 30].map((h, i) => (
                  <div key={i} className="w-1 h-2 rounded-full bg-muted-foreground" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Candidate Speech Box (if not completed) */}
      {!isInterviewComplete && (
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-xs flex-wrap gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground flex items-center gap-1 text-[11px] sm:text-xs">
                <Mic className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", !isPaused && isListening ? "text-emerald-500 animate-pulse" : "text-muted-foreground")} />
                <span>Live Spoken Answer</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Speech-to-Text Language Switcher */}
              <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-[9.5px] sm:text-[10px]">
                <button
                  type="button"
                  onClick={() => setSpeechInputLang("bn-BD")}
                  className={cn(
                    "px-1.5 sm:px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer",
                    speechInputLang === "bn-BD"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  বাংলা
                </button>
                <button
                  type="button"
                  onClick={() => setSpeechInputLang("en-US")}
                  className={cn(
                    "px-1.5 sm:px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer",
                    speechInputLang === "en-US"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  English
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleMute}
                disabled={isPaused}
                className="text-[10px] sm:text-xs h-6 px-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isListening ? "Mute" : "Unmute"}
              </Button>
            </div>
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <Textarea
              value={currentTranscript}
              onChange={(e) => setCurrentTranscript(e.target.value)}
              placeholder="Your live speech transcribes here automatically..."
              rows={2}
              className="text-xs leading-relaxed min-h-[44px] sm:min-h-[56px] bg-background border-border"
            />
            <Button
              onClick={() => onSendTurn(currentTranscript)}
              disabled={!currentTranscript.trim() || isAiThinking || isPaused}
              className="h-auto px-3 sm:px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer"
            >
              Send
            </Button>
          </div>
        </div>
      )}

      {/* Conversation History Drawer */}
      {showTranscriptDrawer && (
        <div className="flex-1 overflow-y-auto no-scrollbar rounded-xl border border-border bg-muted/10 p-2.5 sm:p-4 space-y-2.5 min-h-[100px] max-h-[30vh] sm:max-h-none">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Interview Dialogue History ({dialogue.length} turns)
          </span>
          <div className="space-y-2">
            {dialogue.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex flex-col",
                  msg.role === "interviewer" ? "items-start" : "items-end"
                )}
              >
                <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] text-muted-foreground mb-0.5">
                  <span className="font-medium">
                    {msg.role === "interviewer" ? `Interviewer (${targetCompany})` : "You (Candidate)"}
                  </span>
                  <span>• {msg.timestamp}</span>
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-xs max-w-[90%] sm:max-w-[85%] leading-relaxed",
                    msg.role === "interviewer"
                      ? "bg-muted text-foreground border border-border rounded-tl-sm"
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}
