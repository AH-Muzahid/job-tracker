"use client"

import React from "react"
import { Volume2, Check } from "lucide-react"
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
      title: "Friendly & Encouraging",
      desc: "Warm & supportive mentor. Gives positive feedback and builds confidence.",
    },
    {
      id: "strict",
      title: "Strict Bar Raiser",
      desc: "Uncompromising standards. Deeply probes edge cases, complexity & trade-offs.",
    },
    {
      id: "startup-cto",
      title: "Startup Technical Lead",
      desc: "Pragmatic, crisp, & direct. Focuses on real-world shipping & production reality.",
    },
    {
      id: "architect",
      title: "Principal Systems Architect",
      desc: "High scalability, distributed failure modes, consistency & deep internals.",
    },
  ]

  return (
    <div className="space-y-4 sm:space-y-5 overflow-y-auto no-scrollbar max-h-[82vh] p-1">
      <DialogHeader className="border-b pb-3 sm:pb-4">
        <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
          Configure Conversational Mock Interview
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Natural spoken mock interview with follow-up probing, hands-free turn taking, and structured debrief.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1 sm:space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Target Role</Label>
          <Input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            className="text-xs h-8 sm:h-9 bg-background"
          />
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Target Company</Label>
          <Input
            value={targetCompany}
            onChange={(e) => setTargetCompany(e.target.value)}
            placeholder="e.g. Google, Stripe, Startup"
            className="text-xs h-8 sm:h-9 bg-background"
          />
        </div>

        <div className="space-y-1 sm:space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Interview Focus Round</Label>
          <Select value={interviewType} onValueChange={setInterviewType}>
            <SelectTrigger className="text-xs h-8 sm:h-9 bg-background">
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
          <Label className="text-xs font-medium text-foreground">Interview Language</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as InterviewLanguage)}>
            <SelectTrigger className="text-xs h-8 sm:h-9 bg-background">
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
          <Label className="text-xs font-medium text-foreground">Round Structure & Length</Label>
          <span className="text-[10px] font-mono text-muted-foreground">{targetTurnCount} structured questions</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { count: 4, label: "Express", time: "4 Questions (~4 mins)" },
            { count: 5, label: "Standard", time: "5 Questions (Recommended)" },
            { count: 7, label: "In-Depth", time: "7 Questions (~10 mins)" },
          ].map((item) => {
            const isSelected = targetTurnCount === item.count
            return (
              <button
                key={item.count}
                type="button"
                onClick={() => setTargetTurnCount(item.count)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary/15 ring-2 ring-primary text-foreground shadow-xs"
                    : "border-border hover:border-border/80 bg-card/60 text-muted-foreground hover:bg-muted/30"
                )}
              >
                {/* Active Indicator Badge */}
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className={cn(
                      "size-4 rounded-full flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground/30 bg-background"
                    )}
                  >
                    {isSelected && <Check className="size-2.5 stroke-[3]" />}
                  </div>
                  <span className={cn("text-xs font-semibold", isSelected ? "text-foreground" : "text-foreground/80")}>
                    {item.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{item.time}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Interviewer Persona & Tone Selection */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-medium text-foreground">Interviewer Persona & Tone</Label>
          <span className="text-[10px] text-muted-foreground">Select interviewer behavior</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
          {toneOptions.map((t) => {
            const isSelected = interviewerTone === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setInterviewerTone(t.id)}
                className={cn(
                  "flex flex-col text-left p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary/15 ring-2 ring-primary text-foreground shadow-xs"
                    : "border-border hover:border-border/80 bg-card/60 text-muted-foreground hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className={cn("text-xs font-semibold", isSelected ? "text-foreground" : "text-foreground/90")}>
                    {t.title}
                  </span>
                  <div
                    className={cn(
                      "size-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground/30 bg-background"
                    )}
                  >
                    {isSelected && <Check className="size-2.5 stroke-[3]" />}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">{t.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Voice Profile & Cadence Tuning */}
      <div className="rounded-xl border border-border bg-card/80 p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Interviewer Voice & Speech Tuning</span>
          <span className="text-[10px] text-muted-foreground">Natural Voice Synthesis</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Male / Female Voice Selector */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Voice Profile</span>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <Button
                type="button"
                variant={voiceGender === "female" ? "default" : "outline"}
                size="sm"
                onClick={() => setVoiceGender("female")}
                className="text-xs h-8.5 justify-center font-medium cursor-pointer"
              >
                {voiceGender === "female" && <Check className="size-3 mr-1" />}
                Female Voice
              </Button>
              <Button
                type="button"
                variant={voiceGender === "male" ? "default" : "outline"}
                size="sm"
                onClick={() => setVoiceGender("male")}
                className="text-xs h-8.5 justify-center font-medium cursor-pointer"
              >
                {voiceGender === "male" && <Check className="size-3 mr-1" />}
                Male Voice
              </Button>
            </div>
          </div>

          {/* Specific Voice Engine Selection & Demo */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Speech Engine</span>
              <button
                type="button"
                onClick={onTestVoice}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <Volume2 className="size-3" /> Test Voice
              </button>
            </div>
            {language === "bn" || language === "mixed" ? (
              <div className="text-[11px] font-medium text-foreground border border-border rounded-md p-2 bg-muted/40 flex items-center justify-between">
                <span>Bengali Voice Engine</span>
                <Badge variant="outline" className="text-[10px] h-4 font-normal bg-background">Active</Badge>
              </div>
            ) : availableVoices.length > 0 ? (
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="text-xs h-8.5 bg-background">
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
              <div className="text-[11px] text-muted-foreground border rounded-md p-2 bg-background">
                Standard Natural Speech Engine
              </div>
            )}
          </div>
        </div>

        {/* Cadence */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Speaking Cadence</span>
            <span className="font-medium text-foreground">{speechRate}x (Natural Pace)</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.1"
            step="0.05"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary mt-1"
          />
        </div>

        {/* Hands-Free VAD Toggle */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground">Hands-Free Turn Taking (VAD)</p>
            <p className="text-[10px] text-muted-foreground">Automatically sends your answer after 2.2s of silence</p>
          </div>
          <Button
            type="button"
            variant={autoTurnActive ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoTurnActive(!autoTurnActive)}
            className="text-xs h-7 px-3 font-medium cursor-pointer"
          >
            {autoTurnActive && <Check className="size-3 mr-1" />}
            {autoTurnActive ? "Enabled" : "Manual Click"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-medium cursor-pointer">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onStartInterview}
          className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-5 cursor-pointer shadow-xs"
        >
          Start Interview
        </Button>
      </div>
    </div>
  )
}
