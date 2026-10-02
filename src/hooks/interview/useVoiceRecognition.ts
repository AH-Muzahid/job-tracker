
"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useCallback } from "react"
import { toast } from "sonner"

function sanitizeTranscript(raw: string): string {
  return raw
    // Collapse repeated Bengali dāri (।) or pipes (|)
    .replace(/[।|]{2,}/g, "। ")
    // Collapse repeated punctuation (. ? ! ,)
    .replace(/([.?!,])\1+/g, "$1")
    // Clean spaces before punctuation
    .replace(/\s+([।?!,.])/g, "$1")
    // Remove leading punctuation/symbols
    .replace(/^[।?!,.\s|]+/, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
}

export function useVoiceRecognition(options: {
  speechInputLang: "bn-BD" | "en-US"
  autoTurnActive: boolean
  isAiSpeaking: boolean
  isAiThinking: boolean
  isPaused: boolean
  onSilenceDetected: (transcript: string) => void
  stopAllAudioAndMic?: () => void
}) {
  const {
    speechInputLang,
    autoTurnActive,
    isAiSpeaking,
    isAiThinking,
    isPaused,
    onSilenceDetected,
    stopAllAudioAndMic: _stopAllAudioAndMic,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")

  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())
  const shouldKeepListeningRef = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})

  const isAiSpeakingRef = useRef(isAiSpeaking)
  const isAiThinkingRef = useRef(isAiThinking)
  const isPausedRef = useRef(isPaused)

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking
  }, [isAiSpeaking])

  useEffect(() => {
    isAiThinkingRef.current = isAiThinking
  }, [isAiThinking])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  const cleanupRecognition = useCallback(() => {
    shouldKeepListeningRef.current = false
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
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
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (
      typeof window === "undefined" ||
      isPausedRef.current ||
      isAiThinkingRef.current ||
      isAiSpeakingRef.current
    ) {
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.info("Microphone recognition not supported in this browser. You can type your answer.")
      return
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onresult = null
        recognitionRef.current.abort()
      } catch {
        // Ignore
      }
      recognitionRef.current = null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = speechInputLang

    recognition.onstart = () => {
      setIsListening(true)
      shouldKeepListeningRef.current = true
      lastSpeechTimeRef.current = Date.now()
    }

    recognition.onresult = (event: any) => {
      let liveText = ""
      for (let i = 0; i < event.results.length; i++) {
        liveText += event.results[i][0].transcript + " "
      }
      const cleaned = sanitizeTranscript(liveText)
      if (!cleaned) return

      setCurrentTranscript(cleaned)
      lastSpeechTimeRef.current = Date.now()

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      // Detect meaningful spoken words (exclude punctuation, symbols, whitespace)
      const meaningfulLength = cleaned.replace(/[\s\p{P}\p{S}]/gu, "").length
      if (autoTurnActive && meaningfulLength >= 2) {
        silenceTimerRef.current = setTimeout(() => {
          if (
            Date.now() - lastSpeechTimeRef.current >= 1900 &&
            !isAiThinkingRef.current &&
            !isAiSpeakingRef.current &&
            !isPausedRef.current
          ) {
            shouldKeepListeningRef.current = false
            try {
              recognition.stop()
            } catch {
              // Ignore
            }
            setIsListening(false)
            onSilenceDetected(cleaned)
          }
        }, 2000)
      }
    }

    recognition.onerror = (err: any) => {
      if (err.error === "no-speech") {
        return
      }
      if (err.error === "not-allowed" || err.error === "service-not-allowed") {
        toast.error("Microphone access blocked. Please allow microphone permission in your browser.")
        shouldKeepListeningRef.current = false
        setIsListening(false)
        return
      }
      if (err.error === "aborted") {
        return
      }
      console.warn("[VoiceRec] Speech Recognition error:", err.error)
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
          if (
            shouldKeepListeningRef.current &&
            !isAiThinkingRef.current &&
            !isAiSpeakingRef.current &&
            !isPausedRef.current
          ) {
            try {
              if (startListeningRef.current) {
                startListeningRef.current()
              }
            } catch (e) {
              console.warn("[VoiceRec] Auto-restart failed:", e)
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
  }, [autoTurnActive, onSilenceDetected, speechInputLang])

  startListeningRef.current = startListening

  return {
    isListening,
    currentTranscript,
    setCurrentTranscript,
    startListening,
    cleanupRecognition,
    shouldKeepListeningRef,
    recognitionRef,
  }
}
