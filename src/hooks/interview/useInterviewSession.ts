
"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  DialogueMessage,
  InterviewReportData,
  InterviewLanguage,
  VoiceGender,
  InterviewerTone,
} from "../../components/interview/conversational/types"

export function useInterviewSession(options: {
  targetRole: string
  targetCompany: string
  interviewType: string
  interviewerTone: InterviewerTone
  voiceGender: VoiceGender
  language: InterviewLanguage
  targetTurnCount: number
  setTargetTurnCount: React.Dispatch<React.SetStateAction<number>>
  applicationId?: string
  speakText: (text: string, onDone?: () => void) => void
  stopAllAudioAndMic: () => void
  startListening: () => void
  autoTurnActive: boolean
  onSessionSaved?: () => void
}) {
  const {
    targetRole,
    targetCompany,
    interviewType,
    interviewerTone,
    voiceGender,
    language,
    targetTurnCount,
    setTargetTurnCount,
    applicationId,
    speakText,
    stopAllAudioAndMic,
    startListening,
    autoTurnActive,
    onSessionSaved,
  } = options

  const [dialogue, setDialogue] = useState<DialogueMessage[]>([])
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [report, setReport] = useState<InterviewReportData | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState<number>(1)
  const [currentPhase, setCurrentPhase] = useState<string>("Warm-up & Introduction")
  const [isInterviewComplete, setIsInterviewComplete] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState(false)
  

  const sendTurnToAi = useCallback(
    async (answerText?: string, overrideHistory?: DialogueMessage[], recognitionRef?: any, shouldKeepListeningRef?: any) => {
      if (isPaused) return

      if (shouldKeepListeningRef) shouldKeepListeningRef.current = false
      setIsAiThinking(true)
      
      if (recognitionRef && recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore
        }
      }

      const activeHistory = overrideHistory || dialogue
      const updatedDialogue: DialogueMessage[] = [...activeHistory]
      const processedAnswer = answerText ? answerText.trim() : ""

      if (processedAnswer) {
        updatedDialogue.push({
          role: "candidate",
          text: processedAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })
        setDialogue(updatedDialogue)
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
            targetTurnCount,
            applicationId,
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

        if (data.currentQuestionNumber) setCurrentQuestionNumber(data.currentQuestionNumber)
        if (data.currentPhase) setCurrentPhase(data.currentPhase)
        if (data.isComplete) setIsInterviewComplete(true)

        const nextDialogue: DialogueMessage[] = [
          ...updatedDialogue,
          {
            role: "interviewer",
            text: aiReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]
        setDialogue(nextDialogue)

        // Turn off AI thinking state right as AI reply is ready and speaking begins
        setIsAiThinking(false)

        speakText(
          aiReply,
          () => {
            if (data.isComplete) {
              stopAllAudioAndMic()
              toast.success("Interview completed! You can now view your full evaluation report.")
            } else if (autoTurnActive && !isPaused) {
              startListening()
            }
          }
        )
      } catch (err: unknown) {
        setIsAiThinking(false)
        const msg = err instanceof Error ? err.message : "Error in conversation loop"
        toast.error(msg)
      }
    },
    [
      applicationId,
      autoTurnActive,
      dialogue,
      interviewType,
      interviewerTone,
      isPaused,
      language,
      speakText,
      stopAllAudioAndMic,
      targetCompany,
      targetRole,
      targetTurnCount,
      voiceGender,
      startListening,
    ]
  )

  const handleStartInterview = async () => {
    setDialogue([])
    setReport(null)
    setIsInterviewComplete(false)
    setCurrentQuestionNumber(1)
    setCurrentPhase("Warm-up & Introduction")
    await sendTurnToAi(undefined, [])
  }

  const handleEndInterview = async () => {
    stopAllAudioAndMic()
    toast.info("Microphone deactivated")

    if (dialogue.length < 2) {
      toast.info("Interview closed. Practice again when ready!")
      return false
    }

    setIsGeneratingReport(true)

    try {
      const res = await fetch("/api/ai/mock-interview/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          targetCompany,
          interviewType,
          language,
          applicationId,
          history: dialogue,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || "Failed to generate interview report.")
      }

      const reportData = await res.json()
      setReport(reportData)
      toast.success("Interview report generated!")
      onSessionSaved?.()
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate report"
      toast.error(msg)
      return false
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleExtendInterview = useCallback(() => {
    setTargetTurnCount((prev: number) => {
      const next = prev + 3
      toast.success(`Interview extended! ${next} total questions scheduled.`)
      return next
    })
    setIsInterviewComplete(false)
  }, [setTargetTurnCount])

  const togglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false)
      toast.success("Interview resumed")
      if (autoTurnActive && !isAiThinking) {
        setTimeout(() => startListening(), 200)
      }
    } else {
      setIsPaused(true)
      stopAllAudioAndMic()
      toast.info("Interview paused (Microphone deactivated)")
    }
  }, [autoTurnActive, isAiThinking, isPaused, startListening, stopAllAudioAndMic, setIsPaused])

  return {
    dialogue,
    setDialogue,
    isAiThinking,
    report,
    setReport,
    isGeneratingReport,
    currentQuestionNumber,
    currentPhase,
    isInterviewComplete,
    setIsInterviewComplete,
    isPaused,
    setIsPaused,
    sendTurnToAi,
    handleStartInterview,
    handleEndInterview,
    handleExtendInterview,
    togglePause,
    targetTurnCount,
  }
}
