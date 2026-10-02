
"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Square } from "lucide-react"
import {
  ConversationalVoiceInterviewModalProps,
  InterviewStep,
  InterviewerTone,
  VoiceGender,
  InterviewLanguage,
} from "./conversational/types"
import { InterviewSetupScreen } from "./conversational/InterviewSetupScreen"
import { ActiveInterviewRoom } from "./conversational/ActiveInterviewRoom"
import { InterviewReportView } from "./conversational/InterviewReportView"

import { useAudioEngine } from "../../hooks/interview/useAudioEngine"
import { useVoiceRecognition } from "../../hooks/interview/useVoiceRecognition"
import { useInterviewSession } from "../../hooks/interview/useInterviewSession"

export type { MockQuestion } from "./conversational/types"

export function ConversationalVoiceInterviewModal({
  isOpen,
  onClose,
  initialRole = "Senior Fullstack Engineer",
  initialCompany = "Google / Tech Company",
  initialType = "Technical",
  initialTone = "friendly",
  initialTurns = 8,
  applicationId,
  onSessionSaved,
}: ConversationalVoiceInterviewModalProps) {
  const [step, setStep] = useState<InterviewStep>("setup")
  const [targetRole, setTargetRole] = useState(initialRole)
  const [targetCompany, setTargetCompany] = useState(initialCompany)
  const [interviewType, setInterviewType] = useState(initialType)
  const [interviewerTone, setInterviewerTone] = useState<InterviewerTone>(initialTone)
  const [targetTurnCount, setTargetTurnCount] = useState<number>(initialTurns)
  
  useEffect(() => {
    if (initialRole) setTargetRole(initialRole)
    if (initialCompany) setTargetCompany(initialCompany)
    if (initialType) setInterviewType(initialType)
    if (initialTone) setInterviewerTone(initialTone)
  }, [initialRole, initialCompany, initialType, initialTone])

  const [voiceGender, setVoiceGender] = useState<VoiceGender>("female")
  const [language, setLanguage] = useState<InterviewLanguage>("mixed")
  const [speechRate, setSpeechRate] = useState(0.92)
  const [speechInputLang, setSpeechInputLang] = useState<"bn-BD" | "en-US">("bn-BD")
  const [autoTurnActive, setAutoTurnActive] = useState(true)
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(true)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (language === "en") {
      setSpeechInputLang("en-US")
    } else {
      setSpeechInputLang("bn-BD")
    }
  }, [language])

  const {
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    isAiSpeaking,
    isAutoplayBlocked,
    resumeBlockedAudio,
    unlockAudio,
    speakText: audioEngineSpeakText,
    stopAllAudioAndMic: audioEngineStop,
    isVoiceMatchingGender,
  } = useAudioEngine({ language, voiceGender, speechRate })

  const handleSendTurnRef = useRef<(text?: string, overrideHistory?: any) => Promise<void>>(async () => {})
  const startListeningRef = useRef<() => void>(() => {})
  const cleanupRecognitionRef = useRef<() => void>(() => {})

  const handleSilenceDetected = useCallback((transcript: string) => {
    handleSendTurnRef.current(transcript)
  }, [])

  const stopAll = useCallback(() => {
    audioEngineStop(cleanupRecognitionRef.current)
  }, [audioEngineStop])

  const {
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
    sendTurnToAi,
    handleStartInterview: sessionStartInterview,
    handleEndInterview: sessionEndInterview,
    handleExtendInterview,
    togglePause,
  } = useInterviewSession({
    targetRole,
    targetCompany,
    interviewType,
    interviewerTone,
    voiceGender,
    language,
    targetTurnCount,
    setTargetTurnCount,
    applicationId,
    speakText: (text, onDone) => audioEngineSpeakText(text, onDone),
    stopAllAudioAndMic: stopAll,
    startListening: () => startListeningRef.current(),
    autoTurnActive,
    onSessionSaved,
  })

  const {
    isListening,
    currentTranscript,
    setCurrentTranscript,
    startListening,
    cleanupRecognition,
    shouldKeepListeningRef,
    recognitionRef,
  } = useVoiceRecognition({
    speechInputLang,
    autoTurnActive,
    isAiSpeaking,
    isAiThinking,
    isPaused,
    onSilenceDetected: handleSilenceDetected,
    stopAllAudioAndMic: () => stopAll(),
  })

  startListeningRef.current = startListening
  cleanupRecognitionRef.current = cleanupRecognition

  const handleSendTurn = useCallback(async (text?: string, overrideHistory?: any) => {
    setCurrentTranscript("")
    await sendTurnToAi(text, overrideHistory, recognitionRef, shouldKeepListeningRef)
  }, [sendTurnToAi, setCurrentTranscript, recognitionRef, shouldKeepListeningRef])

  handleSendTurnRef.current = handleSendTurn

  const handleStartInterview = async () => {
    // 1. Prime AudioContext and HTMLAudioElement inside this user click
    await unlockAudio()

    // 2. Proactively request mic permission in this user gesture
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
      } catch (e) {
        console.warn("[InterviewModal] Microphone pre-permission dismissed or not granted:", e)
      }
    }

    setStep("interview")
    setCurrentTranscript("")
    await sessionStartInterview()
  }

  const handleEndInterview = async () => {
    const success = await sessionEndInterview()
    if (success) {
      setStep("report")
    } else {
      setStep("setup")
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [dialogue, currentTranscript])

  const handleRequestClose = useCallback(() => {
    if (step === "interview" && dialogue.length > 0 && !isInterviewComplete) {
      setShowExitConfirm(true)
    } else {
      stopAll()
      onClose()
    }
  }, [step, dialogue.length, isInterviewComplete, stopAll, onClose])

  useEffect(() => {
    if (!isOpen) {
      stopAll()
      setStep("setup")
      setDialogue([])
      setCurrentTranscript("")
      setReport(null)
    }
    return () => {
      stopAll()
    }
  }, [isOpen, stopAll, setDialogue, setCurrentTranscript, setReport])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleRequestClose() }}>
      <DialogContent
        onInteractOutside={(e) => {
          if (step === "interview" && dialogue.length > 0 && !isInterviewComplete) {
            e.preventDefault()
            setShowExitConfirm(true)
          }
        }}
        onEscapeKeyDown={(e) => {
          if (step === "interview" && dialogue.length > 0 && !isInterviewComplete) {
            e.preventDefault()
            setShowExitConfirm(true)
          }
        }}
        className="w-[95vw] max-w-4xl max-h-[90vh] sm:max-h-[92vh] flex flex-col p-3 sm:p-6 overflow-hidden rounded-[8px] relative border-border bg-background text-foreground"
      >
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
            targetTurnCount={targetTurnCount}
            setTargetTurnCount={setTargetTurnCount}
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
            onTestVoice={async () => {
              await unlockAudio()
              audioEngineSpeakText(
                language === "bn" || language === "mixed"
                  ? "হ্যালো! আমি আপনার আজকের ইন্টারভিউয়ার। আপনি কি শুরু করতে প্রস্তুত?"
                  : "Hello! I will be your interviewer today. Are you ready to begin?"
              )
            }}
            onStartInterview={handleStartInterview}
            onClose={onClose}
          />
        )}

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
            isAutoplayBlocked={isAutoplayBlocked}
            resumeBlockedAudio={resumeBlockedAudio}
            autoTurnActive={autoTurnActive}
            onMicClick={() => {
              if (isAutoplayBlocked) {
                resumeBlockedAudio()
                return
              }
              if (!isAiSpeaking && !isAiThinking && !isPaused && !isInterviewComplete) {
                startListening()
              }
            }}
            speechInputLang={speechInputLang}
            setSpeechInputLang={(newLang) => {
              setSpeechInputLang(newLang)
              if (isListening) {
                stopAll()
                setTimeout(() => startListening(), 150)
              }
            }}
            onToggleMute={isListening ? stopAll : startListening}
            currentTranscript={currentTranscript}
            setCurrentTranscript={setCurrentTranscript}
            onSendTurn={handleSendTurn}
            dialogue={dialogue}
            messagesEndRef={messagesEndRef}
            currentQuestionNumber={currentQuestionNumber}
            targetTurnCount={targetTurnCount}
            currentPhase={currentPhase}
            isInterviewComplete={isInterviewComplete}
            onExtendInterview={handleExtendInterview}
          />
        )}

        {step === "report" && (
          <InterviewReportView
            targetRole={targetRole}
            targetCompany={targetCompany}
            isGeneratingReport={isGeneratingReport}
            report={report}
            dialogueCount={dialogue.length}
            onRetry={handleEndInterview}
            onPracticeAgain={() => {
              setStep("setup")
              setDialogue([])
              setReport(null)
              setIsInterviewComplete(false)
            }}
            onClose={onClose}
          />
        )}

        {showExitConfirm && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in-50 duration-200">
            <div className="w-full max-w-md border border-border bg-card p-5 sm:p-6 rounded-[8px] shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-[4px] bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    Exit Active Interview?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    You are currently in Question {currentQuestionNumber} of {targetTurnCount}. Exiting now will discard your active interview progress and audio transcript.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button variant="outline" size="sm" className="text-xs h-8.5 rounded-[4px] cursor-pointer" onClick={() => setShowExitConfirm(false)}>
                  Continue Interview
                </Button>
                {dialogue.length >= 2 && (
                  <Button variant="secondary" size="sm" className="text-xs h-8.5 gap-1.5 rounded-[4px] cursor-pointer" onClick={() => {
                    setShowExitConfirm(false)
                    handleEndInterview()
                  }}>
                    <Square className="h-3 w-3" />
                    End & View Report
                  </Button>
                )}
                <Button variant="destructive" size="sm" className="text-xs h-8.5 rounded-[4px] cursor-pointer" onClick={() => {
                  setShowExitConfirm(false)
                  stopAll()
                  setDialogue([])
                  setStep("setup")
                  onClose()
                }}>
                  Exit & Discard
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
