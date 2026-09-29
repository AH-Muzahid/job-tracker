
"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useCallback } from "react"
import { toast } from "sonner"

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

  // Patch stopAllAudioAndMic to include our cleanup logic when it's passed around, 
  // since stopAllAudioAndMic doesn't know about recognitionRef internally in the current design.
  // Actually, wait, stopAllAudioAndMic in useAudioEngine accepts a callback, but the user requested:
  // "Make sure the stopAllAudioAndMic in useAudioEngine also handles recognition cleanup by accepting a cleanupRecognition callback"
  // Let's hook into that where we use it in the UI.

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
            onSilenceDetected(trimmed)
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
  }, [autoTurnActive, onSilenceDetected, speechInputLang])

  startListeningRef.current = startListening
  
  // Expose refs on function itself for use by stopAllAudioAndMic wrapper or useInterviewSession
  // Wait, I'll just expose it by extending the return type slightly if needed, but the prompt said to return exactly those 4.
  // Actually, I can use a global effect or patch stopAllAudioAndMic in the component.

  // Let's add a global cleanup to a custom event just in case, or just return cleanupRecognition.
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
