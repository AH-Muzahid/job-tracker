"use client"

import React, { RefObject } from "react"
import {
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Send,
  Square,
  Sparkles,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-3 sm:space-y-4">
      {/* Header Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2.5 sm:pb-3 shrink-0 gap-2">
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
              Interviewer: <span className="font-semibold text-foreground">{getInterviewerName()}</span> ({getInterviewerToneLabel(interviewerTone)}) • {interviewType} • {language === "bn" ? "বাংলা" : language === "mixed" ? "Banglish" : "English"}
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

      {/* Central Animated Audio Waveform & Status */}
      <div className="rounded-2xl border bg-gradient-to-b from-indigo-950/10 via-background to-muted/20 p-3 sm:p-5 flex flex-col items-center justify-center space-y-2 sm:space-y-3 shrink-0">
        {/* Interviewer State Indicator */}
        <div className="relative flex items-center justify-center">
          {!isPaused && isAiSpeaking && (
            <div className="absolute -inset-3 rounded-full bg-indigo-500/25 animate-ping opacity-75" />
          )}
          {!isPaused && isListening && (
            <div className="absolute -inset-3 rounded-full bg-emerald-500/25 animate-ping opacity-75" />
          )}
          {!isPaused && isAiThinking && (
            <div className="absolute -inset-3 rounded-full bg-purple-500/25 animate-pulse" />
          )}
          <button
            type="button"
            onClick={onMicClick}
            title="Click to start or restart microphone"
            className={cn(
              "h-14 w-14 sm:h-18 sm:w-18 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer",
              isPaused
                ? "bg-amber-500/15 text-amber-500 border-2 border-amber-500/40 cursor-not-allowed"
                : isAiSpeaking
                ? "bg-indigo-600 text-white ring-4 ring-indigo-400/40 shadow-indigo-500/30 scale-105"
                : isListening
                ? "bg-emerald-600 text-white ring-4 ring-emerald-400/40 shadow-emerald-500/30 scale-105"
                : isAiThinking
                ? "bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white ring-4 ring-purple-400/40 shadow-purple-500/30 scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {isPaused ? (
              <Pause className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />
            ) : isAiSpeaking ? (
              <Volume2 className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse" />
            ) : isListening ? (
              <Mic className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse" />
            ) : isAiThinking ? (
              <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
            ) : (
              <VolumeX className="h-6 w-6 sm:h-7 sm:w-7" />
            )}
          </button>
        </div>

        {/* Status Text & Soundwave */}
        <div className="text-center space-y-0.5">
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            {isPaused
              ? "Interview Paused"
              : isAiSpeaking
              ? "Interviewer is speaking..."
              : isListening
              ? "Your Turn — Listening to your answer..."
              : isAiThinking
              ? "Analyzing your answer & preparing follow-up..."
              : "Ready"}
          </p>
          <p className="text-[10.5px] sm:text-xs text-muted-foreground max-w-sm">
            {isPaused
              ? "Audio on hold. Click Resume when ready."
              : isListening && autoTurnActive
              ? "Speak naturally. Pausing for 2.2s automatically submits."
              : isAiThinking
              ? "Evaluating depth, structure & STAR metrics..."
              : "Continuous duplex interview session."}
          </p>
        </div>

        {/* Sleek Dynamic Soundwave & Analysis Waveform */}
        {!isPaused && (
          <div className="flex items-center justify-center gap-1 h-6">
            {isAiThinking ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-spin" />
                <span className="text-[11px] font-medium text-purple-600 dark:text-purple-300">
                  Analyzing response...
                </span>
                <div className="flex items-center gap-1 ml-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            ) : isAiSpeaking || isListening ? (
              [35, 75, 45, 95, 60, 100, 50, 85, 40, 90, 65, 30, 80, 55, 70].map((h, i) => (
                <div
                  key={i}
                  className={`w-0.5 sm:w-1 rounded-full transition-all duration-150 animate-pulse ${
                    isAiSpeaking ? "bg-indigo-500 shadow-xs shadow-indigo-500/50" : "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  }`}
                  style={{
                    height: `${h}%`,
                    animationDelay: `${(i % 5) * 120}ms`,
                  }}
                />
              ))
            ) : null}
          </div>
        )}
      </div>

      {/* Live Candidate Speech Box */}
      <div className="space-y-1 shrink-0">
        <div className="flex items-center justify-between text-xs flex-wrap gap-1">
          <span className="font-semibold text-foreground flex items-center gap-1 text-[11px] sm:text-xs">
            <Mic className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", !isPaused && isListening ? "text-emerald-500 animate-pulse" : "text-muted-foreground")} />
            <span>Live Spoken Answer</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Speech-to-Text Language Switcher */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-[9.5px] sm:text-[10px]">
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
              className="text-[10px] sm:text-xs h-6 px-1.5 text-muted-foreground hover:text-foreground"
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
            className="text-xs leading-relaxed min-h-[44px] sm:min-h-[56px]"
          />
          <Button
            onClick={() => onSendTurn(currentTranscript)}
            disabled={!currentTranscript.trim() || isAiThinking || isPaused}
            className="h-auto px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </div>

      {/* Conversation History Drawer */}
      {showTranscriptDrawer && (
        <div className="flex-1 overflow-y-auto no-scrollbar rounded-xl border bg-muted/10 p-2.5 sm:p-4 space-y-2.5 min-h-[100px] max-h-[30vh] sm:max-h-none">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                  <span className="font-bold">
                    {msg.role === "interviewer" ? `Interviewer (${targetCompany})` : "You (Candidate)"}
                  </span>
                  <span>• {msg.timestamp}</span>
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-xs max-w-[90%] sm:max-w-[85%] leading-relaxed",
                    msg.role === "interviewer"
                      ? "bg-muted text-foreground border rounded-tl-sm"
                      : "bg-indigo-600 text-white rounded-tr-sm"
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
