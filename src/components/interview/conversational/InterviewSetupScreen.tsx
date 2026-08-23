"use client"

import React from "react"
import { Globe, Settings2, Play, Volume2 } from "lucide-react"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { InterviewerTone, VoiceGender, InterviewLanguage } from "./types"

interface InterviewSetupScreenProps {
  targetRole: string
  setTargetRole: (val: string) => void
  targetCompany: string
  setTargetCompany: (val: string) => void
  interviewType: string
  setInterviewType: (val: string) => void
  language: InterviewLanguage
  setLanguage: (val: InterviewLanguage) => void
  targetTurnCount: number
  setTargetTurnCount: (val: number) => void
  interviewerTone: InterviewerTone
  setInterviewerTone: (val: InterviewerTone) => void
  voiceGender: VoiceGender
  setVoiceGender: (val: VoiceGender) => void
  speechRate: number
  setSpeechRate: (val: number) => void
  autoTurnActive: boolean
  setAutoTurnActive: (val: boolean) => void
  availableVoices: SpeechSynthesisVoice[]
  selectedVoice: string
  setSelectedVoice: (val: string) => void
  isVoiceMatchingGender: (voice: SpeechSynthesisVoice, gender: VoiceGender) => boolean
  onTestVoice: () => void
  onStartInterview: () => void
  onClose: () => void
}

export function InterviewSetupScreen({
  targetRole,
  setTargetRole,
  targetCompany,
  setTargetCompany,
  interviewType,
  setInterviewType,
  language,
  setLanguage,
  targetTurnCount,
  setTargetTurnCount,
  interviewerTone,
  setInterviewerTone,
  voiceGender,
  setVoiceGender,
  speechRate,
  setSpeechRate,
  autoTurnActive,
  setAutoTurnActive,
  availableVoices,
  selectedVoice,
  setSelectedVoice,
  isVoiceMatchingGender,
  onTestVoice,
  onStartInterview,
  onClose,
}: InterviewSetupScreenProps) {
  const toneOptions: Array<{
    id: InterviewerTone
    title: string
    desc: string
  }> = [
    {
      id: "friendly",
      title: "😊 Friendly & Encouraging",
      desc: "Warm & supportive mentor. Gives positive feedback and builds confidence.",
    },
    {
      id: "strict",
      title: "🧐 Strict FAANG Bar Raiser",
      desc: "Uncompromising standards. Deeply probes edge cases, complexity & trade-offs.",
    },
    {
      id: "startup-cto",
      title: "⚡ Fast-Paced Startup CTO",
      desc: "Pragmatic, crisp, & direct. Focuses on real-world shipping & production reality.",
    },
    {
      id: "architect",
      title: "🏛️ Principal System Architect",
      desc: "High scalability, distributed failure modes, consistency & deep internals.",
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 overflow-y-auto no-scrollbar max-h-[82vh] p-1">
      <DialogHeader className="border-b pb-3 sm:pb-4">
        <DialogTitle className="text-lg sm:text-xl font-bold">
          Configure Your Conversational Mock Interview
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Natural back-and-forth verbal interview with intelligent follow-ups, hands-free turn taking, and bilingual support.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1 sm:space-y-1.5">
          <Label className="text-xs font-medium">Target Role</Label>
          <Input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            className="text-xs h-8 sm:h-9"
          />
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          <Label className="text-xs font-medium">Target Company</Label>
          <Input
            value={targetCompany}
            onChange={(e) => setTargetCompany(e.target.value)}
            placeholder="e.g. Google, Stripe, Local Startup"
            className="text-xs h-8 sm:h-9"
          />
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          <Label className="text-xs font-medium">Interview Focus Round</Label>
          <Select value={interviewType} onValueChange={setInterviewType}>
            <SelectTrigger className="text-xs h-8 sm:h-9">
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

        <div className="space-y-1 sm:space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-indigo-500" />
            <span>Interview Language</span>
          </Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as InterviewLanguage)}>
            <SelectTrigger className="text-xs h-8 sm:h-9">
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

      {/* Round Duration & Question Progression */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-medium">Interview Round Structure & Length</Label>
          <span className="text-[10px] text-muted-foreground">{targetTurnCount} structured questions</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { count: 4, label: "⚡ Express", time: "~4 mins" },
            { count: 5, label: "🎯 Standard", time: "~6 mins (Recommended)" },
            { count: 7, label: "🏆 In-Depth", time: "~10 mins" },
          ].map((item) => (
            <button
              key={item.count}
              type="button"
              onClick={() => setTargetTurnCount(item.count)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer",
                targetTurnCount === item.count
                  ? "border-indigo-600 bg-indigo-500/10 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/50"
                  : "border-border hover:border-muted-foreground/30 bg-muted/10"
              )}
            >
              <span className="text-xs font-bold text-foreground">{item.label}</span>
              <span className="text-[10px] text-muted-foreground">{item.count} Questions • {item.time}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Interviewer Persona & Tone Selection */}
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center justify-between">
          <span>Interviewer Persona & Tone</span>
          <span className="text-[10px] text-muted-foreground">Select how the interviewer behaves</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {toneOptions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setInterviewerTone(t.id)}
              className={cn(
                "flex flex-col text-left p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer",
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
      <div className="rounded-xl border bg-muted/20 p-3 sm:p-4 space-y-3">
        <h4 className="text-xs font-semibold flex items-center justify-between text-foreground">
          <span className="flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Interviewer Voice & Speech Tuning</span>
          </span>
          <span className="text-[10px] font-normal text-muted-foreground">Lifelike Non-Robotic Speech</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                <span>👩 Female Voice</span>
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
                <span>👨 Male Voice</span>
              </Button>
            </div>
          </div>

          {/* Specific Voice Engine Selection & Demo */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Speech Audio Engine</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onTestVoice}
                className="h-5 px-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Volume2 className="h-3 w-3 mr-1" />
                Test Voice
              </Button>
            </div>
            {language === "bn" || language === "mixed" ? (
              <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 rounded-md p-1.5 bg-indigo-500/10 flex items-center justify-between">
                <span>⚡ High-Fidelity Bangla Audio Engine</span>
                <Badge variant="secondary" className="text-[9px] h-4 bg-indigo-600 text-white">Active</Badge>
              </div>
            ) : availableVoices.length > 0 ? (
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Auto-select best voice" />
                </SelectTrigger>
                <SelectContent>
                  {availableVoices
                    .filter((v) => v.lang.toLowerCase().startsWith("en") && isVoiceMatchingGender(v, voiceGender))
                    .map((v, i) => {
                      const cleanName = v.name
                        .replace(/Microsoft /g, "")
                        .replace(/ Desktop/g, "")
                        .replace(/ English \([^)]+\)/g, "")
                      return (
                        <SelectItem key={i} value={v.name} className="text-xs">
                          {cleanName} ({v.lang})
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-[11px] text-muted-foreground italic border rounded-md p-1.5 bg-background">
                Using standard natural speech engine
              </div>
            )}
          </div>
        </div>

        {/* Cadence */}
        <div className="space-y-1.5 pt-1 border-t">
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
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-1"
          />
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
          onClick={onStartInterview}
          className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5"
        >
          <Play className="h-4 w-4" /> Start Interview Room
        </Button>
      </div>
    </div>
  )
}
