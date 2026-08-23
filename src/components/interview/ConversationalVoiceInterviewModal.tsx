"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Award,
  CheckCircle2,
  AlertTriangle,
  Send,
  Globe,
  Settings2,
  Square,
  Sparkles,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface DialogueMessage {
  role: "interviewer" | "candidate"
  text: string
  timestamp: string
}

interface ConversationalVoiceInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  initialRole?: string
  initialCompany?: string
  initialType?: string
  onSessionSaved?: () => void
}

export function ConversationalVoiceInterviewModal({
  isOpen,
  onClose,
  initialRole = "Senior Fullstack Engineer",
  initialCompany = "Google / Tech Company",
  initialType = "Technical",
  onSessionSaved,
}: ConversationalVoiceInterviewModalProps) {
  // Session Configuration States
  const [step, setStep] = useState<"setup" | "interview" | "report">("setup")
  const [targetRole, setTargetRole] = useState(initialRole)
  const [targetCompany, setTargetCompany] = useState(initialCompany)
  const [interviewType, setInterviewType] = useState(initialType)
  const [interviewerTone, setInterviewerTone] = useState<"friendly" | "strict" | "startup-cto" | "architect">("friendly")
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female")
  const [language, setLanguage] = useState<"en" | "bn" | "mixed">("mixed")
  const [speechRate, setSpeechRate] = useState(0.92) // Smooth natural speed
  const [isPaused, setIsPaused] = useState(false)
  const [speechInputLang, setSpeechInputLang] = useState<"bn-BD" | "en-US">("bn-BD")

  // Runtime Conversational States
  const [dialogue, setDialogue] = useState<DialogueMessage[]>([])
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [autoTurnActive, setAutoTurnActive] = useState(true)
  const [report, setReport] = useState<any | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(true)

  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Sync speech input recognition language with selected interview language
  useEffect(() => {
    if (language === "en") {
      setSpeechInputLang("en-US")
    } else {
      setSpeechInputLang("bn-BD")
    }
  }, [language])

  // Load available browser voices for TTS matched to selected gender
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        setAvailableVoices(voices)
        if (voices.length > 0) {
          let matchedVoice: SpeechSynthesisVoice | undefined
          if (voiceGender === "female") {
            matchedVoice = voices.find((v) =>
              (v.name.includes("Jenny") ||
                v.name.includes("Aria") ||
                v.name.includes("Google US English") ||
                v.name.includes("Samantha") ||
                v.name.includes("Victoria") ||
                v.name.includes("Zira") ||
                v.name.includes("Karen") ||
                v.name.toLowerCase().includes("female"))
            )
          } else {
            matchedVoice = voices.find((v) =>
              (v.name.includes("Guy") ||
                v.name.includes("Christopher") ||
                v.name.includes("Google UK English Male") ||
                v.name.includes("David") ||
                v.name.includes("Daniel") ||
                v.name.includes("Alex") ||
                v.name.includes("Tom") ||
                v.name.toLowerCase().includes("male"))
            )
          }
          if (!matchedVoice) {
            matchedVoice =
              voices.find((v) => v.name.includes("Natural") || v.name.includes("Google")) ||
              voices[0]
          }
          if (matchedVoice) {
            setSelectedVoice(matchedVoice.name)
          }
        }
      }

      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices
    }
  }, [voiceGender])

  // Scroll transcript to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [dialogue, currentTranscript])

  const startListeningRef = useRef<() => void>(() => {})
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  const stopAllAudioAndMic = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current.currentTime = 0
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsAiSpeaking(false)
    setIsListening(false)
  }, [])

  // Clean-up on close
  useEffect(() => {
    if (!isOpen) {
      stopAllAudioAndMic()
      setStep("setup")
      setDialogue([])
      setCurrentTranscript("")
      setReport(null)
    }
  }, [isOpen, stopAllAudioAndMic])

  // Text-To-Speech function with natural human audio playback
  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      if (!text || !text.trim()) {
        if (onDone) onDone()
        return
      }

      // Stop any prior ongoing speech
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.currentTime = 0
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      const hasBengali = /[\u0980-\u09FF]/.test(text)

      // 1. High-fidelity Server-side TTS for Bangla / Mixed script
      if (hasBengali || language === "bn" || language === "mixed") {
        try {
          const ttsUrl = `/api/ai/tts?text=${encodeURIComponent(text)}&lang=bn&gender=${voiceGender}`
          const audio = new Audio(ttsUrl)
          audioPlayerRef.current = audio
          audio.playbackRate = speechRate

          audio.onplay = () => {
            setIsAiSpeaking(true)
            setIsListening(false)
          }
          audio.onended = () => {
            setIsAiSpeaking(false)
            if (onDone) onDone()
          }
          audio.onerror = (e) => {
            console.warn("Server TTS playback error, falling back to Web Speech:", e)
            setIsAiSpeaking(false)
            if (onDone) onDone()
          }

          audio.play().catch((err) => {
            console.warn("Audio autoplay blocked or failed:", err)
            setIsAiSpeaking(false)
            if (onDone) onDone()
          })
          return
        } catch (e) {
          console.warn("Failed to initialize Audio TTS:", e)
        }
      }

      // 2. Browser SpeechSynthesis for standard English
      if (typeof window === "undefined" || !window.speechSynthesis) {
        if (onDone) onDone()
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      const preferredVoice = availableVoices.find((v) => v.name === selectedVoice)
      if (preferredVoice) utterance.voice = preferredVoice
      utterance.lang = preferredVoice ? preferredVoice.lang : "en-US"
      utterance.rate = speechRate
      utterance.pitch = voiceGender === "female" ? 1.05 : 0.92

      utterance.onstart = () => {
        setIsAiSpeaking(true)
        setIsListening(false)
      }

      utterance.onend = () => {
        setIsAiSpeaking(false)
        if (onDone) onDone()
      }

      utterance.onerror = (e) => {
        console.warn("TTS Error:", e)
        setIsAiSpeaking(false)
        if (onDone) onDone()
      }

      window.speechSynthesis.speak(utterance)
    },
    [availableVoices, language, selectedVoice, speechRate, voiceGender]
  )

  // Trigger next conversational turn
  const sendTurnToAi = useCallback(
    async (answerText?: string, overrideHistory?: DialogueMessage[]) => {
      if (isPaused) return

      setIsAiThinking(true)
      setIsListening(false)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore
        }
      }

      const activeHistory = overrideHistory || dialogue
      const updatedDialogue: DialogueMessage[] = [...activeHistory]

      if (answerText && answerText.trim()) {
        updatedDialogue.push({
          role: "candidate",
          text: answerText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })
        setDialogue(updatedDialogue)
        setCurrentTranscript("")
      }

      try {
        const res = await fetch("/api/ai/mock-interview/converse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetRole,
            targetCompany,
            interviewType,
            interviewerTone,
            voiceGender,
            language,
            history: updatedDialogue.map((d) => ({ role: d.role, text: d.text })),
            userAnswer: answerText,
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || "Failed to get response from interviewer.")
        }

        const data = await res.json()
        const rawReply = data.reply || ""
        const aiReply = rawReply.replace(/```(?:suggestions|json)?[\s\S]*?```/gi, "").trim()

        const nextDialogue: DialogueMessage[] = [
          ...updatedDialogue,
          {
            role: "interviewer",
            text: aiReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]
        setDialogue(nextDialogue)

        // Read aloud with TTS, then automatically open mic if not paused
        speakText(aiReply, () => {
          if (autoTurnActive && !isPaused) {
            startListeningRef.current()
          }
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error in conversation loop"
        toast.error(msg)
      } finally {
        setIsAiThinking(false)
      }
    },
    [
      autoTurnActive,
      dialogue,
      interviewType,
      interviewerTone,
      isPaused,
      language,
      speakText,
      targetCompany,
      targetRole,
      voiceGender,
    ]
  )

  // Start continuous microphone listener with silence auto-submit (VAD)
  const startListening = useCallback(() => {
    if (typeof window === "undefined" || isPaused) return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.info("Microphone recognition not supported in this browser. You can type your answer.")
      return
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // Ignore
      }
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = speechInputLang

    recognition.onstart = () => {
      setIsListening(true)
      setIsAiSpeaking(false)
      lastSpeechTimeRef.current = Date.now()
    }

    recognition.onresult = (event: any) => {
      let liveText = ""
      for (let i = 0; i < event.results.length; i++) {
        liveText += event.results[i][0].transcript + " "
      }
      const trimmed = liveText.trim()
      setCurrentTranscript(trimmed)
      lastSpeechTimeRef.current = Date.now()

      // Reset Silence Timer (2.2 seconds of silence triggers automated turn submission)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (autoTurnActive && trimmed.length > 5) {
        silenceTimerRef.current = setTimeout(() => {
          if (Date.now() - lastSpeechTimeRef.current >= 2100) {
            sendTurnToAi(trimmed)
          }
        }, 2200)
      }
    }

    recognition.onerror = (err: any) => {
      if (err.error !== "no-speech") {
        console.warn("Speech Rec Error:", err)
      }
    }

    recognition.onend = () => {
      if (isListening && !isAiThinking && !isAiSpeaking && !isPaused) {
        try {
          recognition.start()
        } catch {
          // Ignore
        }
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (e) {
      console.warn("Could not start recognition:", e)
    }
  }, [autoTurnActive, isAiSpeaking, isAiThinking, isListening, isPaused, sendTurnToAi, speechInputLang])

  startListeningRef.current = startListening

  // Pause / Resume toggle handler
  const togglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false)
      toast.success("Interview resumed")
      if (autoTurnActive && !isAiSpeaking && !isAiThinking) {
        setTimeout(() => startListening(), 200)
      }
    } else {
      setIsPaused(true)
      stopAllAudioAndMic()
      toast.info("Interview paused")
    }
  }, [autoTurnActive, isAiSpeaking, isAiThinking, isPaused, startListening, stopAllAudioAndMic])

  // Initialize and start session
  const handleStartInterview = async () => {
    setStep("interview")
    setDialogue([])
    setCurrentTranscript("")
    setReport(null)
    // Send opening prompt
    await sendTurnToAi(undefined, [])
  };

  // End Interview & Generate Full Report
  const handleEndInterview = async () => {
    stopAllAudioAndMic()

    if (dialogue.length < 2) {
      toast.info("Interview closed. Practice again when ready!")
      setStep("setup")
      return
    }

    setIsGeneratingReport(true)
    setStep("report")

    try {
      const res = await fetch("/api/ai/mock-interview/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          targetCompany,
          interviewType,
          language,
          history: dialogue,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate interview report.")
      }

      const reportData = await res.json()
      setReport(reportData)
      toast.success("Interview report generated!")
      onSessionSaved?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report"
      toast.error(msg)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "Strong Hire":
        return <Badge className="bg-emerald-600 text-white font-bold text-sm px-3 py-1">Strong Hire</Badge>
      case "Hire":
        return <Badge className="bg-emerald-500 text-white font-bold text-sm px-3 py-1">Hire</Badge>
      case "Lean Hire":
        return <Badge className="bg-amber-500 text-white font-bold text-sm px-3 py-1">Lean Hire</Badge>
      default:
        return <Badge className="bg-red-500 text-white font-bold text-sm px-3 py-1">Needs Improvement</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* SETUP SCREEN */}
        {step === "setup" && (
          <div className="space-y-6">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Real-time Duplex Voice Interview
                </span>
              </div>
              <DialogTitle className="text-xl font-bold">
                Configure Your Conversational Mock Interview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Natural back-and-forth verbal interview with intelligent follow-ups, hands-free turn taking, and bilingual support.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Role</Label>
                <Input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Company</Label>
                <Input
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Google, Stripe, Local Startup"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Interview Focus Round</Label>
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical & Architecture</SelectItem>
                    <SelectItem value="System Design">System Design & Scaling</SelectItem>
                    <SelectItem value="Behavioral">Behavioral (STAR Method)</SelectItem>
                    <SelectItem value="Leadership">Engineering Leadership</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Interview Language</span>
                </Label>
                <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Banglish / Bilingual (English + বাংলা)</SelectItem>
                    <SelectItem value="bn">বাংলা (Pure Bengali)</SelectItem>
                    <SelectItem value="en">English (International Tech Standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Interviewer Persona & Tone Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center justify-between">
                <span>Interviewer Persona & Tone</span>
                <span className="text-[10px] text-muted-foreground">Select how the interviewer behaves</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: "friendly" as const,
                    title: "😊 Friendly & Encouraging",
                    desc: "Warm & supportive mentor. Gives positive feedback and builds confidence.",
                  },
                  {
                    id: "strict" as const,
                    title: "🧐 Strict FAANG Bar Raiser",
                    desc: "Uncompromising standards. Deeply probes edge cases, complexity & trade-offs.",
                  },
                  {
                    id: "startup-cto" as const,
                    title: "⚡ Fast-Paced Startup CTO",
                    desc: "Pragmatic, crisp, & direct. Focuses on real-world shipping & production reality.",
                  },
                  {
                    id: "architect" as const,
                    title: "🏛️ Principal System Architect",
                    desc: "High scalability, distributed failure modes, consistency & deep internals.",
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInterviewerTone(t.id)}
                    className={cn(
                      "flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer",
                      interviewerTone === t.id
                        ? "border-indigo-600 bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/50"
                        : "border-border hover:border-muted-foreground/30 bg-muted/10"
                    )}
                  >
                    <span className="text-xs font-semibold text-foreground">{t.title}</span>
                    <span className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Profile & Cadence Tuning */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-semibold flex items-center justify-between text-foreground">
                <span className="flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Interviewer Voice & Speech Tuning</span>
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">Lifelike Non-Robotic Speech</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Male / Female Voice Selector */}
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Interviewer Voice Gender</span>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant={voiceGender === "female" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVoiceGender("female")}
                      className={cn(
                        "text-xs h-8 gap-1.5 justify-center",
                        voiceGender === "female" && "bg-indigo-600 hover:bg-indigo-700 text-white"
                      )}
                    >
                      <span>👩 Female ({language === "en" ? "Sarah" : "তানিয়া"})</span>
                    </Button>
                    <Button
                      type="button"
                      variant={voiceGender === "male" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVoiceGender("male")}
                      className={cn(
                        "text-xs h-8 gap-1.5 justify-center",
                        voiceGender === "male" && "bg-indigo-600 hover:bg-indigo-700 text-white"
                      )}
                    >
                      <span>👨 Male ({language === "en" ? "David" : "তানভীর"})</span>
                    </Button>
                  </div>
                </div>

                {/* Cadence */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Speaking Cadence</span>
                    <span className="font-semibold text-foreground">{speechRate}x (Natural Pace)</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.1"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
                  />
                </div>
              </div>

              {/* Hands-Free VAD Toggle */}
              <div className="pt-2 border-t flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Automated Hands-Free Turn Taking (VAD)</p>
                  <p className="text-[10px] text-muted-foreground">Automatically sends your answer after 2.2s of silence</p>
                </div>
                <Button
                  type="button"
                  variant={autoTurnActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoTurnActive(!autoTurnActive)}
                  className="text-xs h-7 px-3"
                >
                  <span>{autoTurnActive ? "✓ Enabled" : "Manual Click"}</span>
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleStartInterview}
                className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5"
              >
                <Play className="h-4 w-4" /> Start Interview Room
              </Button>
            </div>
          </div>
        )}

        {/* ACTIVE CONVERSATIONAL INTERVIEW ROOM */}
        {step === "interview" && (
          <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
            {/* Header Status Bar */}
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {targetCompany} — {targetRole}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Interviewer: <span className="font-semibold text-foreground">{voiceGender === "female" ? (language === "en" ? "Sarah" : "তানিয়া") : (language === "en" ? "David" : "তানভীর")}</span> ({interviewerTone === "friendly" ? "Friendly" : interviewerTone === "strict" ? "FAANG Bar Raiser" : interviewerTone === "startup-cto" ? "Startup CTO" : "System Architect"}) • {interviewType} • {language === "bn" ? "বাংলা" : language === "mixed" ? "Banglish" : "English"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={isPaused ? "default" : "outline"}
                  size="sm"
                  onClick={togglePause}
                  className={cn(
                    "text-xs h-8 gap-1.5 font-medium transition-colors",
                    isPaused
                      ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "hover:bg-accent"
                  )}
                >
                  {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
                  <span>{isPaused ? "Resume Interview" : "Pause"}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
                  className="text-xs h-8"
                >
                  {showTranscriptDrawer ? "Hide Transcript" : "Show Transcript"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndInterview}
                  className="text-xs h-8 gap-1"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>End & Get Report</span>
                </Button>
              </div>
            </div>

            {/* Central Animated Audio Waveform & Status */}
            <div className="rounded-2xl border bg-gradient-to-b from-indigo-950/10 via-background to-muted/20 p-6 flex flex-col items-center justify-center space-y-4 shrink-0">
              {/* Interviewer State Indicator */}
              <div className="relative flex items-center justify-center">
                {!isPaused && isAiSpeaking && (
                  <div className="absolute -inset-4 rounded-full bg-indigo-500/20 animate-pulse" />
                )}
                {!isPaused && isListening && (
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping" />
                )}
                <div
                  className={`h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isPaused
                      ? "bg-amber-500/15 text-amber-500 border-2 border-amber-500/40"
                      : isAiSpeaking
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-400/30 scale-105"
                      : isListening
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-400/30 scale-105"
                      : isAiThinking
                      ? "bg-amber-600 text-white animate-spin"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPaused ? (
                    <Pause className="h-8 w-8 text-amber-500" />
                  ) : isAiSpeaking ? (
                    <Volume2 className="h-9 w-9 animate-bounce" />
                  ) : isListening ? (
                    <Mic className="h-9 w-9 animate-pulse" />
                  ) : isAiThinking ? (
                    <RotateCcw className="h-8 w-8" />
                  ) : (
                    <VolumeX className="h-8 w-8" />
                  )}
                </div>
              </div>

              {/* Status Text & Soundwave */}
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {isPaused
                    ? "Interview Paused"
                    : isAiSpeaking
                    ? "Interviewer is speaking..."
                    : isListening
                    ? "Your Turn — Listening to your answer (Hands-Free)..."
                    : isAiThinking
                    ? "Interviewer is analyzing and preparing next question..."
                    : "Ready"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPaused
                    ? "Audio and microphone are on hold. Click Resume when you are ready to continue."
                    : isListening && autoTurnActive
                    ? "Speak naturally. Pausing for 2.2s will automatically proceed."
                    : "Continuous duplex interview session."}
                </p>
              </div>

              {/* Dynamic Soundbars */}
              {!isPaused && (isAiSpeaking || isListening) && (
                <div className="flex items-center gap-1.5 h-6">
                  {[35, 75, 45, 95, 60, 100, 50, 85, 40, 90, 65, 30].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full animate-pulse ${
                        isAiSpeaking ? "bg-indigo-500" : "bg-emerald-500"
                      }`}
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Live Candidate Speech Box */}
            <div className="space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Mic className={`h-3.5 w-3.5 ${!isPaused && isListening ? "text-emerald-500 animate-pulse" : "text-muted-foreground"}`} />
                  <span>Live Spoken Answer</span>
                </span>
                <div className="flex items-center gap-2">
                  {/* Speech-to-Text Language Switcher */}
                  <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSpeechInputLang("bn-BD")
                        if (isListening) {
                          stopAllAudioAndMic()
                          setTimeout(() => startListening(), 150)
                        }
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded-md font-medium transition-colors",
                        speechInputLang === "bn-BD"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      বাংলা (bn-BD)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSpeechInputLang("en-US")
                        if (isListening) {
                          stopAllAudioAndMic()
                          setTimeout(() => startListening(), 150)
                        }
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded-md font-medium transition-colors",
                        speechInputLang === "en-US"
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      English (en-US)
                    </button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isListening ? stopAllAudioAndMic : startListening}
                    disabled={isPaused}
                    className="text-xs h-6 text-muted-foreground hover:text-foreground"
                  >
                    {isListening ? "Mute Mic" : "Unmute Mic"}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={currentTranscript}
                  onChange={(e) => setCurrentTranscript(e.target.value)}
                  placeholder="Your live spoken speech will transcribe here automatically as you talk..."
                  rows={2}
                  className="text-xs leading-relaxed"
                />
                <Button
                  onClick={() => sendTurnToAi(currentTranscript)}
                  disabled={!currentTranscript.trim() || isAiThinking || isPaused}
                  className="h-auto px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </Button>
              </div>
            </div>

            {/* Conversation History Drawer */}
            {showTranscriptDrawer && (
              <div className="flex-1 overflow-y-auto rounded-xl border bg-muted/10 p-4 space-y-3 min-h-[140px]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Interview Dialogue History ({dialogue.length} turns)
                </span>
                <div className="space-y-2.5">
                  {dialogue.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        msg.role === "interviewer" ? "items-start" : "items-end"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <span className="font-bold">
                          {msg.role === "interviewer" ? `Interviewer (${targetCompany})` : "You (Candidate)"}
                        </span>
                        <span>• {msg.timestamp}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs max-w-[85%] leading-relaxed ${
                          msg.role === "interviewer"
                            ? "bg-muted text-foreground border rounded-tl-sm"
                            : "bg-indigo-600 text-white rounded-tr-sm"
                        }`}
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
        )}

        {/* DEBRIEF & FULL STAR AUDIT REPORT SCREEN */}
        {step === "report" && (
          <div className="space-y-6 overflow-y-auto max-h-[80vh] p-1">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Award className="h-6 w-6 text-indigo-500" />
                    <span>Hiring Committee Debrief & Performance Audit</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Comprehensive STAR evaluation for {targetRole} at {targetCompany}.
                  </DialogDescription>
                </div>
                {report && getVerdictBadge(report.verdict)}
              </div>
            </DialogHeader>

            {isGeneratingReport && (
              <div className="py-16 text-center space-y-3">
                <RotateCcw className="h-8 w-8 text-indigo-500 animate-spin mx-auto" />
                <p className="text-sm font-semibold">Analyzing interview dialogue with STAR method...</p>
                <p className="text-xs text-muted-foreground">Calculating hiring bar scores and identifying growth areas...</p>
              </div>
            )}

            {report && (
              <div className="space-y-6">
                {/* Score Summary */}
                <div className="rounded-2xl border p-5 bg-gradient-to-br from-indigo-950/20 via-background to-background space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Cumulative Hiring Score</h4>
                      <p className="text-xs text-muted-foreground">Based on {dialogue.length} interview turns</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-extrabold text-indigo-500">{report.overallScore}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Technical Depth</span>
                        <span>{report.technicalScore}%</span>
                      </div>
                      <Progress value={report.technicalScore} className="h-1.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Communication & Structure</span>
                        <span>{report.clarityScore}%</span>
                      </div>
                      <Progress value={report.clarityScore} className="h-1.5" />
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                {report.executiveSummary && (
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-1.5">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Executive Summary & Feedback
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {report.executiveSummary}
                    </p>
                  </div>
                )}

                {/* STAR Method Analysis */}
                {report.starBreakdown && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      STAR Method Deconstruction
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border p-3 bg-card space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">[S] Situation</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {report.starBreakdown.situation}
                        </p>
                      </div>
                      <div className="rounded-xl border p-3 bg-card space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">[T] Task</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {report.starBreakdown.task}
                        </p>
                      </div>
                      <div className="rounded-xl border p-3 bg-card space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">[A] Action</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {report.starBreakdown.action}
                        </p>
                      </div>
                      <div className="rounded-xl border p-3 bg-card space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">[R] Result</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {report.starBreakdown.result}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-3 bg-emerald-500/5 border-emerald-500/20 space-y-2">
                    <h5 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Demonstrated Strengths</span>
                    </h5>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {report.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border p-3 bg-amber-500/5 border-amber-500/20 space-y-2">
                    <h5 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Coaching Areas</span>
                    </h5>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {report.improvementAreas?.map((imp: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStep("setup")
                      setDialogue([])
                      setReport(null)
                    }}
                    className="text-xs gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Practice Another Interview</span>
                  </Button>
                  <Button size="sm" onClick={onClose} className="text-xs">
                    Close Room
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
