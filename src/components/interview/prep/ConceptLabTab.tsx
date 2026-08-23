/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useRef, useState } from "react"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
      {/* 1. Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {TOPIC_CATEGORIES.map((topic) => (
          <Button
            key={topic}
            variant={selectedTopic === topic ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTopic(topic)}
            className="rounded-full text-xs h-8 px-3.5 font-medium"
          >
            {topic}
          </Button>
        ))}
      </div>

      {/* 2. Standard shadcn Card for Asking Questions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Ask Technical Concepts & Interview Questions</CardTitle>
              <CardDescription className="text-xs">
                Get hiring-grade architectural explanations, trade-offs, and mental models.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Language:</span>
              <Select value={studyLang} onValueChange={(v: any) => setStudyLang(v)}>
                <SelectTrigger className="w-28 h-8 text-xs">
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
        </CardHeader>
        <CardContent>
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
              placeholder="e.g. How does Redis cluster handle failover? / বাংলায় লিখুন..."
              className="h-10 text-sm"
            />
            <Button
              type="button"
              variant={isListeningMic ? "default" : "outline"}
              size="icon"
              onClick={toggleVoiceInput}
              title={isListeningMic ? "Listening... Click to stop" : "Speak question"}
              className={cn("h-10 w-10 shrink-0", isListeningMic && "bg-destructive text-destructive-foreground animate-pulse")}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => handleAskStudy()}
              disabled={!studyQuestion.trim() || isAskingStudy}
              className="h-10 px-4 shrink-0 gap-2"
            >
              <Send className="h-4 w-4" />
              <span>Ask</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Curated Question Cards (when thread is empty) */}
      {studyHistory.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Recommended Topics & Starters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQuestions.map((item, idx) => (
              <Card
                key={idx}
                onClick={() => {
                  setStudyQuestion(item.question)
                  handleAskStudy(item.question)
                }}
                className="cursor-pointer hover:border-primary/50 transition-colors"
              >
                <CardHeader className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {item.tag}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xs font-medium leading-relaxed">
                    {item.question}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 4. Active Q&A Discussion Thread */}
      {studyHistory.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-semibold">Discussion History ({studyHistory.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStudyHistory([])}
              className="text-xs h-7 gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear History</span>
            </Button>
          </div>

          <div className="space-y-4">
            {studyHistory.map((item, idx) => (
              <Card
                key={idx}
                className={cn(
                  item.role === "user" ? "bg-muted/40 border-muted" : "border-border"
                )}
              >
                <CardHeader className="py-3 px-4 sm:px-6 border-b flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.role === "user" ? "outline" : "default"}>
                      {item.role === "user" ? "You" : "AI Coach"}
                    </Badge>
                    {item.topic && (
                      <span className="text-xs text-muted-foreground">
                        • {item.topic}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                    {item.role === "assistant" && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleReadAloud(item.content)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          {activeSpeakingText === item.content ? (
                            <VolumeX className="h-3.5 w-3.5 text-destructive" />
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
                          className="h-7 text-xs gap-1"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          <span>Save Note</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 text-sm leading-relaxed whitespace-pre-wrap">
                  {item.content}
                </CardContent>
              </Card>
            ))}

            {isAskingStudy && (
              <Card className="p-4 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Generating structured explanation...</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
