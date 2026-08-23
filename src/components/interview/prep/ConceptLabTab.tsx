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
  Layers,
  MessageSquare,
  Globe,
  Code2,
  Cpu,
  Database,
  Zap,
  UserCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

const TOPIC_CHIPS = [
  { id: "All Topics", label: "All Topics", icon: Globe, color: "text-indigo-500" },
  { id: "React & Next.js", label: "React & Next.js", icon: Code2, color: "text-cyan-500" },
  { id: "System Design", label: "System Design", icon: Cpu, color: "text-amber-500" },
  { id: "Database & SQL", label: "Database & SQL", icon: Database, color: "text-emerald-500" },
  { id: "Node.js & Backend", label: "Node.js & Backend", icon: Zap, color: "text-purple-500" },
  { id: "STAR Behavioral", label: "STAR Behavioral", icon: UserCheck, color: "text-rose-500" },
]

const CURATED_QUESTIONS = [
  {
    topic: "React & Next.js",
    tag: "React 19 & Next.js",
    question: "Explain how React 19 Actions and useOptimistic handle optimistic UI updates and race conditions.",
  },
  {
    topic: "System Design",
    tag: "Rate Limiting",
    question: "How do you design a distributed rate limiter using Redis Token Bucket & sliding window counter?",
  },
  {
    topic: "Database & SQL",
    tag: "Postgres MVCC",
    question: "How does PostgreSQL MVCC work, and when should you choose a GIN index over a standard B-Tree index?",
  },
  {
    topic: "Node.js & Backend",
    tag: "Event Loop & Libuv",
    question: "Explain how the Node.js Event Loop microtask queue (Promises) interacts with the libuv thread pool.",
  },
  {
    topic: "System Design",
    tag: "High Concurrency",
    question: "What strategies prevent Cache Stampede (Dog-piling effect) when multiple nodes read cold caches concurrently?",
  },
  {
    topic: "STAR Behavioral",
    tag: "STAR Incident Story",
    question: "How to structure a STAR answer for 'Tell me about a time you handled a critical production incident under pressure'?",
  },
]

interface ConceptLabTabProps {
  onSaveAsNote: (title: string, content: string, category: string) => Promise<void>
}

export function ConceptLabTab({ onSaveAsNote }: ConceptLabTabProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>("All Topics")
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
      topic: selectedTopic === "All Topics" ? "General Tech" : selectedTopic,
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
          topic: selectedTopic === "All Topics" ? "General Software Engineering" : selectedTopic,
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

  const filteredQuestions =
    selectedTopic === "All Topics"
      ? CURATED_QUESTIONS
      : CURATED_QUESTIONS.filter((s) => s.topic === selectedTopic)

  return (
    <div className="space-y-6">
      {/* Topic Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>Filter by Engineering Domain</span>
          </span>
          <span className="text-[10px] text-muted-foreground">Select a category to explore high-yield topics</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {TOPIC_CHIPS.map((chip) => {
            const IconComponent = chip.icon
            const isActive = selectedTopic === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedTopic(chip.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border cursor-pointer",
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-card hover:bg-muted/50 text-muted-foreground border-border"
                )}
              >
                <IconComponent className={cn("h-3.5 w-3.5", isActive ? "text-white" : chip.color)} />
                <span>{chip.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Modern Floating Question Bar */}
      <div className="rounded-3xl border bg-card p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground">Ask Any Tech Concept or Interview Question</span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] text-muted-foreground hidden sm:inline">Answer in:</span>
            <Select value={studyLang} onValueChange={(v: any) => setStudyLang(v)}>
              <SelectTrigger className="text-[10.5px] h-6 px-2 rounded-lg w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Banglish</SelectItem>
                <SelectItem value="bn">বাংলা</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={studyQuestion}
            onChange={(e) => setStudyQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAskStudy()
              }
            }}
            placeholder="e.g. How does Redis cluster handle data partitioning and failover? / বাংলাতেও লিখুন..."
            className="text-xs sm:text-sm h-10 rounded-2xl bg-muted/20 border-border/60"
          />
          <Button
            type="button"
            variant={isListeningMic ? "default" : "outline"}
            size="icon"
            onClick={toggleVoiceInput}
            title={isListeningMic ? "Listening... Click to stop" : "Speak question"}
            className={cn(
              "h-10 w-10 shrink-0 rounded-2xl transition-all",
              isListeningMic && "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
            )}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={() => handleAskStudy()}
            disabled={!studyQuestion.trim() || isAskingStudy}
            className="h-10 px-4 shrink-0 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ask Coach</span>
          </Button>
        </div>
      </div>

      {/* Curated Discussion Starters */}
      {studyHistory.length === 0 && (
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>High-Yield Concept Starters ({filteredQuestions.length})</span>
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQuestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setStudyQuestion(item.question)
                  handleAskStudy(item.question)
                }}
                className="flex flex-col justify-between text-left p-3.5 rounded-2xl border bg-card hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group cursor-pointer shadow-2xs gap-2 min-h-[95px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-[9.5px] font-bold bg-indigo-500/10 text-indigo-500">
                    {item.tag}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs font-medium text-foreground leading-relaxed line-clamp-2">
                  {item.question}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Q&A Discussion Thread */}
      {studyHistory.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
              <span>Discussion Stream ({studyHistory.length} turns)</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStudyHistory([])}
              className="text-[11px] h-7 text-muted-foreground hover:text-foreground"
            >
              Clear Thread
            </Button>
          </div>

          <div className="space-y-3">
            {studyHistory.map((item, idx) => (
              <Card
                key={idx}
                className={cn(
                  "rounded-3xl border transition-all",
                  item.role === "user"
                    ? "bg-muted/30 border-muted"
                    : "bg-card border-indigo-500/20 shadow-xs"
                )}
              >
                <CardHeader className="py-2.5 px-4 sm:px-6 border-b flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-bold rounded-md",
                        item.role === "user" ? "bg-muted text-foreground" : "bg-indigo-500/10 text-indigo-500"
                      )}
                    >
                      {item.role === "user" ? "You Asked" : "AI Tech Coach"}
                    </Badge>
                    {item.topic && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        • {item.topic}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                    {item.role === "assistant" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleReadAloud(item.content)}
                          title="Listen to explanation"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
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
                          className="h-6 px-2 text-[10px] gap-1 rounded-lg font-medium"
                        >
                          <BookmarkPlus className="h-3 w-3" />
                          <span>Save Note</span>
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                  {item.content}
                </CardContent>
              </Card>
            ))}

            {isAskingStudy && (
              <Card className="rounded-3xl border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-spin" />
                <p className="text-xs font-semibold text-foreground">
                  AI Coach is synthesizing architectural mental model & interview tips...
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
