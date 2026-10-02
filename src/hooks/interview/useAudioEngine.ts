"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { InterviewLanguage, VoiceGender } from "../../components/interview/conversational/types"

function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g, "")
    .replace(/\x60([^\x60]+)\x60/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[*_#~>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

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
  const pendingAudioRef = useRef<{ arrayBuf: ArrayBuffer; onDone?: () => void } | null>(null)
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false)

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

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try {
          audioContextRef.current.close()
        } catch {}
      }
    }
  }, [])

  const unlockAudio = useCallback(async () => {
    if (typeof window === "undefined") return
    try {
      // 1. Initialize and resume Web Audio AudioContext during user gesture
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
          audioContextRef.current = new AudioCtx()
        }
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume()
        }
      }

      // 2. Prime HTMLAudioElement with silent audio to register user interaction
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio()
      }
      const silentWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
      audioPlayerRef.current.src = silentWav
      await audioPlayerRef.current.play().catch(() => {})
      setIsAutoplayBlocked(false)
    } catch {
      // Non-blocking
    }
  }, [])

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

    // Keep audioContextRef open so future plays remain unlocked without user gesture

    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.currentTime = 0
        audioPlayerRef.current.onplay = null
        audioPlayerRef.current.onended = null
        audioPlayerRef.current.onerror = null
      } catch {
        // Ignore
      }
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

  const playAudioBuffer = useCallback(
    async (arrayBuf: ArrayBuffer, onDone?: () => void): Promise<boolean> => {
      // 1. Primary: Web Audio API (immune to autoplay restrictions once resumed)
      if (audioContextRef.current) {
        try {
          if (audioContextRef.current.state === "suspended") {
            await audioContextRef.current.resume()
          }
          if (audioContextRef.current.state === "running") {
            if (audioSourceNodeRef.current) {
              try {
                audioSourceNodeRef.current.stop()
                audioSourceNodeRef.current.disconnect()
              } catch {}
              audioSourceNodeRef.current = null
            }

            const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuf.slice(0))
            const sourceNode = audioContextRef.current.createBufferSource()
            sourceNode.buffer = decodedBuffer
            sourceNode.playbackRate.value = speechRate
            sourceNode.connect(audioContextRef.current.destination)
            sourceNode.onended = () => {
              audioSourceNodeRef.current = null
              setIsAiSpeaking(false)
              if (onDone) onDone()
            }
            audioSourceNodeRef.current = sourceNode
            setIsAiSpeaking(true)
            setIsAutoplayBlocked(false)
            sourceNode.start(0)
            return true
          }
        } catch (webAudioErr) {
          console.warn("[AudioEngine] WebAudio decode/playback error, falling back to Audio element:", webAudioErr)
        }
      }

      // 2. Secondary: HTMLAudioElement
      try {
        const blob = new Blob([arrayBuf], { type: "audio/mpeg" })
        const blobUrl = URL.createObjectURL(blob)
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio()
        }
        const audio = audioPlayerRef.current
        audio.src = blobUrl
        audio.playbackRate = speechRate

        audio.onplay = () => {
          setIsAiSpeaking(true)
          setIsAutoplayBlocked(false)
        }
        audio.onended = () => {
          URL.revokeObjectURL(blobUrl)
          setIsAiSpeaking(false)
          if (onDone) onDone()
        }
        audio.onerror = (e) => {
          URL.revokeObjectURL(blobUrl)
          console.warn("[AudioEngine] Audio element playback error:", e)
          setIsAiSpeaking(false)
          if (onDone) onDone()
        }

        await audio.play()
        return true
      } catch (audioErr: unknown) {
        const err = audioErr as { name?: string; message?: string } | null
        if (err?.name === "NotAllowedError" || err?.message?.includes("interact")) {
          setIsAutoplayBlocked(true)
          pendingAudioRef.current = { arrayBuf, onDone }
          return false
        }
        console.warn("[AudioEngine] Audio element play failed:", audioErr)
        setIsAiSpeaking(false)
        if (onDone) onDone()
        return false
      }
    },
    [speechRate]
  )

  const resumeBlockedAudio = useCallback(async () => {
    setIsAutoplayBlocked(false)
    await unlockAudio()
    if (pendingAudioRef.current) {
      const { arrayBuf, onDone } = pendingAudioRef.current
      pendingAudioRef.current = null
      // Re-run playback with the unblocked context
      if (audioContextRef.current && audioContextRef.current.state === "running") {
        try {
          const decoded = await audioContextRef.current.decodeAudioData(arrayBuf.slice(0))
          const source = audioContextRef.current.createBufferSource()
          source.buffer = decoded
          source.playbackRate.value = speechRate
          source.connect(audioContextRef.current.destination)
          source.onended = () => {
            setIsAiSpeaking(false)
            if (onDone) onDone()
          }
          audioSourceNodeRef.current = source
          setIsAiSpeaking(true)
          source.start(0)
          return
        } catch {
          // Fall through
        }
      }
      if (audioPlayerRef.current) {
        const blob = new Blob([arrayBuf], { type: "audio/mpeg" })
        const blobUrl = URL.createObjectURL(blob)
        audioPlayerRef.current.src = blobUrl
        audioPlayerRef.current.onended = () => {
          URL.revokeObjectURL(blobUrl)
          setIsAiSpeaking(false)
          if (onDone) onDone()
        }
        await audioPlayerRef.current.play().catch(() => {
          if (onDone) onDone()
        })
      }
    }
  }, [unlockAudio, speechRate])

  const playServerTts = useCallback(
    async (textToSpeak: string, onDone?: () => void) => {
      try {
        const ttsUrl = `/api/ai/tts?text=${encodeURIComponent(textToSpeak)}&lang=${
          language === "bn" ? "bn" : "en"
        }&gender=${voiceGender}`

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
        const played = await playAudioBuffer(arrayBuf, onDone)
        if (!played && isAutoplayBlocked) {
          // If autoplay blocked, try speech synthesis as backup
          if (typeof window !== "undefined" && window.speechSynthesis) {
            try {
              const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(textToSpeak))
              utterance.lang = language === "en" ? "en-US" : "bn-BD"
              utterance.rate = speechRate
              utterance.onstart = () => setIsAiSpeaking(true)
              utterance.onend = () => {
                setIsAiSpeaking(false)
                setIsAutoplayBlocked(false)
                if (onDone) onDone()
              }
              utterance.onerror = () => {
                setIsAiSpeaking(false)
              }
              window.speechSynthesis.speak(utterance)
              return
            } catch {
              // Ignore
            }
          }
        }
      } catch (e) {
        console.warn("Failed to initialize Audio TTS:", e)
        setIsAiSpeaking(false)
        if (onDone) onDone()
      }
    },
    [language, playAudioBuffer, speechRate, voiceGender, isAutoplayBlocked]
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
    [playServerTts, stopAllAudioAndMic]
  )

  return {
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    isAiSpeaking,
    isAutoplayBlocked,
    resumeBlockedAudio,
    unlockAudio,
    speakText,
    stopAllAudioAndMic,
    isVoiceMatchingGender,
  }
}
