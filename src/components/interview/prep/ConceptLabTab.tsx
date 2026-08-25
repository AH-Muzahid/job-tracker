/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Mic,
  Volume2,
  VolumeX,
  BookmarkPlus,
  ArrowRight,
  RotateCcw,
  Bot,
  Search,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      const res = await fetch("/api/ai/prep-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          topic: selectedTopic,
          language: studyLang,
          history: studyHistory.slice(-4),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to query Concept Lab")
      }

      const data = await res.json()
      const assistantMsg: StudyDiscussionMessage = {
        role: "assistant",
        content: data.answer || "No response generated.",
        topic: selectedTopic,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setStudyHistory([...updatedHistory, assistantMsg])
      toast.success("AI concept explanation ready!")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error consulting Concept Lab"
      toast.error(msg)
    } finally {
      setIsAskingStudy(false)
    }
  }

  function handleSpeechRecognition() {
    if (typeof window === "undefined") return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.")
      return
    }

    if (isListeningMic) {
      recognitionRef.current?.stop()
      setIsListeningMic(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = studyLang === "bn" ? "bn-BD" : "en-US"
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsListeningMic(true)
      toast.info("Listening... Speak your interview question")
    }

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("")
      setStudyQuestion(transcript)
    }

    recognition.onerror = () => {
      setIsListeningMic(false)
      toast.error("Microphone capture stopped.")
    }

    recognition.onend = () => {
      setIsListeningMic(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function toggleAudioSynthesis(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return

    if (activeSpeakingText === text) {
      window.speechSynthesis.cancel()
      setActiveSpeakingText(null)
      return
    }

    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[`*#_]/g, "").slice(0, 500)
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.95
    utterance.onend = () => setActiveSpeakingText(null)
    utterance.onerror = () => setActiveSpeakingText(null)

    setActiveSpeakingText(text)
    window.speechSynthesis.speak(utterance)
  }

  const filteredCurated = CURATED_QUESTIONS.filter(
    (q) => selectedTopic === "All Topics" || q.topic === selectedTopic
  )

  return (
    <div className="space-y-6">
      {/* 1. Interactive Ask Tutor Bar in Efferd Container */}
      <div className="border border-border bg-card p-4 sm:p-5 rounded-lg space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground border border-border shrink-0">
              <Bot className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Technical Concept Lab & Q&A
              </h2>
              <p className="text-xs text-muted-foreground">
                Ask architectural questions, debug edge cases, or learn STAR behavioral frameworks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={studyLang} onValueChange={(v: "mixed" | "bn" | "en") => setStudyLang(v)}>
              <SelectTrigger className="h-8 w-32 text-xs border-border bg-background">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Banglish (Default)</SelectItem>
                <SelectItem value="en">Pure English</SelectItem>
                <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
              </SelectContent>
            </Select>

            {studyHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStudyHistory([])}
                className="h-8 text-xs font-mono border-border hover:bg-muted cursor-pointer"
                title="Clear discussion"
              >
                <RotateCcw className="size-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Ask anything... e.g. How does Kafka guarantee exactly-once delivery semantics?"
              value={studyQuestion}
              onChange={(e) => setStudyQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAskStudy()
                }
              }}
              className="pl-9 h-9 text-xs bg-muted/20 border-border focus-visible:ring-1"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSpeechRecognition}
            className={cn(
              "h-9 w-9 shrink-0 cursor-pointer border-border",
              isListeningMic && "bg-destructive/10 text-destructive border-destructive/30 animate-pulse"
            )}
            title="Speak Question"
          >
            <Mic className="size-4" />
          </Button>

          <Button
            onClick={() => handleAskStudy()}
            disabled={isAskingStudy || !studyQuestion.trim()}
            size="sm"
            className="h-9 px-4 text-xs font-medium shrink-0 cursor-pointer shadow-xs"
          >
            <ArrowRight className="size-3.5 mr-1.5" />
            <span>{isAskingStudy ? "Analyzing..." : "Ask Lab"}</span>
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {TOPIC_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedTopic(cat)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer",
                selectedTopic === cat
                  ? "bg-foreground text-background font-semibold"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Active AI Study Discussion History */}
      {studyHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">
              Active Discussion ({studyHistory.length} messages)
            </h3>
          </div>

          <div className="space-y-3">
            {studyHistory.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 sm:p-5 rounded-lg border",
                  msg.role === "user"
                    ? "bg-muted/30 border-border"
                    : "bg-card border-border shadow-2xs"
                )}
              >
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      {msg.role === "user" ? "You" : "Staff AI Mentor"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {msg.timestamp}
                    </span>
                  </div>

                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleAudioSynthesis(msg.content)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Read Aloud"
                      >
                        {activeSpeakingText === msg.content ? (
                          <VolumeX className="size-3.5 text-destructive" />
                        ) : (
                          <Volume2 className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onSaveAsNote(
                            msg.content.slice(0, 40),
                            msg.content,
                            msg.topic || "Technical"
                          )
                        }
                        className="h-7 text-xs px-2.5 border-border cursor-pointer font-mono"
                      >
                        <BookmarkPlus className="size-3 mr-1" />
                        Save Note
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-3 text-xs sm:text-sm text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Curated High-Yield Interview Questions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">High-Yield Technical Questions</h3>
            <p className="text-xs text-muted-foreground">Click any prompt to instantly get an in-depth staff engineer breakdown</p>
          </div>
        </div>

        <div className="relative border border-border bg-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {filteredCurated.map((q, idx) => (
              <div
                key={idx}
                onClick={() => handleAskStudy(q.question)}
                className="bg-background p-4 sm:p-5 flex flex-col justify-between gap-3 cursor-pointer transition-colors hover:bg-muted/10 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-muted border border-border text-foreground">
                      {q.tag}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {q.topic}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
                    {q.question}
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Explore concept</span>
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
