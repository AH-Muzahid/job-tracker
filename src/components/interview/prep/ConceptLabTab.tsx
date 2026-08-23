/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useRef, useState } from "react"
import {
  Sparkles,
  Mic,
  Send,
  Volume2,
  VolumeX,
  BookmarkPlus,
  ArrowRight,
  MessageSquare,
  Globe,
  Code2,
  Cpu,
  Database,
  Zap,
  UserCheck,
  RotateCcw,
  Lightbulb,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { StudyDiscussionMessage } from "./types"

const TOPIC_OPTIONS = [
  { id: "General Tech", label: "General Tech", icon: Globe, color: "text-indigo-500" },
  { id: "React & Next.js", label: "React & Next.js", icon: Code2, color: "text-cyan-500" },
  { id: "System Design", label: "System Design", icon: Cpu, color: "text-amber-500" },
  { id: "Database & SQL", label: "Database & SQL", icon: Database, color: "text-emerald-500" },
  { id: "Node.js & Backend", label: "Node.js & Backend", icon: Zap, color: "text-purple-500" },
  { id: "STAR Behavioral", label: "STAR Behavioral", icon: UserCheck, color: "text-rose-500" },
]

const CURATED_QUESTIONS = [
  {
    topic: "React & Next.js",
    category: "Frontend Internals",
    tag: "React 19 & Next.js",
    question: "How do React 19 Actions and useOptimistic handle optimistic UI updates and race conditions?",
  },
  {
    topic: "System Design",
    category: "Distributed Architecture",
    tag: "Rate Limiting",
    question: "Design a distributed rate limiter using Redis Token Bucket & sliding window counter for 100k RPS.",
  },
  {
    topic: "Database & SQL",
    category: "Database Engine",
    tag: "Postgres MVCC",
    question: "How does PostgreSQL MVCC work, and when should you pick a GIN index over a standard B-Tree index?",
  },
  {
    topic: "Node.js & Backend",
    category: "Runtime & Concurrency",
    tag: "Event Loop & Libuv",
    question: "How does the Node.js Event Loop microtask queue (Promises) interact with the libuv thread pool?",
  },
  {
    topic: "System Design",
    category: "Caching & Resilience",
    tag: "High Concurrency",
    question: "What architectural patterns prevent Cache Stampede (Dog-piling effect) in high-throughput services?",
  },
  {
    topic: "STAR Behavioral",
    category: "Leadership & STAR",
    tag: "Incident Resolution",
    question: "How to structure a STAR response for: 'Tell me about a time you resolved a major production outage under pressure'?",
  },
]

interface ConceptLabTabProps {
  onSaveAsNote: (title: string, content: string, category: string) => Promise<void>
}

export function ConceptLabTab({ onSaveAsNote }: ConceptLabTabProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>("General Tech")
  const [studyQuestion, setStudyQuestion] = useState("")
  const [isAskingStudy, setIsAskingStudy] = useState(false)
  const [studyHistory, setStudyHistory] = useState<StudyDiscussionMessage[]>([])
  const [activeSpeakingText, setActiveSpeakingText] = useState<string | null>(null)
  const [studyLang, setStudyLang] = useState<"mixed" | "bn" | "en">("mixed")
  const [isListeningMic, setIsListeningMic] = useState(false)

  const recognitionRef = useRef<any>(null)

  async function handleAskStudy(customPrompt?: string) {
    const query = (customPrompt || studyQuestion).trim()
    if (!query || isAskingStudy) return

    setIsAskingStudy(true)
    const userMsg: StudyDiscussionMessage = {
      role: "user",
      content: query,
      topic: selectedTopic,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const updatedHistory = [...studyHistory, userMsg]
    setStudyHistory(updatedHistory)
    setStudyQuestion("")

    try {
      const res = await fetch("/api/ai/study-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          question: query,
          language: studyLang,
          conversationHistory: updatedHistory.map((h) => ({ role: h.role, content: h.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to get explanation from AI tutor.")
      }

      const data = await res.json()
      const aiMsg: StudyDiscussionMessage = {
        role: "assistant",
        content: data.answer,
        topic: selectedTopic,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setStudyHistory([...updatedHistory, aiMsg])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error querying study assistant."
      toast.error(msg)
    } finally {
      setIsAskingStudy(false)
    }
  }

  function toggleVoiceInput() {
    if (typeof window === "undefined") return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.info("Microphone recognition not supported in this browser.")
      return
    }

    if (isListeningMic) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
      setIsListeningMic(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = studyLang === "en" ? "en-US" : "bn-BD"

    recognition.onstart = () => setIsListeningMic(true)
    recognition.onresult = (e: any) => {
      let text = ""
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript + " "
      }
      setStudyQuestion(text.trim())
    }
    recognition.onend = () => setIsListeningMic(false)
    recognition.onerror = () => setIsListeningMic(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  function toggleReadAloud(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return

    if (activeSpeakingText === text) {
      window.speechSynthesis.cancel()
      setActiveSpeakingText(null)
      return
    }

    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[`*#_]/g, "").slice(0, 600)
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.95
    utterance.onend = () => setActiveSpeakingText(null)
    utterance.onerror = () => setActiveSpeakingText(null)

    setActiveSpeakingText(text)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Unified Prompt Studio Box */}
      <div className="rounded-2xl border bg-card shadow-xs transition-all focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 overflow-hidden">
        <Textarea
          value={studyQuestion}
          onChange={(e) => setStudyQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleAskStudy()
            }
          }}
          placeholder="Ask any technical concept, trade-off, or interview question... (e.g. How does Redis clustering work? / বাংলায় বা বাংলিশেও লিখুন)"
          rows={2}
          className="border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm p-3.5 sm:p-4 resize-none bg-transparent leading-relaxed"
        />

        {/* Toolbar Footer inside Card */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-muted/20 border-t">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Topic Selector */}
            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
              <SelectTrigger className="h-7 text-[11px] font-medium bg-background border-border/80 rounded-lg px-2 gap-1.5 w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOPIC_OPTIONS.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Language Selector */}
            <div className="flex items-center rounded-lg border bg-background p-0.5 text-[10px]">
              {(["mixed", "bn", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setStudyLang(lang)}
                  className={cn(
                    "px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer",
                    studyLang === lang
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {lang === "mixed" ? "Banglish" : lang === "bn" ? "বাংলা" : "English"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={isListeningMic ? "default" : "ghost"}
              size="sm"
              onClick={toggleVoiceInput}
              title={isListeningMic ? "Listening... Click to stop" : "Speak question"}
              className={cn(
                "h-7 px-2 text-xs rounded-lg gap-1",
                isListeningMic && "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              <span className="text-[11px] hidden sm:inline">{isListeningMic ? "Listening..." : "Voice"}</span>
            </Button>

            <Button
              type="button"
              onClick={() => handleAskStudy()}
              disabled={!studyQuestion.trim() || isAskingStudy}
              size="sm"
              className="h-7 px-3 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-1 shadow-2xs cursor-pointer"
            >
              <Send className="h-3 w-3" />
              <span>Ask Coach</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Curated Discussion Starters (when chat is clean) */}
      {studyHistory.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span>High-Yield Interview Concept Starters</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CURATED_QUESTIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedTopic(item.topic)
                  setStudyQuestion(item.question)
                  handleAskStudy(item.question)
                }}
                className="flex flex-col justify-between text-left p-3.5 rounded-2xl border bg-card hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group cursor-pointer shadow-2xs gap-2 min-h-[105px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                    {item.tag}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs font-medium text-foreground leading-relaxed">
                  {item.question}
                </p>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Active Q&A Discussion Thread */}
      {studyHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
              <span>Concept Discussion Thread ({studyHistory.length} turns)</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStudyHistory([])}
              className="text-[11px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>New Topic</span>
            </Button>
          </div>

          <div className="space-y-3.5">
            {studyHistory.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl p-4 sm:p-5 transition-all border",
                  item.role === "user"
                    ? "bg-muted/30 border-border/70 ml-4 sm:ml-12"
                    : "bg-card border-indigo-500/20 shadow-xs mr-4 sm:mr-12"
                )}
              >
                {/* Header info */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10.5px] font-bold px-2 py-0.5 rounded-md",
                      item.role === "user"
                        ? "bg-muted text-foreground"
                        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    )}>
                      {item.role === "user" ? "You Asked" : "AI Tech Coach"}
                    </span>
                    {item.topic && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        • {item.topic}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                    {item.role === "assistant" && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleReadAloud(item.content)}
                          title="Listen to answer"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {activeSpeakingText === item.content ? (
                            <VolumeX className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onSaveAsNote(
                              studyHistory[idx - 1]?.content || "Tech Concept",
                              item.content,
                              item.topic || "General"
                            )
                          }
                          className="h-6 px-2 text-[10.5px] gap-1 rounded-md font-medium cursor-pointer"
                        >
                          <BookmarkPlus className="h-3 w-3" />
                          <span>Save Note</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                  {item.content}
                </div>
              </div>
            ))}

            {isAskingStudy && (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex items-center gap-3 animate-pulse">
                <Sparkles className="h-4 w-4 text-indigo-500 animate-spin" />
                <p className="text-xs font-semibold text-foreground">
                  AI Coach is preparing a structured mental model & interview delivery tips...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
