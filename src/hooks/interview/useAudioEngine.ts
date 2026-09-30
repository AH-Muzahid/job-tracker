
"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react"
import { InterviewLanguage, VoiceGender } from "../../components/interview/conversational/types"

export function useAudioEngine(options: {
  language: InterviewLanguage
  voiceGender: VoiceGender
  speechRate: number
}) {
  const { language, voiceGender, speechRate } = options

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null)

  const cleanTextForSpeech = (raw: string): string => {
    return raw
      .replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g, "")
      .replace(/\x60([^\x60]+)\x60/g, "$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/[*_#~>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  const isVoiceMatchingGender = useCallback(
    (voice: SpeechSynthesisVoice, gender: VoiceGender): boolean => {
      const lower = voice.name.toLowerCase()
      const femaleKeywords = [
        "female", "zira", "hazel", "susan", "aria", "jenny", "samantha",
        "victoria", "karen", "kalpana", "woman", "google uk english female",
      ]
      const maleKeywords = [
        "guy", "christopher", "alex", "daniel", "tom", "george", "hemant",
        "male", "man", "google us english", "google uk english male", "david", "mark",
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

  const stopAllAudioAndMic = useCallback((cleanupRecognition?: () => void) => {
    if (cleanupRecognition) {
      cleanupRecognition()
    }

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

    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // Ignore
      }
    }

    setIsAiSpeaking(false)
  }, [])

  const playServerTts = useCallback(
    async (textToSpeak: string, onDone?: () => void) => {
      try {
        const ttsUrl = `/api/ai/tts?text=\$\{encodeURIComponent(textToSpeak)}\&lang=\$\{
          language === "bn" ? "bn" : "en"
        }\&gender=\$\{voiceGender}`

        const res = await fetch(ttsUrl)
        if (res.status === 204 || !res.ok) {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(textToSpeak))
            if (language === "bn" || language === "mixed" || /[\u0980-\u09FF]/.test(textToSpeak)) {
              utterance.lang = "bn-BD"
            } else {
              utterance.lang = "en-US"
            }
            utterance.rate = speechRate
            utterance.pitch = voiceGender === "female" ? 1.05 : 0.88
            utterance.onstart = () => {
              setIsAiSpeaking(true)
            }
            utterance.onend = () => {
              setIsAiSpeaking(false)
              if (onDone) onDone()
            }
            utterance.onerror = () => {
              setIsAiSpeaking(false)
              if (onDone) onDone()
            }
            window.speechSynthesis.speak(utterance)
            return
          }
          setIsAiSpeaking(false)
          if (onDone) onDone()
          return
        }

        const arrayBuf = await res.arrayBuffer()

        // Clean, natural audio playback without mechanical pitch distortion
        const blob = new Blob([arrayBuf], { type: "audio/mpeg" })
        const blobUrl = URL.createObjectURL(blob)
        const audio = new Audio(blobUrl)
        audioPlayerRef.current = audio
        audio.playbackRate = speechRate

        audio.onplay = () => {
          setIsAiSpeaking(true)
        }
        audio.onended = () => {
          URL.revokeObjectURL(blobUrl)
          setIsAiSpeaking(false)
          if (onDone) onDone()
        }
        audio.onerror = (e) => {
          URL.revokeObjectURL(blobUrl)
          console.warn("Server TTS playback error:", e)
          setIsAiSpeaking(false)
          if (onDone) onDone()
        }

        audio.play().catch((err) => {
          URL.revokeObjectURL(blobUrl)
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

  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      if (!text || !text.trim()) {
        if (onDone) onDone()
        return
      }

      const cleanText = cleanTextForSpeech(text)
      stopAllAudioAndMic()

      // Primary: High-fidelity Server Neural Voice (Microsoft Edge Neural / OpenAI TTS)
      // This provides lifelike, natural human cadence, breathing, and zero mechanical robotic tones.
      playServerTts(cleanText, () => {
        if (onDone) onDone()
      })
    },
    [cleanTextForSpeech, playServerTts, stopAllAudioAndMic]
  )

  return {
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    isAiSpeaking,
    speakText,
    stopAllAudioAndMic,
    isVoiceMatchingGender,
  }
}
