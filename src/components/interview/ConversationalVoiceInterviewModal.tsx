"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  ConversationalVoiceInterviewModalProps,
  InterviewStep,
  InterviewerTone,
  VoiceGender,
  InterviewLanguage,
  DialogueMessage,
  InterviewReportData,
} from "./conversational/types"
import { InterviewSetupScreen } from "./conversational/InterviewSetupScreen"
import { ActiveInterviewRoom } from "./conversational/ActiveInterviewRoom"
import { InterviewReportView } from "./conversational/InterviewReportView"

export type { MockQuestion } from "./VoiceMockInterviewModal"

export function ConversationalVoiceInterviewModal({
  isOpen,
  onClose,
  initialRole = "Senior Fullstack Engineer",
  initialCompany = "Google / Tech Company",
  initialType = "Technical",
  onSessionSaved,
}: ConversationalVoiceInterviewModalProps) {
  // Session Configuration States
  const [step, setStep] = useState<InterviewStep>("setup")
  const [targetRole, setTargetRole] = useState(initialRole)
  const [targetCompany, setTargetCompany] = useState(initialCompany)
  const [interviewType, setInterviewType] = useState(initialType)
  const [interviewerTone, setInterviewerTone] = useState<InterviewerTone>("friendly")
  const [voiceGender, setVoiceGender] = useState<VoiceGender>("female")
  const [language, setLanguage] = useState<InterviewLanguage>("mixed")
  const [speechRate, setSpeechRate] = useState(0.92)
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
  const [report, setReport] = useState<InterviewReportData | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(true)

  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const isAiSpeakingRef = useRef(isAiSpeaking)
  const isAiThinkingRef = useRef(isAiThinking)
  const isPausedRef = useRef(isPaused)
  const shouldKeepListeningRef = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null)

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking
  }, [isAiSpeaking])

  useEffect(() => {
    isAiThinkingRef.current = isAiThinking
  }, [isAiThinking])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  // Sync speech input recognition language with selected interview language
  useEffect(() => {
    if (language === "en") {
      setSpeechInputLang("en-US")
    } else {
      setSpeechInputLang("bn-BD")
    }
  }, [language])

  // Strip markdown symbols for clean natural speech
  const cleanTextForSpeech = (raw: string): string => {
    return raw
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/[*_#~>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  // Voice gender matching helper
  const isVoiceMatchingGender = useCallback(
    (voice: SpeechSynthesisVoice, gender: VoiceGender): boolean => {
      const lower = voice.name.toLowerCase()
      const femaleKeywords = [
        "female",
        "zira",
        "hazel",
        "susan",
        "aria",
        "jenny",
        "samantha",
        "victoria",
        "karen",
        "kalpana",
        "woman",
        "google uk english female",
      ]
      const maleKeywords = [
        "guy",
        "christopher",
        "alex",
        "daniel",
        "tom",
        "george",
        "hemant",
        "male",
        "man",
        "google us english",
        "google uk english male",
        "david",
        "mark",
      ]

      if (gender === "male") {
        const isFemale = femaleKeywords.some((k) => lower.includes(k))
        return !isFemale
      } else {
        const isMale = maleKeywords.some((k) => lower.includes(k))
        return !isMale
      }
    },
    []
  )

  // Voice Matching
  const findBestVoiceForGender = useCallback(
    (voices: SpeechSynthesisVoice[], gender: VoiceGender, prefLang?: string): SpeechSynthesisVoice | undefined => {
      if (!voices || voices.length === 0) return undefined

      let candidates = voices.filter((v) => isVoiceMatchingGender(v, gender))
      if (candidates.length === 0) candidates = voices

      if (gender === "male") {
        const nonDavidMark = candidates.filter((v) => {
          const lower = v.name.toLowerCase()
          return !lower.includes("david") && !lower.includes("mark")
        })
        if (nonDavidMark.length > 0) candidates = nonDavidMark

        const ukMaleMatch = candidates.find((v) => {
          const lower = v.name.toLowerCase()
          return lower.includes("uk") || lower.includes("gb") || v.lang.toLowerCase().includes("gb")
        })
        if (ukMaleMatch) return ukMaleMatch

        const googleMale = candidates.find((v) => v.name.toLowerCase().includes("google"))
        if (googleMale) return googleMale
      } else {
        const ukFemaleMatch = candidates.find((v) => {
          const lower = v.name.toLowerCase()
          return lower.includes("uk") || lower.includes("gb") || v.lang.toLowerCase().includes("gb")
        })
        if (ukFemaleMatch) return ukFemaleMatch
      }

      if (prefLang) {
        const langMatch = candidates.find((v) => v.lang.toLowerCase().startsWith(prefLang.toLowerCase()))
        if (langMatch) return langMatch
      }

      return candidates[0]
    },
    [isVoiceMatchingGender]
  )

  // Load available browser voices for TTS matched to selected gender
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        setAvailableVoices(voices)
        if (voices.length > 0) {
          const best = findBestVoiceForGender(voices, voiceGender, language === "bn" ? "bn" : "en")
          if (best) {
            setSelectedVoice(best.name)
          }
        }
      }

      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices
    }
  }, [voiceGender, language, findBestVoiceForGender])

  // Scroll transcript to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [dialogue, currentTranscript])

  // 100% Guaranteed Microphone & Audio Teardown
  const stopAllAudioAndMic = useCallback(() => {
    // 1. Immediately kill loop flag so onend never restarts recognition
    shouldKeepListeningRef.current = false

    // 2. Clear auto-turn silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    // 3. Abort & stop SpeechRecognition instance and disconnect event listeners
    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current
        rec.onend = null
        rec.onerror = null
        rec.onresult = null
        rec.onstart = null
        rec.abort()
        rec.stop()
      } catch {
        // Ignore
      }
      recognitionRef.current = null
    }

    // 4. Stop Web Audio API pitch shifter node if active
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop()
        audioSourceNodeRef.current.disconnect()
      } catch {
        // Ignore
      }
      audioSourceNodeRef.current = null
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close()
      } catch {
        // Ignore
      }
      audioContextRef.current = null
    }

    // 5. Hard kill HTML5 Audio instance
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.onplay = null
        audioPlayerRef.current.onended = null
        audioPlayerRef.current.onerror = null
        audioPlayerRef.current.src = ""
      } catch {
        // Ignore
      }
      audioPlayerRef.current = null
    }

    // 6. Cancel browser speech synthesis completely
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // Ignore
      }
    }

    setIsAiSpeaking(false)
    setIsListening(false)
  }, [])

  // Clean-up on close and unmount
  useEffect(() => {
    if (!isOpen) {
      stopAllAudioAndMic()
      setStep("setup")
      setDialogue([])
      setCurrentTranscript("")
      setReport(null)
    }
    return () => {
      stopAllAudioAndMic()
    }
  }, [isOpen, stopAllAudioAndMic])

  // Server Fallback TTS
  const playServerTts = useCallback(
    async (textToSpeak: string, onDone?: () => void) => {
      try {
        const ttsUrl = `/api/ai/tts?text=${encodeURIComponent(textToSpeak)}&lang=${
          language === "bn" ? "bn" : "en"
        }&gender=${voiceGender}`

        if (voiceGender === "male" && typeof window !== "undefined") {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
          if (AudioContextClass) {
            try {
              const ctx = new AudioContextClass()
              audioContextRef.current = ctx

              const res = await fetch(ttsUrl)
              const arrayBuf = await res.arrayBuffer()
              const audioBuffer = await ctx.decodeAudioData(arrayBuf)

              const source = ctx.createBufferSource()
              audioSourceNodeRef.current = source
              source.buffer = audioBuffer

              // Detune -520 cents for deep male pitch
              source.detune.value = -520
              source.playbackRate.value = speechRate * 0.95

              const filter = ctx.createBiquadFilter()
              filter.type = "lowpass"
              filter.frequency.value = 2600

              source.connect(filter)
              filter.connect(ctx.destination)

              source.onended = () => {
                setIsAiSpeaking(false)
                if (onDone) onDone()
              }

              setIsAiSpeaking(true)
              setIsListening(false)
              source.start(0)
              return
            } catch (err) {
              console.warn("Web Audio API male pitch shift error, fallback to HTML5 audio:", err)
            }
          }
        }

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
          console.warn("Server TTS playback error:", e)
          setIsAiSpeaking(false)
          if (onDone) onDone()
        }

        audio.play().catch((err) => {
          console.warn("Audio autoplay blocked or failed:", err)
          setIsAiSpeaking(false)
          if (onDone) onDone()
        })
      } catch (e) {
        console.warn("Failed to initialize Audio TTS:", e)
        setIsAiSpeaking(false)
        if (onDone) onDone()
      }
    },
    [language, speechRate, voiceGender]
  )

  // Text-To-Speech function
  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      if (!text || !text.trim()) {
        if (onDone) onDone()
        return
      }

      const cleanText = cleanTextForSpeech(text)
      stopAllAudioAndMic()

      const hasBengali = /[\u0980-\u09FF]/.test(cleanText)

      // Bengali / Mixed Script
      if (hasBengali || language === "bn" || language === "mixed") {
        const nativeBengaliVoice = availableVoices.find(
          (v) =>
            (v.lang.toLowerCase().startsWith("bn") ||
              v.name.toLowerCase().includes("bengali") ||
              v.name.toLowerCase().includes("bangla")) &&
            isVoiceMatchingGender(v, voiceGender)
        )

        if (nativeBengaliVoice && (selectedVoice === nativeBengaliVoice.name || !selectedVoice)) {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(cleanText)
            utterance.voice = nativeBengaliVoice
            utterance.lang = nativeBengaliVoice.lang
            utterance.rate = speechRate
            utterance.pitch = voiceGender === "female" ? 1.05 : 0.88

            utterance.onstart = () => {
              setIsAiSpeaking(true)
              setIsListening(false)
            }
            utterance.onend = () => {
              setIsAiSpeaking(false)
              if (onDone) onDone()
            }
            utterance.onerror = () => {
              playServerTts(cleanText, onDone)
            }

            window.speechSynthesis.speak(utterance)
            return
          }
        }

        playServerTts(cleanText, onDone)
        return
      }

      // English Web Speech
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const selectedVoiceObj = availableVoices.find(
          (v) => v.name === selectedVoice && isVoiceMatchingGender(v, voiceGender)
        )
        const fallbackVoiceObj = findBestVoiceForGender(availableVoices, voiceGender, "en")
        const activeVoice = selectedVoiceObj || fallbackVoiceObj

        if (activeVoice) {
          const utterance = new SpeechSynthesisUtterance(cleanText)
          utterance.voice = activeVoice
          utterance.lang = activeVoice.lang || "en-US"
          utterance.rate = speechRate
          utterance.pitch = voiceGender === "female" ? 1.05 : 0.88

          utterance.onstart = () => {
            setIsAiSpeaking(true)
            setIsListening(false)
          }

          utterance.onend = () => {
            setIsAiSpeaking(false)
            if (onDone) onDone()
          }

          utterance.onerror = (e) => {
            console.warn("Browser Speech Synthesis error, playing fallback:", e)
            playServerTts(cleanText, onDone)
          }

          window.speechSynthesis.speak(utterance)
          return
        }
      }

      playServerTts(cleanText, onDone)
    },
    [
      availableVoices,
      findBestVoiceForGender,
      isVoiceMatchingGender,
      language,
      playServerTts,
      selectedVoice,
      speechRate,
      stopAllAudioAndMic,
      voiceGender,
    ]
  )

  // Trigger next conversational turn
  const sendTurnToAi = useCallback(
    async (answerText?: string, overrideHistory?: DialogueMessage[]) => {
      if (isPaused) return

      shouldKeepListeningRef.current = false
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
      let processedAnswer = answerText ? answerText.trim() : ""

      if (processedAnswer) {
        // Smart phonetic refinement for Bengali & Banglish to fix browser STT distortion
        if (language === "bn" || language === "mixed" || /[\u0980-\u09FF]/.test(processedAnswer)) {
          try {
            const refineRes = await fetch("/api/ai/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rawText: processedAnswer, language }),
            })
            if (refineRes.ok) {
              const refineData = await refineRes.json()
              if (refineData.transcript && refineData.transcript.trim()) {
                processedAnswer = refineData.transcript.trim()
              }
            }
          } catch {
            // Keep original processedAnswer if refinement request fails
          }
        }

        updatedDialogue.push({
          role: "candidate",
          text: processedAnswer,
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
            userAnswer: processedAnswer || undefined,
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
    if (typeof window === "undefined" || isPausedRef.current) return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.info("Microphone recognition not supported in this browser. You can type your answer.")
      return
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
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
      shouldKeepListeningRef.current = true
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
      setIsListening(false)
      if (
        shouldKeepListeningRef.current &&
        !isAiThinkingRef.current &&
        !isAiSpeakingRef.current &&
        !isPausedRef.current
      ) {
        setTimeout(() => {
          try {
            if (
              shouldKeepListeningRef.current &&
              !isAiThinkingRef.current &&
              !isAiSpeakingRef.current &&
              !isPausedRef.current
            ) {
              recognition.start()
            }
          } catch {
            if (startListeningRef.current) {
              startListeningRef.current()
            }
          }
        }, 250)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (e) {
      console.warn("Could not start recognition:", e)
    }
  }, [autoTurnActive, sendTurnToAi, speechInputLang])

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
      toast.info("Interview paused (Microphone deactivated)")
    }
  }, [autoTurnActive, isAiSpeaking, isAiThinking, isPaused, startListening, stopAllAudioAndMic])

  // Initialize and start session
  const handleStartInterview = async () => {
    setStep("interview")
    setDialogue([])
    setCurrentTranscript("")
    setReport(null)
    await sendTurnToAi(undefined, [])
  }

  // End Interview & Generate Full Report
  const handleEndInterview = async () => {
    stopAllAudioAndMic()
    toast.info("Microphone deactivated")

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] sm:max-h-[92vh] flex flex-col p-3 sm:p-6 overflow-hidden rounded-2xl sm:rounded-3xl">
        {/* SETUP SCREEN */}
        {step === "setup" && (
          <InterviewSetupScreen
            targetRole={targetRole}
            setTargetRole={setTargetRole}
            targetCompany={targetCompany}
            setTargetCompany={setTargetCompany}
            interviewType={interviewType}
            setInterviewType={setInterviewType}
            language={language}
            setLanguage={setLanguage}
            interviewerTone={interviewerTone}
            setInterviewerTone={setInterviewerTone}
            voiceGender={voiceGender}
            setVoiceGender={setVoiceGender}
            speechRate={speechRate}
            setSpeechRate={setSpeechRate}
            autoTurnActive={autoTurnActive}
            setAutoTurnActive={setAutoTurnActive}
            availableVoices={availableVoices}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            isVoiceMatchingGender={isVoiceMatchingGender}
            onTestVoice={() =>
              speakText(
                language === "bn" || language === "mixed"
                  ? "হ্যালো! আমি আপনার আজকের ইন্টারভিউয়ার। আপনি কি শুরু করতে প্রস্তুত?"
                  : "Hello! I will be your interviewer today. Are you ready to begin?"
              )
            }
            onStartInterview={handleStartInterview}
            onClose={onClose}
          />
        )}

        {/* ACTIVE CONVERSATIONAL INTERVIEW ROOM */}
        {step === "interview" && (
          <ActiveInterviewRoom
            targetCompany={targetCompany}
            targetRole={targetRole}
            interviewType={interviewType}
            interviewerTone={interviewerTone}
            voiceGender={voiceGender}
            language={language}
            isPaused={isPaused}
            togglePause={togglePause}
            showTranscriptDrawer={showTranscriptDrawer}
            setShowTranscriptDrawer={setShowTranscriptDrawer}
            onEndInterview={handleEndInterview}
            isAiSpeaking={isAiSpeaking}
            isListening={isListening}
            isAiThinking={isAiThinking}
            autoTurnActive={autoTurnActive}
            onMicClick={() => {
              if (!isAiSpeaking && !isAiThinking && !isPaused) {
                startListening()
              }
            }}
            speechInputLang={speechInputLang}
            setSpeechInputLang={(newLang) => {
              setSpeechInputLang(newLang)
              if (isListening) {
                stopAllAudioAndMic()
                setTimeout(() => startListening(), 150)
              }
            }}
            onToggleMute={isListening ? stopAllAudioAndMic : startListening}
            currentTranscript={currentTranscript}
            setCurrentTranscript={setCurrentTranscript}
            onSendTurn={sendTurnToAi}
            dialogue={dialogue}
            messagesEndRef={messagesEndRef}
          />
        )}

        {/* DEBRIEF & FULL STAR AUDIT REPORT SCREEN */}
        {step === "report" && (
          <InterviewReportView
            targetRole={targetRole}
            targetCompany={targetCompany}
            isGeneratingReport={isGeneratingReport}
            report={report}
            dialogueCount={dialogue.length}
            onPracticeAgain={() => {
              setStep("setup")
              setDialogue([])
              setReport(null)
            }}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
