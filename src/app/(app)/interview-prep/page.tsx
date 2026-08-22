"use client"

import { useEffect, useState } from "react"
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
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { VoiceMockInterviewModal, type MockQuestion } from "@/components/interview/VoiceMockInterviewModal"
import { ConversationalVoiceInterviewModal } from "@/components/interview/ConversationalVoiceInterviewModal"

interface PrepQuestion {
  id: string
  question: string
  answer: string | null
  category: string
  difficulty: string
  createdAt: string
}

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

const CATEGORIES = ["General", "JavaScript", "React", "System Design", "Behavioral", "TypeScript", "CSS", "Node.js"]
const DIFFICULTIES = ["Easy", "Medium", "Hard"]

const diffColors: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  Hard: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
}

export default function InterviewPrepPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [tab, setTab] = useState<"questions" | "notes" | "sessions">("questions")
  const [questions, setQuestions] = useState<PrepQuestion[]>([])
  const [notes, setNotes] = useState<PrepNote[]>([])
  const [sessions, setSessions] = useState<InterviewSessionItem[]>([])
  const [loading, setLoading] = useState(true)

  const [qOpen, setQOpen] = useState(false)
  const [nOpen, setNOpen] = useState(false)
  const [qForm, setQForm] = useState({ question: "", answer: "", category: "General", difficulty: "Medium" })
  const [nForm, setNForm] = useState({ title: "", content: "", category: "General" })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [aiOpen, setAiOpen] = useState(false)
  const [aiJd, setAiJd] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiQuestions, setAiQuestions] = useState<string[]>([])
  const [suggestingAnswer, setSuggestingAnswer] = useState<string | null>(null)

  const [conversationalModalOpen, setConversationalModalOpen] = useState(false)
  const [mockModalOpen, setMockModalOpen] = useState(false)
  const [activeMockQuestion, setActiveMockQuestion] = useState<MockQuestion | null>(null)

  const [selectedSession, setSelectedSession] = useState<InterviewSessionItem | null>(null)
  const [sessionModalOpen, setSessionModalOpen] = useState(false)

  function fetchAll() {
    Promise.all([
      fetch("/api/prep-questions").then((r) => r.json()),
      fetch("/api/prep-notes").then((r) => r.json()),
      fetch("/api/interview-sessions").then((r) => r.json()),
    ])
      .then(([q, n, s]) => {
        setQuestions(Array.isArray(q) ? q : [])
        setNotes(Array.isArray(n) ? n : [])
        setSessions(Array.isArray(s) ? s : [])
      })
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

  async function createQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!qForm.question.trim()) return
    setSubmitting(true)
    const res = await fetch("/api/prep-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(qForm),
    })
    if (res.ok) {
      toast.success("Added")
      setQOpen(false)
      setQForm({ question: "", answer: "", category: "General", difficulty: "Medium" })
      fetchAll()
    } else toast.error("Failed")
    setSubmitting(false)
  }

  async function createNote(e: React.FormEvent) {
    e.preventDefault()
    if (!nForm.title.trim()) return
    setSubmitting(true)
    const res = await fetch("/api/prep-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nForm),
    })
    if (res.ok) {
      toast.success("Added")
      setNOpen(false)
      setNForm({ title: "", content: "", category: "General" })
      fetchAll()
    } else toast.error("Failed")
    setSubmitting(false)
  }

  async function deleteQuestion(id: string) {
    await fetch(`/api/prep-questions/${id}`, { method: "DELETE" })
    fetchAll()
  }

  async function deleteNote(id: string) {
    await fetch(`/api/prep-notes/${id}`, { method: "DELETE" })
    fetchAll()
  }

  async function deleteSession(id: string) {
    const res = await fetch(`/api/interview-sessions?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Session deleted")
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (selectedSession?.id === id) {
        setSessionModalOpen(false)
        setSelectedSession(null)
      }
    } else {
      toast.error("Failed to delete session")
    }
  }

  async function generateFromJd() {
    if (!aiJd.trim()) return
    setAiLoading(true)
    setAiQuestions([])
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate 5 interview questions for this job description. Return ONLY the questions, one per line, numbered 1-5. No explanations or answers.\n\n${aiJd}`,
          mode: "interview",
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to generate")
      }
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let done = false
      let text = ""
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) text += decoder.decode(value, { stream: !done })
      }
      const lines = text
        .split("\n")
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((l) => l.length > 5)
      setAiQuestions(lines)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate"
      toast.error(message)
    } finally {
      setAiLoading(false)
    }
  }

  async function addAiQuestion(q: string) {
    await fetch("/api/prep-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, category: "General", difficulty: "Medium" }),
    })
    toast.success("Added to prep list")
    setAiQuestions((prev) => prev.filter((item) => item !== q))
    fetchAll()
  }

  async function suggestAnswer(questionId: string, questionText: string) {
    setSuggestingAnswer(questionId)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Provide a concise, practical answer for this interview question. Keep it under 200 words.\n\n${questionText}`,
          mode: "interview",
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to generate")
      }
      const reader = res.body?.getReader()
      if (!reader) return
      const decoder = new TextDecoder()
      let done = false
      let text = ""
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) text += decoder.decode(value, { stream: !done })
      }
      const answer = text.trim()
      if (!answer) {
        toast.error("AI returned empty answer")
        return
      }
      await fetch(`/api/prep-questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      })
      fetchAll()
      setExpanded(questionId)
      toast.success("Answer added")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate answer"
      toast.error(message)
    } finally {
      setSuggestingAnswer(null)
    }
  }

  const getVerdictBadge = (verdict?: string | null) => {
    switch (verdict) {
      case "Strong Hire":
        return <Badge className="bg-emerald-600 text-white font-semibold">Strong Hire</Badge>
      case "Hire":
        return <Badge className="bg-emerald-500 text-white font-semibold">Hire</Badge>
      case "Lean Hire":
        return <Badge className="bg-amber-500 text-white font-semibold">Lean Hire</Badge>
      default:
        return <Badge className="bg-rose-500 text-white font-semibold">{verdict || "Needs Work"}</Badge>
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Interview Prep</h1>
          <p className="text-sm text-muted-foreground">
            {questions.length} questions • {notes.length} notes • {sessions.length} recorded mock sessions
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border bg-muted/30 p-1">
          <Button
            variant={tab === "questions" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("questions")}
            className="text-xs h-8 gap-1.5"
          >
            <Brain className="h-3.5 w-3.5" />
            <span>Questions ({questions.length})</span>
          </Button>
          <Button
            variant={tab === "notes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("notes")}
            className="text-xs h-8 gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Notes ({notes.length})</span>
          </Button>
          <Button
            variant={tab === "sessions" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("sessions")}
            className="text-xs h-8 gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            <span>Sessions ({sessions.length})</span>
          </Button>
        </div>
      </div>

      {/* 1. QUESTIONS TAB */}
      {tab === "questions" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              onClick={() => setConversationalModalOpen(true)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Mic className="h-4 w-4" /> Start Conversational Voice Mock Interview
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Generate from JD
              </Button>
              <Button onClick={() => setQOpen(true)}>
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </div>
          </div>

          {questions.length === 0 ? (
            <Card className="p-12 text-center">
              <Brain className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No questions yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <Card key={q.id} className="group p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <button className="flex-1 text-left" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {q.category}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] ${diffColors[q.difficulty] || ""}`}>
                          {q.difficulty}
                        </Badge>
                      </div>
                      {expanded === q.id && q.answer && (
                        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground leading-relaxed">
                          {q.answer}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => {
                          setActiveMockQuestion({
                            id: q.id,
                            question: q.question,
                            category: q.category,
                            difficulty: q.difficulty,
                            answer: q.answer || undefined,
                          })
                          setMockModalOpen(true)
                        }}
                        className="text-muted-foreground hover:text-indigo-500 p-1"
                        title="Practice speaking answer (Voice Mock Interview)"
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => suggestAnswer(q.id, q.question)}
                        disabled={suggestingAnswer === q.id}
                        className="text-muted-foreground hover:text-primary p-1"
                        title="Suggest answer with AI"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive p-1 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* AI JD Generation Modal */}
          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generate Questions from JD</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Textarea
                  value={aiJd}
                  onChange={(e) => setAiJd(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={6}
                />
                <Button onClick={generateFromJd} disabled={aiLoading || !aiJd.trim()} className="w-full gap-1.5">
                  <Sparkles className="h-4 w-4" /> {aiLoading ? "Generating..." : "Generate Questions"}
                </Button>
                {aiQuestions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium">Generated Questions</p>
                    {aiQuestions.map((q, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border p-2.5">
                        <p className="text-xs flex-1">{q}</p>
                        <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => addAiQuestion(q)}>
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Question Dialog */}
          <Dialog open={qOpen} onOpenChange={setQOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Question</DialogTitle>
              </DialogHeader>
              <form onSubmit={createQuestion} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Question *</Label>
                  <Input
                    value={qForm.question}
                    onChange={(e) => setQForm({ ...qForm, question: e.target.value })}
                    placeholder="e.g. What is closure?"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Answer</Label>
                  <Textarea
                    rows={3}
                    value={qForm.answer}
                    onChange={(e) => setQForm({ ...qForm, answer: e.target.value })}
                    placeholder="Your answer..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={qForm.category} onValueChange={(v) => setQForm({ ...qForm, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select value={qForm.difficulty} onValueChange={(v) => setQForm({ ...qForm, difficulty: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setQOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Adding..." : "Add"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* 2. NOTES TAB */}
      {tab === "notes" && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setNOpen(true)}>
              <Plus className="h-4 w-4" /> Add Note
            </Button>
          </div>
          {notes.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No notes yet</p>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {notes.map((n) => (
                <Card key={n.id} className="group p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{n.title}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {n.category}
                      </Badge>
                      {n.content && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{n.content}</p>}
                      {n.application && (
                        <p className="text-[10px] text-muted-foreground mt-1">Linked: {n.application.companyName}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={nOpen} onOpenChange={setNOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Note</DialogTitle>
              </DialogHeader>
              <form onSubmit={createNote} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input
                    value={nForm.title}
                    onChange={(e) => setNForm({ ...nForm, title: e.target.value })}
                    placeholder="e.g. React Hooks Tips"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Content</Label>
                  <Textarea
                    rows={4}
                    value={nForm.content}
                    onChange={(e) => setNForm({ ...nForm, content: e.target.value })}
                    placeholder="Write your notes..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={nForm.category} onValueChange={(v) => setNForm({ ...nForm, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setNOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Adding..." : "Add"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* 3. SESSIONS HISTORY TAB */}
      {tab === "sessions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              onClick={() => setConversationalModalOpen(true)}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Mic className="h-4 w-4" /> Start New Mock Interview
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <History className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <h3 className="text-base font-semibold">No Mock Interview Sessions Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Conduct voice mock interviews with the conversational AI to build up your debrief performance history.
              </p>
              <Button
                onClick={() => setConversationalModalOpen(true)}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                <Mic className="h-3.5 w-3.5" /> Start Your First Mock Interview
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sessions.map((s) => (
                <Card
                  key={s.id}
                  className="group p-4 hover:shadow-md transition-all border bg-card hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-foreground truncate">{s.targetRole}</h4>
                        {getVerdictBadge(s.verdict)}
                        {typeof s.score === "number" && (
                          <Badge variant="outline" className="text-xs font-mono font-bold">
                            {s.score}/100
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-indigo-500" />
                          <span>{s.targetCompany}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Brain className="h-3 w-3 text-emerald-500" />
                          <span>{s.interviewType}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Languages className="h-3 w-3 text-amber-500" />
                          <span>{s.language === "bn" ? "বাংলা" : s.language === "mixed" ? "Banglish" : "English"}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                        </span>
                      </div>

                      {s.report?.executiveSummary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 rounded-md p-2">
                          {s.report.executiveSummary}
                        </p>
                      )}

                      <div className="pt-1 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSession(s)
                            setSessionModalOpen(true)
                          }}
                          className="text-xs h-7 gap-1 font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        >
                          <span>View Full Debrief & Transcript</span>
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteSession(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1.5 transition-all rounded-md hover:bg-destructive/10"
                      title="Delete Session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SESSION DETAIL & TRANSCRIPT MODAL */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
          {selectedSession && (
            <>
              <DialogHeader className="pb-2 border-b">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {selectedSession.targetRole} Mock Interview
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedSession.targetCompany} • {selectedSession.interviewType} Round •{" "}
                      {selectedSession.language === "bn"
                        ? "বাংলা"
                        : selectedSession.language === "mixed"
                        ? "Banglish"
                        : "English"}{" "}
                      • {new Date(selectedSession.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {getVerdictBadge(selectedSession.verdict)}
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
                {/* Score Cards */}
                {selectedSession.report && (
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="p-3 bg-muted/20 border text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">Overall Score</p>
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        {selectedSession.report.overallScore || selectedSession.score || 0}%
                      </p>
                    </Card>
                    <Card className="p-3 bg-muted/20 border text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">Technical Depth</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {selectedSession.report.technicalScore || 0}%
                      </p>
                    </Card>
                    <Card className="p-3 bg-muted/20 border text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">Clarity & Structure</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {selectedSession.report.clarityScore || 0}%
                      </p>
                    </Card>
                  </div>
                )}

                {/* Executive Summary */}
                {selectedSession.report?.executiveSummary && (
                  <div className="rounded-xl border bg-muted/10 p-3.5 space-y-1">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-indigo-500" /> Executive Assessment
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedSession.report.executiveSummary}
                    </p>
                  </div>
                )}

                {/* Strengths & Improvement Areas */}
                {selectedSession.report && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedSession.report.strengths && selectedSession.report.strengths.length > 0 && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 p-3 space-y-2">
                        <h5 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Key Strengths
                        </h5>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {selectedSession.report.strengths.map((st, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-500">•</span>
                              <span>{st}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedSession.report.improvementAreas && selectedSession.report.improvementAreas.length > 0 && (
                      <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 p-3 space-y-2">
                        <h5 className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Areas for Growth
                        </h5>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {selectedSession.report.improvementAreas.map((imp, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-500">•</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Complete Dialogue Transcript */}
                <div className="space-y-2 pt-2 border-t">
                  <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-indigo-500" /> Complete Voice Interview Transcript
                  </h5>
                  <div className="rounded-xl border bg-muted/10 p-3 space-y-3 max-h-72 overflow-y-auto">
                    {Array.isArray(selectedSession.dialogue) && selectedSession.dialogue.length > 0 ? (
                      selectedSession.dialogue.map((turn, i) => (
                        <div
                          key={i}
                          className={`flex flex-col text-xs rounded-lg p-2.5 ${
                            turn.role === "interviewer"
                              ? "bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 mr-8"
                              : "bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 ml-8"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold mb-1">
                            <span>{turn.role === "interviewer" ? "🎙️ AI Interviewer" : "👤 Candidate (You)"}</span>
                            {turn.timestamp && <span>{turn.timestamp}</span>}
                          </div>
                          <p className="leading-relaxed text-foreground">{turn.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No dialogue history recorded.</p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t flex justify-between items-center sm:justify-between">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteSession(selectedSession.id)}
                  className="text-xs gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Record
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSessionModalOpen(false)} className="text-xs">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Question Voice Mock Modal */}
      {activeMockQuestion && (
        <VoiceMockInterviewModal
          isOpen={mockModalOpen}
          onClose={() => {
            setMockModalOpen(false)
            setActiveMockQuestion(null)
          }}
          question={activeMockQuestion}
        />
      )}

      {/* Full Conversational Voice Mock Interview Modal */}
      <ConversationalVoiceInterviewModal
        isOpen={conversationalModalOpen}
        onClose={() => setConversationalModalOpen(false)}
        onSessionSaved={fetchAll}
      />
    </div>
  )
}
