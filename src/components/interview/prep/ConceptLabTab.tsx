/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Mic,
  Send,
  Volume2,
  VolumeX,
  BookmarkPlus,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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

const TOPIC_CATEGORIES = [
  "All Topics",
  "React & Next.js",
  "System Design",
  "Database & SQL",
  "Node.js & Backend",
  "STAR Behavioral",
]

const CURATED_QUESTIONS = [
  {
    topic: "React & Next.js",
    tag: "React 19",
    question: "How do React 19 Actions and useOptimistic handle optimistic UI updates and race conditions?",
  },
  {
    topic: "System Design",
    tag: "Rate Limiting",
    question: "How do you design a distributed rate limiter using Redis Token Bucket & sliding window counter?",
  },
  {
    topic: "Database & SQL",
    tag: "PostgreSQL",
    question: "How does PostgreSQL MVCC work, and when should you choose a GIN index over a standard B-Tree index?",
  },
  {
    topic: "Node.js & Backend",
    tag: "Event Loop",
    question: "Explain how the Node.js Event Loop microtask queue (Promises) interacts with the libuv thread pool.",
  },
  {
    topic: "System Design",
    tag: "Caching",
    question: "What architectural patterns prevent Cache Stampede (Dog-piling effect) in high-throughput services?",
  },
  {
    topic: "STAR Behavioral",
    tag: "STAR Method",
    question: "How to structure a STAR response for: 'Tell me about a time you resolved a major production outage under pressure'?",
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
      const assistantMsg: StudyDiscussionMessage = {
        role: "assistant",
        content: data.explanation || "No explanation provided.",
        topic: selectedTopic,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedNextQuestions: data.suggestedNextQuestions || [],
      }

      setStudyHistory((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      toast.error(err.message || "Failed to ask AI Tutor.")
      const errorMsg: StudyDiscussionMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error answering your question. Please try again.",
        topic: "Error",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setStudyHistory((prev) => [...prev, errorMsg])
    } finally {
      setIsAskingStudy(false)
    }
  }

  function handleMicToggle() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.")
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
      {/* 1. Unified Search & Ask Zone (Raycast / Perplexity style) */}
      <Card className="border border-border bg-card shadow-2xs">
        <CardContent className="p-3 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ask Concept or System Design Question</h3>
              <p className="text-xs text-muted-foreground">
                Get hiring-grade architectural explanations, trade-offs, and mental models.
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-[11px] text-muted-foreground">Language:</span>
              <Select value={studyLang} onValueChange={(v: any) => setStudyLang(v)}>
                <SelectTrigger className="w-28 h-7 text-xs bg-background">
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

          {/* Unified Input Box */}
          <div className="flex gap-1.5 items-center">
            <Input
              value={studyQuestion}
              onChange={(e) => setStudyQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAskStudy()
                }
              }}
              placeholder="e.g. How does Redis cluster handle failover? / বাংলায় লিখুন..."
              className="h-10 text-xs sm:text-sm bg-background flex-1"
            />
            <Button
              type="button"
              variant={isListeningMic ? "default" : "outline"}
              size="icon"
              onClick={handleMicToggle}
              className={cn("h-10 w-10 shrink-0 cursor-pointer", isListeningMic && "bg-red-500 hover:bg-red-600 text-white")}
              title="Voice Input"
            >
              <Mic className={cn("h-4 w-4", isListeningMic && "animate-pulse")} />
            </Button>
            <Button
              onClick={() => handleAskStudy()}
              disabled={!studyQuestion.trim() || isAskingStudy}
              className="h-10 px-4 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer"
            >
              {isAskingStudy ? "Thinking..." : "Ask"}
            </Button>
          </div>

          {/* Topic Filter Chips */}
          <div className="pt-2 border-t border-border flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-muted-foreground shrink-0 mr-1">Filter:</span>
            {TOPIC_CATEGORIES.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer",
                  selectedTopic === topic
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Interactive Study Discussion Thread */}
      {studyHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Discussion Thread ({studyHistory.length} messages)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStudyHistory([])}
              className="text-xs text-muted-foreground hover:text-foreground h-7"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Clear Chat
            </Button>
          </div>

          <div className="space-y-3">
            {studyHistory.map((msg, idx) => (
              <Card
                key={idx}
                className={cn(
                  "border border-border p-4 transition-all",
                  msg.role === "user" ? "bg-muted/40" : "bg-card shadow-2xs"
                )}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {msg.role === "user" ? "Your Question" : "Staff Tutor Explanation"}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-normal bg-muted/40 text-foreground">
                      {msg.topic}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                </div>

                <div className="text-xs sm:text-sm leading-relaxed space-y-2 text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {msg.role === "assistant" && (
                  <div className="pt-3 mt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onSaveAsNote(
                            studyHistory[idx - 1]?.content || "Tech Concept Note",
                            msg.content,
                            msg.topic || "General"
                          )
                        }
                        className="text-xs h-7 px-2.5 font-medium cursor-pointer"
                      >
                        <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                        <span>Save Note</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleReadAloud(msg.content)}
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {activeSpeakingText === msg.content ? (
                          <>
                            <VolumeX className="h-3.5 w-3.5 mr-1" /> Stop Voice
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3.5 w-3.5 mr-1" /> Read Aloud
                          </>
                        )}
                      </Button>
                    </div>

                    {msg.suggestedNextQuestions && msg.suggestedNextQuestions.length > 0 && (
                      <div className="w-full pt-2 space-y-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Follow-up Deep Dives:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedNextQuestions.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              type="button"
                              onClick={() => handleAskStudy(q)}
                              className="text-[11px] text-left px-2.5 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors cursor-pointer"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. Recommended Topic Starters List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Curated Questions ({filteredQuestions.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredQuestions.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleAskStudy(item.question)}
              className="p-3 rounded-xl border border-border bg-card shadow-2xs hover:border-border/80 transition-all cursor-pointer flex flex-col justify-between gap-2"
            >
              <div className="space-y-1">
                <Badge variant="outline" className="text-[10px] font-normal bg-muted/50 text-foreground">
                  {item.tag}
                </Badge>
                <p className="text-xs font-medium text-foreground leading-snug">
                  {item.question}
                </p>
              </div>
              <div className="flex justify-end items-center text-[10.5px] text-muted-foreground hover:text-foreground">
                <span className="mr-1">Ask AI</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
