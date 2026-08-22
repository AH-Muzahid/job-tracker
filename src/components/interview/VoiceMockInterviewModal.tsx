"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react"
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Loader2,
  ChevronRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export interface MockQuestion {
  id?: string
  question: string
  category: string
  difficulty: string
  answer?: string
}

interface VoiceMockInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  question: MockQuestion
  targetRole?: string
}

export function VoiceMockInterviewModal({
  isOpen,
  onClose,
  question,
  targetRole = "Software Engineer",
}: VoiceMockInterviewModalProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<any | null>(null)
  const [showModelAnswer, setShowModelAnswer] = useState(false)

  const recognitionRef = useRef<any>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onresult = (event: any) => {
          let currentTranscript = ""
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + " "
          }
          setTranscript(currentTranscript.trim())
        }

        recognition.onerror = (err: any) => {
          console.warn("Speech recognition error:", err)
          if (err.error !== "no-speech") {
            toast.error("Speech recognition error: " + err.error)
          }
        }

        recognition.onend = () => {
          if (isRecording) {
            try {
              recognition.start()
            } catch {
              // Ignore restart error
            }
          }
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isRecording])

  // Timer logic
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [isRecording])

  // Reset states on open/close
  useEffect(() => {
    if (!isOpen) {
      stopRecording()
      setTranscript("")
      setTimerSeconds(0)
      setEvaluation(null)
      setShowModelAnswer(false)
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isOpen])

  const startRecording = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }

    setTranscript("")
    setTimerSeconds(0)
    setEvaluation(null)
    setIsRecording(true)

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.warn("Could not start recognition:", e)
      }
    } else {
      toast.info("Microphone recognition not supported in this browser. You can type your answer.")
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
    }
  }

  const toggleTextToSpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser.")
      return
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(question.question)
      utterance.rate = 0.95
      utterance.pitch = 1.0
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleEvaluate = async () => {
    if (!transcript.trim()) {
      toast.error("Please record or write your answer first.")
      return
    }

    stopRecording()
    setIsEvaluating(true)

    try {
      const res = await fetch("/api/ai/mock-interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          category: question.category,
          difficulty: question.difficulty,
          userAnswer: transcript,
          targetRole,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to evaluate response.")
      }

      const data = await res.json()
      setEvaluation(data)
      toast.success("Answer evaluated!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evaluation failed"
      toast.error(msg)
    } finally {
      setIsEvaluating(false)
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <DialogHeader className="space-y-2 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                {question.category}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {question.difficulty}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Role: {targetRole}
            </span>
          </div>
          <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
            {question.question}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Interactive voice mock interview room with real-time STAR evaluation.
          </DialogDescription>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTextToSpeech}
              className="text-xs gap-1.5 h-8"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-destructive" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  <span>Hear Question</span>
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Live Audio / Transcript Input Area */}
        {!evaluation && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl border bg-muted/20 space-y-4">
              {/* Mic pulse button */}
              <div className="relative">
                {isRecording && (
                  <div className="absolute -inset-2 rounded-full bg-red-500/20 animate-ping" />
                )}
                <Button
                  size="icon"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isEvaluating}
                  className="h-16 w-16 rounded-full shadow-lg transition-transform active:scale-95"
                >
                  {isRecording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
                </Button>
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {isRecording ? "Listening... Speak your answer now" : "Click Microphone to start speaking"}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {isRecording ? `Recording: ${formatTime(timerSeconds)}` : "Or type your answer in the box below"}
                </p>
              </div>

              {/* Animated audio visualizer bars when recording */}
              {isRecording && (
                <div className="flex items-center gap-1.5 h-6">
                  {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Editable Transcript */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Spoken Transcript / Written Answer</span>
                <span className="text-muted-foreground text-[11px]">
                  {transcript.split(/\s+/).filter(Boolean).length} words
                </span>
              </label>
              <Textarea
                placeholder="Your spoken transcript will appear here automatically, or you can type directly..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                disabled={isEvaluating}
                className="min-h-[120px] text-xs font-normal leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isEvaluating} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEvaluate}
                disabled={isEvaluating || !transcript.trim()}
                className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Grading with STAR Method...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Grade My Answer</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STAR Evaluation Results Card */}
        {evaluation && (
          <div className="space-y-6">
            {/* Top Score Banner */}
            <div className="rounded-2xl border p-5 bg-gradient-to-br from-indigo-950/20 via-background to-background space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Overall Performance Score</h3>
                    <p className="text-xs text-muted-foreground">Evaluated using the STAR Hiring Bar Framework</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-indigo-500">
                    {evaluation.overallScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Technical Depth</span>
                    <span>{evaluation.technicalScore}%</span>
                  </div>
                  <Progress value={evaluation.technicalScore} className="h-1.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Communication & Clarity</span>
                    <span>{evaluation.clarityScore}%</span>
                  </div>
                  <Progress value={evaluation.clarityScore} className="h-1.5" />
                </div>
              </div>
            </div>

            {/* 4-Card STAR Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                STAR Method Analysis
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border p-3 bg-card space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">[S] Situation</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {evaluation.starBreakdown?.situation}
                  </p>
                </div>
                <div className="rounded-xl border p-3 bg-card space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">[T] Task</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {evaluation.starBreakdown?.task}
                  </p>
                </div>
                <div className="rounded-xl border p-3 bg-card space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">[A] Action</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {evaluation.starBreakdown?.action}
                  </p>
                </div>
                <div className="rounded-xl border p-3 bg-card space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">[R] Result</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {evaluation.starBreakdown?.result}
                  </p>
                </div>
              </div>
            </div>

            {/* Strengths & Improvement Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border p-3 bg-emerald-500/5 border-emerald-500/20 space-y-2">
                <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Key Strengths</span>
                </h5>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {evaluation.strengths?.map((str: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border p-3 bg-amber-500/5 border-amber-500/20 space-y-2">
                <h5 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Areas to Improve</span>
                </h5>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {evaluation.improvementAreas?.map((imp: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Ideal Model Answer Accordion */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-foreground">Ideal Principal-Level Model Answer</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModelAnswer(!showModelAnswer)}
                  className="text-xs h-7 gap-1 text-indigo-500 hover:text-indigo-600"
                >
                  <span>{showModelAnswer ? "Hide" : "Show Model Answer"}</span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${showModelAnswer ? "rotate-90" : ""}`} />
                </Button>
              </div>

              {showModelAnswer && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-foreground font-normal leading-relaxed whitespace-pre-wrap">
                  {evaluation.idealModelAnswer}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEvaluation(null)
                  setTranscript("")
                  setTimerSeconds(0)
                }}
                className="text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Practice Again</span>
              </Button>
              <Button size="sm" onClick={onClose} className="text-xs">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
