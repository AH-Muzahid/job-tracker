"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Brain, FileText, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

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
  const [tab, setTab] = useState<"questions" | "notes">("questions")
  const [questions, setQuestions] = useState<PrepQuestion[]>([])
  const [notes, setNotes] = useState<PrepNote[]>([])
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

  function fetchAll() {
    Promise.all([
      fetch("/api/prep-questions").then((r) => r.json()),
      fetch("/api/prep-notes").then((r) => r.json()),
    ]).then(([q, n]) => { setQuestions(q); setNotes(n) }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }
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
    if (res.ok) { toast.success("Added"); setQOpen(false); setQForm({ question: "", answer: "", category: "General", difficulty: "Medium" }); fetchAll() }
    else toast.error("Failed")
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
    if (res.ok) { toast.success("Added"); setNOpen(false); setNForm({ title: "", content: "", category: "General" }); fetchAll() }
    else toast.error("Failed")
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

  async function generateFromJd() {
    if (!aiJd.trim()) return
    setAiLoading(true)
    setAiQuestions([])
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate 5 interview questions for this job description:\n\n${aiJd}`,
          mode: "interview",
        }),
      })
      if (!res.ok) throw new Error("Failed")
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
      const parsed = JSON.parse(text)
      const qs = parsed.content?.split("\n").filter((l: string) => l.trim()) || [parsed.content || text]
      setAiQuestions(qs)
    } catch {
      toast.error("Failed to generate questions")
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
    fetchAll()
    toast.success("Question added")
  }

  async function suggestAnswer(questionId: string, questionText: string) {
    setSuggestingAnswer(questionId)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Provide a concise answer for this interview question:\n\n${questionText}`,
          mode: "interview",
        }),
      })
      if (!res.ok) throw new Error("Failed")
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
      const parsed = JSON.parse(text)
      const answer = parsed.content || text
      await fetch(`/api/prep-questions/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      })
      fetchAll()
      setExpanded(questionId)
      toast.success("Answer added")
    } catch {
      toast.error("Failed to generate answer")
    } finally {
      setSuggestingAnswer(null)
    }
  }

  if (!isLoaded || loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Prep</h1>
          <p className="text-sm text-muted-foreground">{questions.length} questions, {notes.length} notes</p>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "questions" ? "default" : "outline"} size="sm" onClick={() => setTab("questions")}>
            <Brain className="h-4 w-4" /> Questions
          </Button>
          <Button variant={tab === "notes" ? "default" : "outline"} size="sm" onClick={() => setTab("notes")}>
            <FileText className="h-4 w-4" /> Notes
          </Button>
        </div>
      </div>

      {tab === "questions" && (
        <>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Generate from JD
            </Button>
            <Button onClick={() => setQOpen(true)}><Plus className="h-4 w-4" /> Add Question</Button>
          </div>
          {questions.length === 0 ? (
            <Card className="p-12 text-center"><Brain className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">No questions yet</p></Card>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <Card key={q.id} className="group p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <button className="flex-1 text-left" onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
                      <p className="text-sm font-medium">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px]">{q.category}</Badge>
                        <Badge variant="secondary" className={`text-[10px] ${diffColors[q.difficulty] || ""}`}>{q.difficulty}</Badge>
                      </div>
                      {expanded === q.id && q.answer && (
                        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                          {q.answer}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => suggestAnswer(q.id, q.question)}
                        disabled={suggestingAnswer === q.id}
                        className="text-muted-foreground hover:text-primary p-1"
                        title="Suggest answer with AI"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive p-1 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

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

          <Dialog open={qOpen} onOpenChange={setQOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Question</DialogTitle></DialogHeader>
              <form onSubmit={createQuestion} className="space-y-3">
                <div className="space-y-1.5"><Label>Question *</Label><Input value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} placeholder="e.g. What is closure?" /></div>
                <div className="space-y-1.5"><Label>Answer</Label><Textarea rows={3} value={qForm.answer} onChange={(e) => setQForm({ ...qForm, answer: e.target.value })} placeholder="Your answer..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Category</Label><Select value={qForm.category} onValueChange={(v) => setQForm({ ...qForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><Label>Difficulty</Label><Select value={qForm.difficulty} onValueChange={(v) => setQForm({ ...qForm, difficulty: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setQOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === "notes" && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setNOpen(true)}><Plus className="h-4 w-4" /> Add Note</Button>
          </div>
          {notes.length === 0 ? (
            <Card className="p-12 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">No notes yet</p></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {notes.map((n) => (
                <Card key={n.id} className="group p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{n.title}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">{n.category}</Badge>
                      {n.content && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{n.content}</p>}
                      {n.application && <p className="text-[10px] text-muted-foreground mt-1">Linked: {n.application.companyName}</p>}
                    </div>
                    <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={nOpen} onOpenChange={setNOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
              <form onSubmit={createNote} className="space-y-3">
                <div className="space-y-1.5"><Label>Title *</Label><Input value={nForm.title} onChange={(e) => setNForm({ ...nForm, title: e.target.value })} placeholder="e.g. React Hooks Tips" /></div>
                <div className="space-y-1.5"><Label>Content</Label><Textarea rows={4} value={nForm.content} onChange={(e) => setNForm({ ...nForm, content: e.target.value })} placeholder="Write your notes..." /></div>
                <div className="space-y-1.5"><Label>Category</Label><Select value={nForm.category} onValueChange={(v) => setNForm({ ...nForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setNOpen(false)}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
