/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Brain,
  FileText,
  Sparkles,
  Mic,
  History,
  Award,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Building2,
  Languages,
  Send,
  Volume2,
  VolumeX,
  BookmarkPlus,
  ArrowRight,
  BookOpen,
  Search,
  Check,
  Layers,
  MessageSquare,
  HelpCircle,
  Lightbulb,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConversationalVoiceInterviewModal } from "@/components/interview/ConversationalVoiceInterviewModal"
import { cn } from "@/lib/utils"

interface PrepNote {
  id: string
  title: string
  content: string
  category: string
  application?: { id: string; companyName: string; jobTitle: string } | null
  createdAt: string
}

interface InterviewSessionItem {
  id: string
  targetRole: string
  targetCompany: string
  interviewType: string
  language: string
  score: number | null
  verdict: string | null
  dialogue: Array<{ role: string; text: string; timestamp?: string }>
  report: {
    overallScore?: number
    technicalScore?: number
    clarityScore?: number
    verdict?: string
    executiveSummary?: string
    strengths?: string[]
    improvementAreas?: string[]
    starBreakdown?: {
      situation?: string
      task?: string
      action?: string
      result?: string
    }
  } | null
  createdAt: string
}

interface StudyDiscussionMessage {
  role: "user" | "assistant"
  content: string
  topic?: string
  timestamp: string
}

const STUDY_TOPICS = [
  "All Topics",
  "React & Next.js Internals",
  "System Design & Scaling",
  "Node.js & Backend Concurrency",
  "PostgreSQL & Database Tuning",
  "JavaScript / TypeScript Core",
  "STAR Behavioral Mastery",
]

const DISCUSSION_STARTERS = [
  {
    topic: "React & Next.js Internals",
    question: "Explain how React 19 Actions and useOptimistic handle race conditions and UI rollback.",
    tag: "React 19",
  },
  {
    topic: "System Design & Scaling",
    question: "How do you design a distributed rate limiter using Redis Token Bucket and Sliding Window algorithm?",
    tag: "Rate Limiting",
  },
  {
    topic: "PostgreSQL & Database Tuning",
    question: "What is PostgreSQL MVCC, and when should I choose a GIN index over a standard B-Tree index?",
    tag: "Database",
  },
  {
    topic: "Node.js & Backend Concurrency",
    question: "Explain how the Node.js Event Loop microtask queue (Promises) interacts with the libuv thread pool.",
    tag: "Event Loop",
  },
  {
    topic: "STAR Behavioral Mastery",
    question: "How do I structure a STAR response for 'Tell me about a time you handled a critical production outage under pressure'?",
    tag: "STAR Method",
  },
  {
    topic: "System Design & Scaling",
    question: "What strategies prevent Cache Stampede (Dog-piling effect) in high-throughput microservices?",
    tag: "Caching",
  },
]

export default function InterviewPrepPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<"study" | "sessions" | "notes">("study")

  // Data States
  const [notes, setNotes] = useState<PrepNote[]>([])
  const [sessions, setSessions] = useState<InterviewSessionItem[]>([])
  const [loading, setLoading] = useState(true)

  // Interactive AI Study States
  const [selectedTopic, setSelectedTopic] = useState<string>("All Topics")
  const [studyQuestion, setStudyQuestion] = useState("")
  const [isAskingStudy, setIsAskingStudy] = useState(false)
  const [studyHistory, setStudyHistory] = useState<StudyDiscussionMessage[]>([])
  const [activeSpeakingText, setActiveSpeakingText] = useState<string | null>(null)
  const [studyLang, setStudyLang] = useState<"mixed" | "bn" | "en">("mixed")
  const [isListeningMic, setIsListeningMic] = useState(false)

  // Modals
  const [conversationalModalOpen, setConversationalModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<InterviewSessionItem | null>(null)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [nOpen, setNOpen] = useState(false)
  const [nForm, setNForm] = useState({ title: "", content: "", category: "General" })
  const [submittingNote, setSubmittingNote] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const recognitionRef = useRef<any>(null)

  function fetchAll() {
    Promise.all([
      fetch("/api/prep-notes").then((r) => r.json()),
      fetch("/api/interview-sessions").then((r) => r.json()),
    ])
      .then(([n, s]) => {
        setNotes(Array.isArray(n) ? n : [])
        setSessions(Array.isArray(s) ? s : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push("/login")
      return
    }
    fetchAll()
  }, [isLoaded, isSignedIn, router])

  // Handle Ask Study Assistant
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

  // Voice Input for asking question
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

  // Save AI answer as revision note
  async function handleSaveAsNote(title: string, content: string, category: string) {
    try {
      const res = await fetch("/api/prep-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Study: ${title.slice(0, 50)}...`,
          content,
          category: category || "General",
        }),
      })

      if (res.ok) {
        toast.success("Saved to your Revision Notes!")
        fetchAll()
      } else {
        toast.error("Failed to save note.")
      }
    } catch {
      toast.error("Error saving note.")
    }
  }

  // Read aloud helper
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

  // Create Manual Note
  async function createNote(e: React.FormEvent) {
    e.preventDefault()
    if (!nForm.title.trim()) return
    setSubmittingNote(true)
    const res = await fetch("/api/prep-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nForm),
    })
    if (res.ok) {
      toast.success("Note added successfully")
      setNOpen(false)
      setNForm({ title: "", content: "", category: "General" })
      fetchAll()
    } else {
      toast.error("Failed to add note")
    }
    setSubmittingNote(false)
  }

  // Delete Note
  async function deleteNote(id: string) {
    await fetch(`/api/prep-notes/${id}`, { method: "DELETE" })
    toast.success("Note removed")
    fetchAll()
  }

  // Delete Session
  async function deleteSession(id: string) {
    const res = await fetch(`/api/interview-sessions?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Session removed")
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (selectedSession?.id === id) {
        setSessionModalOpen(false)
        setSelectedSession(null)
      }
    } else {
      toast.error("Failed to delete session")
    }
  }

  const filteredStarters =
    selectedTopic === "All Topics"
      ? DISCUSSION_STARTERS
      : DISCUSSION_STARTERS.filter((s) => s.topic === selectedTopic)

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Hero Banner */}
      <div className="rounded-3xl border bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-background p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Interactive AI Learning Lab & Spoken Mock Interview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Interview Prep & Concept Mastery
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Explore deep architectural topics, ask questions to get hiring-grade answers, practice live spoken mock interviews, and review all saved transcripts for pre-interview revision.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <Button
              size="lg"
              onClick={() => setConversationalModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm shadow-md gap-2 h-11 px-5 rounded-2xl cursor-pointer"
            >
              <Mic className="h-4 w-4 animate-pulse" />
              <span>Start Spoken Mock Interview</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{studyHistory.length} Discussions</p>
              <p className="text-[10px] text-muted-foreground">Interactive Q&A turns</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-xs">
              <History className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{sessions.length} Mock Sessions</p>
              <p className="text-[10px] text-muted-foreground">Recorded transcripts</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 col-span-2 sm:col-span-1">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{notes.length} Revision Notes</p>
              <p className="text-[10px] text-muted-foreground">Saved for final revision</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/30 border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("study")}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-semibold transition-all cursor-pointer",
              activeTab === "study"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>AI Concept Lab & Q&A</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-semibold transition-all cursor-pointer",
              activeTab === "sessions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Mock Transcripts ({sessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-semibold transition-all cursor-pointer",
              activeTab === "notes"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Revision Notes ({notes.length})</span>
          </button>
        </div>

        {activeTab === "notes" && (
          <Button
            size="sm"
            onClick={() => setNOpen(true)}
            className="text-xs h-8 gap-1 rounded-xl"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Custom Note</span>
          </Button>
        )}
      </div>

      {/* TAB 1: INTERACTIVE AI STUDY & TOPIC Q&A LAB */}
      {activeTab === "study" && (
        <div className="space-y-6">
          {/* Topic Filter Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <span>Explore by Engineering Topic</span>
              </span>
              <span className="text-[10px] text-muted-foreground">Select a category to filter study starters</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {STUDY_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border cursor-pointer",
                    selectedTopic === topic
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-background hover:bg-muted/50 text-muted-foreground border-border"
                  )}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Concept Discussion Starters */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">
              ⚡ High-Yield Discussion Starters ({filteredStarters.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredStarters.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setStudyQuestion(item.question)
                    handleAskStudy(item.question)
                  }}
                  className="flex flex-col text-left p-3 rounded-2xl border bg-card hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {item.tag}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                    {item.question}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Question Input Box */}
          <Card className="rounded-3xl border shadow-xs overflow-hidden bg-card">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-6 border-b bg-muted/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-bold">Ask Any Tech Concept or Question</CardTitle>
                    <CardDescription className="text-[10.5px]">Type or speak your question in English, বাংলা, or Banglish</CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Select value={studyLang} onValueChange={(v: any) => setStudyLang(v)}>
                    <SelectTrigger className="text-[11px] h-7 px-2.5 rounded-lg w-[110px]">
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
            <CardContent className="p-3 sm:p-5 space-y-3">
              <div className="flex gap-2">
                <Textarea
                  value={studyQuestion}
                  onChange={(e) => setStudyQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleAskStudy()
                    }
                  }}
                  placeholder="e.g. How does Redis cluster handle data partitioning and slot rebalancing? / বাংলাতেও লিখতে বা বলতে পারেন..."
                  rows={2}
                  className="text-xs sm:text-sm leading-relaxed rounded-2xl resize-none"
                />
                <div className="flex flex-col gap-1.5 shrink-0 justify-center">
                  <Button
                    type="button"
                    variant={isListeningMic ? "default" : "outline"}
                    size="icon"
                    onClick={toggleVoiceInput}
                    title={isListeningMic ? "Listening... Click to stop" : "Speak question"}
                    className={cn(
                      "h-9 w-9 rounded-xl transition-all",
                      isListeningMic && "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                    )}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleAskStudy()}
                    disabled={!studyQuestion.trim() || isAskingStudy}
                    className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Q&A Discussion Thread */}
          {studyHistory.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
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
                                handleSaveAsNote(
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
      )}

      {/* TAB 2: RECORDED MOCK SESSIONS & TRANSCRIPTS */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Recorded Mock Interviews</h2>
              <p className="text-xs text-muted-foreground">Review your spoken mock conversations and AI STAR performance debriefs</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Card className="rounded-3xl border border-dashed p-8 text-center space-y-3">
              <History className="h-10 w-10 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold">No Mock Sessions Recorded Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Take a live spoken mock interview to practice with Tanya, Tanvir, Sarah, or David and your transcript will be saved here automatically!
                </p>
              </div>
              <Button
                onClick={() => setConversationalModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-xl font-semibold"
              >
                Start First Mock Interview
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {sessions.map((session) => (
                <Card
                  key={session.id}
                  className="rounded-3xl border hover:border-indigo-500/40 transition-all p-4 sm:p-5 flex flex-col justify-between gap-3 bg-card shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold bg-indigo-500/10 text-indigo-500"
                      >
                        {session.interviewType} Round
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {session.targetCompany}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium">
                        {session.targetRole}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {session.score !== null && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-bold",
                            session.score >= 80
                              ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                              : session.score >= 60
                              ? "border-amber-500 text-amber-600 bg-amber-500/10"
                              : "border-red-500 text-red-600 bg-red-500/10"
                          )}
                        >
                          Score: {session.score}/100
                        </Badge>
                      )}
                      {session.verdict && (
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {session.verdict}
                        </Badge>
                      )}
                      <span className="text-[10.5px] text-muted-foreground">
                        {Array.isArray(session.dialogue) ? session.dialogue.length : 0} Turns
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-7 px-2 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedSession(session)
                        setSessionModalOpen(true)
                      }}
                      className="text-xs h-8 px-3 gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                      <span>Review Transcript</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REVISION NOTES & SAVED CONCEPTS */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Revision Notes & Core Concepts</h2>
              <p className="text-xs text-muted-foreground">Your curated cheat-sheets and saved explanations for quick revision</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes & concepts..."
                className="pl-8 text-xs h-8 rounded-xl"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <Card className="rounded-3xl border border-dashed p-8 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold">No Revision Notes Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Ask any question in the AI Concept Lab and click &quot;Save Note&quot; or create a custom note!
                </p>
              </div>
              <Button
                onClick={() => setNOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-xl font-semibold"
              >
                Create Custom Note
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  className="rounded-3xl border p-4 sm:p-5 flex flex-col justify-between gap-3 bg-card shadow-2xs hover:border-indigo-500/30 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-500/10 text-indigo-500">
                        {note.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground leading-snug">{note.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNote(note.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs h-7 px-2 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleReadAloud(note.content)}
                      className="text-xs h-7 px-2.5 gap-1 rounded-lg"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>Read Aloud</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SESSION TRANSCRIPT & DEBRIEF MODAL */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-3xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-bold flex items-center justify-between gap-2 flex-wrap">
              <span>{selectedSession?.targetCompany} — {selectedSession?.targetRole}</span>
              {selectedSession?.score !== null && (
                <Badge className="bg-emerald-600 text-white text-xs">
                  Score: {selectedSession?.score}/100
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recorded {selectedSession?.interviewType} Round on {selectedSession?.createdAt ? new Date(selectedSession.createdAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-3">
            {/* Executive Summary */}
            {selectedSession?.report?.executiveSummary && (
              <div className="rounded-2xl border bg-muted/20 p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-indigo-500 flex items-center gap-1">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Executive Feedback</span>
                </span>
                <p className="text-xs leading-relaxed text-foreground">
                  {selectedSession.report.executiveSummary}
                </p>
              </div>
            )}

            {/* Strengths & Improvement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {selectedSession?.report?.strengths && selectedSession.report.strengths.length > 0 && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                  <span className="text-[10.5px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Key Strengths</span>
                  </span>
                  <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                    {selectedSession.report.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedSession?.report?.improvementAreas && selectedSession.report.improvementAreas.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                  <span className="text-[10.5px] font-bold text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Areas to Polish</span>
                  </span>
                  <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                    {selectedSession.report.improvementAreas.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Complete Spoken Dialogue Transcript */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Full Spoken Dialogue Transcript
              </span>
              <div className="space-y-2 rounded-2xl border bg-muted/10 p-3">
                {Array.isArray(selectedSession?.dialogue) &&
                  selectedSession.dialogue.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex flex-col",
                        msg.role === "interviewer" ? "items-start" : "items-end"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground mb-0.5">
                        {msg.role === "interviewer" ? "Interviewer" : "You (Candidate)"} • {msg.timestamp || ""}
                      </span>
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-xs max-w-[90%] leading-relaxed",
                          msg.role === "interviewer"
                            ? "bg-muted text-foreground border rounded-tl-sm"
                            : "bg-indigo-600 text-white rounded-tr-sm"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE CUSTOM NOTE MODAL */}
      <Dialog open={nOpen} onOpenChange={setNOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold">Add Custom Revision Note</DialogTitle>
            <DialogDescription className="text-xs">Save key concepts, architectural diagrams, or cheat codes</DialogDescription>
          </DialogHeader>
          <form onSubmit={createNote} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Title / Concept</Label>
              <Input
                value={nForm.title}
                onChange={(e) => setNForm({ ...nForm, title: e.target.value })}
                placeholder="e.g. Postgres Index Types Cheat Sheet"
                className="text-xs h-8 sm:h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Category</Label>
              <Input
                value={nForm.category}
                onChange={(e) => setNForm({ ...nForm, category: e.target.value })}
                placeholder="e.g. React, System Design, Database"
                className="text-xs h-8 sm:h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Note Content & Key Takeaways</Label>
              <Textarea
                value={nForm.content}
                onChange={(e) => setNForm({ ...nForm, content: e.target.value })}
                rows={4}
                placeholder="Key bullet points, syntax, trade-offs..."
                className="text-xs leading-relaxed"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingNote}
                className="text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submittingNote ? "Saving..." : "Save Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONVERSATIONAL VOICE MOCK INTERVIEW MODAL */}
      <ConversationalVoiceInterviewModal
        isOpen={conversationalModalOpen}
        onClose={() => {
          setConversationalModalOpen(false)
          fetchAll()
        }}
        initialRole="Senior Fullstack Engineer"
        initialCompany="Google / Tech Company"
        initialType="Technical"
        onSessionSaved={fetchAll}
      />
    </div>
  )
}
