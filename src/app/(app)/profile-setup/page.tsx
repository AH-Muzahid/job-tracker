"use client"

import React, { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  FileText,
  UploadCloud,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Edit2,
  Loader2,
  BrainCircuit,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableTagsInput } from "@/components/profile-setup/SearchableTagsInput"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PageContainer,
  PageHeader,
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardDescription,
  BlueprintCardContent,
  BlueprintCardFooter,
} from "@/components/primitives"
import { StatusBadge } from "@/components/StatusBadge"
import { cn } from "@/lib/utils"

const POPULAR_STACKS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Vue.js", "Node.js", "Express.js", "NestJS",
  "Python", "Django", "FastAPI", "Go", "Rust", "PostgreSQL", "MySQL", "MongoDB", "Redis",
  "Docker", "AWS", "Kubernetes", "TailwindCSS", "GraphQL", "Prisma", "Drizzle ORM"
]

const POPULAR_ROLES = [
  "Frontend Developer", "Backend Developer", "Fullstack Developer",
  "Software Engineer", "Senior Software Engineer", "React Developer",
  "Node.js Developer", "Python Developer", "Go Developer",
  "Mobile App Developer (iOS/Android)", "DevOps Engineer", "Cloud Engineer",
  "QA / Automation Engineer", "Machine Learning Engineer", "AI Engineer", "Product Manager"
]

const POPULAR_STRENGTHS = [
  "JavaScript & TypeScript", "React & Next.js", "Node.js & Express", "Python & FastAPI",
  "PostgreSQL & Database Design", "REST & GraphQL APIs", "System Design & Architecture",
  "Clean Code & Refactoring", "Docker & Containerization", "CI/CD & DevOps Automation",
  "Unit & Integration Testing", "Performance Optimization", "Microservices Architecture",
  "Problem Solving & Algorithms", "Team Mentorship & Code Reviews"
]

const POPULAR_WEAKNESSES = [
  "Public Speaking & Presenting", "Giving Constructive Feedback", "Asking for Help Early",
  "System Design at Scale", "Negotiation & Salary Discussions", "Delegating Tasks",
  "Test-Driven Development (TDD)", "Handling High-Pressure Deadlines"
]

const POPULAR_INDUSTRIES = [
  "SaaS (Software as a Service)", "Fintech", "AI & Machine Learning",
  "E-commerce & Retail", "Healthcare & Medtech", "Web3 & Blockchain",
  "Cloud Computing & Infrastructure", "Cybersecurity", "Developer Tools"
]

const WIZARD_STEPS = [
  { id: 1, title: "Resume & Contact", shortTitle: "Resume", code: "01", description: "Autofill from resume or manual input" },
  { id: 2, title: "Career Goals", shortTitle: "Goals", code: "02", description: "Target roles, salary & arrangements" },
  { id: 3, title: "Skills & Experience", shortTitle: "Skills", code: "03", description: "Technical stack & highlight projects" },
]

export default function ProfileSetupPage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [extractedFields, setExtractedFields] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Resumes in database
  const [existingResumes, setExistingResumes] = useState<Array<{ id: string; title: string; fileName: string }>>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string>("")

  // Form State
  const [form, setForm] = useState({
    phone: "",
    location: "",
    linkedInUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    targetRoles: "",
    workPreference: "remote",
    salaryExpectation: "",
    experienceLevel: "Mid",
    currentStatus: "actively_looking",
    strengths: "",
    weaknesses: "",
    weeklyHours: "10",
    bestDays: "Weekdays",
    noticePeriod: "Immediate",
    communicationLevel: "Professional",
    englishLevel: "Fluent",
    preferredIndustries: "SaaS (Software as a Service), Fintech",
    preferredCompanies: "",
    projects: [] as Array<{ name: string; stack: string; description: string }>,
  })

  const [tempProject, setTempProject] = useState({ name: "", stack: "", description: "" })
  const [editingProjIndex, setEditingProjIndex] = useState<number | null>(null)

  // Load existing profile & resumes
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/")
      return
    }

    if (isLoaded && isSignedIn) {
      let isMounted = true

      async function loadInitialData() {
        try {
          const [profileRes, resumesRes] = await Promise.all([
            fetch("/api/user/profile"),
            fetch("/api/resumes"),
          ])

          if (profileRes.ok && isMounted) {
            const data = await profileRes.json()
            if (data && data.userId) {
              setForm({
                phone: data.phone || "",
                location: data.location || "",
                linkedInUrl: data.linkedInUrl || data.linkedinUrl || "",
                githubUrl: data.githubUrl || "",
                portfolioUrl: data.portfolioUrl || "",
                targetRoles: Array.isArray(data.targetRoles) ? data.targetRoles.join(", ") : "",
                workPreference: data.workPreference || "remote",
                salaryExpectation: data.salaryExpectation || "",
                experienceLevel: data.experienceLevel || "Mid",
                currentStatus: data.currentStatus || "actively_looking",
                strengths: data.strengths || "",
                weaknesses: data.weaknesses || "",
                weeklyHours: data.weeklyHours !== null && data.weeklyHours !== undefined ? String(data.weeklyHours) : "10",
                bestDays: data.bestDays || "Weekdays",
                noticePeriod: data.noticePeriod || "Immediate",
                communicationLevel: data.communicationLevel || "Professional",
                englishLevel: data.englishLevel || "Fluent",
                preferredIndustries: data.preferredIndustries || "SaaS (Software as a Service), Fintech",
                preferredCompanies: data.preferredCompanies || "",
                projects: Array.isArray(data.bestProjects) ? data.bestProjects : [],
              })
            }
          }

          if (resumesRes.ok && isMounted) {
            const resumes = await resumesRes.json()
            if (Array.isArray(resumes)) {
              setExistingResumes(resumes)
              if (resumes.length > 0) {
                setSelectedResumeId(resumes[0].id)
              }
            }
          }
        } catch (err) {
          console.error("Initial load error:", err)
        } finally {
          if (isMounted) setLoadingProfile(false)
        }
      }

      loadInitialData()
      return () => {
        isMounted = false
      }
    }
  }, [isLoaded, isSignedIn, router])

  // Extract Profile Info from Resume
  async function handleExtractResume(file?: File, resumeId?: string) {
    try {
      setExtracting(true)
      let res: Response

      if (file) {
        const formData = new FormData()
        formData.append("file", file)
        res = await fetch("/api/user/profile/extract-from-resume", {
          method: "POST",
          body: formData,
        })
      } else {
        res = await fetch("/api/user/profile/extract-from-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeId: resumeId || selectedResumeId }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to extract from resume")
      }

      const ext = data.extracted || {}
      const newlyExtracted: string[] = []

      setForm((prev) => {
        const updated = { ...prev }
        if (ext.phone) { updated.phone = ext.phone; newlyExtracted.push("Phone") }
        if (ext.location) { updated.location = ext.location; newlyExtracted.push("Location") }
        if (ext.linkedInUrl) { updated.linkedInUrl = ext.linkedInUrl; newlyExtracted.push("LinkedIn") }
        if (ext.githubUrl) { updated.githubUrl = ext.githubUrl; newlyExtracted.push("GitHub") }
        if (ext.portfolioUrl) { updated.portfolioUrl = ext.portfolioUrl; newlyExtracted.push("Portfolio") }
        if (ext.targetRoles && Array.isArray(ext.targetRoles) && ext.targetRoles.length > 0) {
          updated.targetRoles = ext.targetRoles.join(", ")
          newlyExtracted.push("Target Roles")
        }
        if (ext.experienceLevel) { updated.experienceLevel = ext.experienceLevel; newlyExtracted.push("Experience Level") }
        if (ext.strengths) { updated.strengths = ext.strengths; newlyExtracted.push("Skills & Strengths") }
        if (ext.preferredIndustries) { updated.preferredIndustries = ext.preferredIndustries; newlyExtracted.push("Industries") }
        if (ext.bestProjects && Array.isArray(ext.bestProjects) && ext.bestProjects.length > 0) {
          updated.projects = ext.bestProjects
          newlyExtracted.push("Projects")
        }
        return updated
      })

      setExtractedFields(newlyExtracted)
      toast.success(`Successfully extracted ${newlyExtracted.length} profile fields from resume!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Extraction failed"
      toast.error(msg)
    } finally {
      setExtracting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleExtractResume(file)
    }
  }

  function handleAddOrUpdateProject() {
    if (!tempProject.name.trim()) {
      toast.error("Project name is required")
      return
    }

    if (editingProjIndex !== null) {
      const updated = [...form.projects]
      updated[editingProjIndex] = tempProject
      setForm({ ...form, projects: updated })
      setEditingProjIndex(null)
      toast.success("Project updated")
    } else {
      setForm({ ...form, projects: [...form.projects, tempProject] })
      toast.success("Project added")
    }
    setTempProject({ name: "", stack: "", description: "" })
  }

  function handleStartEditProject(index: number) {
    setTempProject(form.projects[index])
    setEditingProjIndex(index)
  }

  function handleRemoveProject(index: number) {
    if (editingProjIndex === index) {
      setEditingProjIndex(null)
      setTempProject({ name: "", stack: "", description: "" })
    }
    setForm({
      ...form,
      projects: form.projects.filter((_, i) => i !== index),
    })
    toast.info("Project removed")
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const body = {
        phone: form.phone || null,
        location: form.location || null,
        targetRoles: form.targetRoles ? form.targetRoles.split(",").map((s) => s.trim()).filter(Boolean) : [],
        workPreference: form.workPreference || null,
        salaryExpectation: form.salaryExpectation || null,
        experienceLevel: form.experienceLevel || null,
        currentStatus: form.currentStatus || null,
        linkedInUrl: form.linkedInUrl || null,
        linkedinUrl: form.linkedInUrl || null,
        githubUrl: form.githubUrl || null,
        portfolioUrl: form.portfolioUrl || null,
        bestProjects: form.projects || [],
        strengths: form.strengths || null,
        weaknesses: form.weaknesses || null,
        weeklyHours: form.weeklyHours ? parseInt(form.weeklyHours, 10) : null,
        bestDays: form.bestDays || null,
        noticePeriod: form.noticePeriod || null,
        communicationLevel: form.communicationLevel || null,
        englishLevel: form.englishLevel || null,
        preferredIndustries: form.preferredIndustries || null,
        preferredCompanies: form.preferredCompanies || null,
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Failed to save profile")

      toast.success("Profile saved and synchronized with AI memory!")
      router.push("/dashboard")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loadingProfile) {
    return (
      <PageContainer className="max-w-4xl pb-16 space-y-6">
        <PageHeader skeleton />
        <div className="grid grid-cols-3 gap-2 border-b border-border/80 pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-t-[4px] bg-muted/40">
              <Skeleton className="h-5 w-7 rounded-[2px]" />
              <Skeleton className="h-3 w-24 rounded-[4px] hidden sm:block" />
            </div>
          ))}
        </div>
        <div className="p-6 rounded-[6px] border border-border bg-card space-y-5">
          <Skeleton className="h-5 w-48 rounded-[4px]" />
          <Skeleton className="h-24 w-full rounded-[6px]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-9 w-full rounded-[4px]" />
            <Skeleton className="h-9 w-full rounded-[4px]" />
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="max-w-4xl pb-16">
      {/* Standardized Header */}
      <PageHeader
        overline="ONBOARDING / IDENTITY"
        title="Career Profile & AI Knowledge"
        description="Autofill from your resume or customize your career targets for personalized AI job matching."
        primaryAction={
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground border border-border/70 bg-card px-2.5 py-1 rounded-[4px] max-w-full truncate shadow-2xs">
            <BrainCircuit className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">Synced to AI Assistant & Memories</span>
          </div>
        }
      />

      {/* 3-Step Wizard Navigation */}
      <div
        role="tablist"
        aria-label="Profile setup stages"
        className="mt-6 flex border-b border-border/80 overflow-x-auto sm:overflow-x-visible overflow-y-hidden no-scrollbar gap-1"
      >
        {WIZARD_STEPS.map((s) => {
          const isActive = step === s.id
          const isDone = step > s.id

          return (
            <button
              key={s.id}
              role="tab"
              id={`step-${s.id}`}
              aria-selected={isActive}
              aria-controls={`panel-step-${s.id}`}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                "relative flex items-center justify-center sm:justify-start gap-2 px-3.5 sm:px-4 py-2.5 min-h-[42px] text-xs font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-[1px] rounded-t-[4px] flex-1 sm:flex-initial",
                isActive
                  ? "border-foreground text-foreground bg-muted/60 font-semibold shadow-2xs"
                  : isDone
                  ? "border-transparent text-foreground/80 hover:text-foreground hover:bg-muted/30 font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <span className="text-[10px] text-muted-foreground font-mono">
                {isDone ? "[✓]" : `[${s.code}]`}
              </span>
              <span className="inline sm:hidden">{s.shortTitle}</span>
              <span className="hidden sm:inline">{s.title}</span>
              {isDone && (
                <span className="ml-0.5 text-[9px] font-mono px-1 py-0.2 rounded-[2px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Ready
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* STEP 1: RESUME AUTOFILL & CONTACT */}
      <div
        id="panel-step-1"
        role="tabpanel"
        aria-labelledby="step-1"
        className={step === 1 ? "pt-6 animate-in fade-in-50 duration-200" : "hidden"}
      >
        <BlueprintCard>
          <BlueprintCardHeader>
            <div>
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">STEP / 01</span>
              <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Resume Extraction & Contact Details
              </BlueprintCardTitle>
              <BlueprintCardDescription>
                Upload your resume or select an existing one to automatically extract phone, location, links, and skills.
              </BlueprintCardDescription>
            </div>

            <StatusBadge status="staged" customLabel="Step 1 of 3" size="sm" />
          </BlueprintCardHeader>

          <BlueprintCardContent className="space-y-5">
            {/* Resume Upload & Extract Box */}
            <div className="p-4 sm:p-5 rounded-[6px] border border-dashed border-border bg-muted/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Smart Resume Autofill</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Upload a PDF resume to populate up to 80% of this form automatically.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={extracting}
                    className="text-xs h-8 rounded-[4px] cursor-pointer font-mono border-border"
                  >
                    {extracting ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-primary" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {extracting ? "Extracting..." : "Upload New PDF"}
                  </Button>

                  {existingResumes.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleExtractResume(undefined, selectedResumeId)}
                      disabled={extracting}
                      className="text-xs h-8 rounded-[4px] cursor-pointer font-mono bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    >
                      {extracting ? "Extracting..." : "Autofill from Saved Resume"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Extraction Badges */}
              {extractedFields.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary mb-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Autofilled from Resume:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedFields.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded-[4px] bg-background border border-border text-foreground font-mono text-[10px]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-medium text-foreground">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="text-xs h-8 rounded-[4px] border-border bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs font-medium text-foreground">
                  Current Location
                </Label>
                <Input
                  id="location"
                  placeholder="San Francisco, CA / Remote"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="text-xs h-8 rounded-[4px] border-border bg-background"
                />
              </div>
            </div>

            {/* Social & Portfolio Links */}
            <div className="space-y-3 pt-3 border-t border-border/40">
              <p className="text-xs font-semibold text-foreground">Online Profiles & Links</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin" className="text-xs text-muted-foreground font-medium">
                    LinkedIn Profile
                  </Label>
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/..."
                    value={form.linkedInUrl}
                    onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })}
                    className="text-xs h-8 font-mono text-[11px] rounded-[4px] border-border bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="github" className="text-xs text-muted-foreground font-medium">
                    GitHub Profile
                  </Label>
                  <Input
                    id="github"
                    placeholder="https://github.com/..."
                    value={form.githubUrl}
                    onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                    className="text-xs h-8 font-mono text-[11px] rounded-[4px] border-border bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="portfolio" className="text-xs text-muted-foreground font-medium">
                    Portfolio / Website
                  </Label>
                  <Input
                    id="portfolio"
                    placeholder="https://yourdomain.com"
                    value={form.portfolioUrl}
                    onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                    className="text-xs h-8 font-mono text-[11px] rounded-[4px] border-border bg-background"
                  />
                </div>
              </div>
            </div>
          </BlueprintCardContent>

          <BlueprintCardFooter className="justify-end">
            <Button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs h-8 px-4 rounded-[4px] font-mono cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <span>Continue to Career Goals</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </BlueprintCardFooter>
        </BlueprintCard>
      </div>

      {/* STEP 2: CAREER GOALS & PREFERENCES */}
      <div
        id="panel-step-2"
        role="tabpanel"
        aria-labelledby="step-2"
        className={step === 2 ? "pt-6 animate-in fade-in-50 duration-200" : "hidden"}
      >
        <BlueprintCard>
          <BlueprintCardHeader>
            <div>
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">STEP / 02</span>
              <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Target Career & Work Preferences
              </BlueprintCardTitle>
              <BlueprintCardDescription>
                Set the job titles, work arrangements, and compensation expectations you are targeting.
              </BlueprintCardDescription>
            </div>

            <StatusBadge status="interviewing" customLabel="Step 2 of 3" size="sm" />
          </BlueprintCardHeader>

          <BlueprintCardContent className="space-y-4">
            {/* Target Roles */}
            <SearchableTagsInput
              id="target-roles"
              label="Target Job Roles / Titles"
              placeholder="Type role or select below..."
              value={form.targetRoles}
              onChange={(newVal) => setForm({ ...form, targetRoles: newVal })}
              popularItems={POPULAR_ROLES}
            />

            {/* Work Mode & Experience Level */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Work Arrangement</Label>
                <Select
                  value={form.workPreference}
                  onValueChange={(val) => setForm({ ...form, workPreference: val })}
                >
                  <SelectTrigger className="text-xs h-8 rounded-[4px] border-border bg-background">
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[4px] border-border">
                    <SelectItem value="remote">Remote Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="open">Open to Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Experience Level</Label>
                <Select
                  value={form.experienceLevel}
                  onValueChange={(val) => setForm({ ...form, experienceLevel: val })}
                >
                  <SelectTrigger className="text-xs h-8 rounded-[4px] border-border bg-background">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[4px] border-border">
                    <SelectItem value="Entry">Entry Level (0-1 yrs)</SelectItem>
                    <SelectItem value="Junior">Junior (1-2 yrs)</SelectItem>
                    <SelectItem value="Mid">Mid-Level (3-5 yrs)</SelectItem>
                    <SelectItem value="Senior">Senior (5-8 yrs)</SelectItem>
                    <SelectItem value="Lead">Lead / Staff (8+ yrs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Job Search Status</Label>
                <Select
                  value={form.currentStatus}
                  onValueChange={(val) => setForm({ ...form, currentStatus: val })}
                >
                  <SelectTrigger className="text-xs h-8 rounded-[4px] border-border bg-background">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[4px] border-border">
                    <SelectItem value="actively_looking">Actively Interviewing</SelectItem>
                    <SelectItem value="open_to_offers">Open to Good Offers</SelectItem>
                    <SelectItem value="casually_browsing">Casually Browsing</SelectItem>
                    <SelectItem value="employed">Happily Employed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Salary & Notice Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="salary" className="text-xs font-medium text-foreground">
                  Target Salary Expectation
                </Label>
                <Input
                  id="salary"
                  placeholder="e.g. $120k - $150k USD / Annual"
                  value={form.salaryExpectation}
                  onChange={(e) => setForm({ ...form, salaryExpectation: e.target.value })}
                  className="text-xs h-8 rounded-[4px] border-border bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notice" className="text-xs font-medium text-foreground">
                  Notice Period / Availability
                </Label>
                <Input
                  id="notice"
                  placeholder="e.g. Immediate / 2 Weeks"
                  value={form.noticePeriod}
                  onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                  className="text-xs h-8 rounded-[4px] border-border bg-background"
                />
              </div>
            </div>

            {/* Target Industries */}
            <SearchableTagsInput
              id="industries"
              label="Target Industries (Optional)"
              placeholder="e.g. SaaS, Fintech, AI..."
              value={form.preferredIndustries}
              onChange={(newVal) => setForm({ ...form, preferredIndustries: newVal })}
              popularItems={POPULAR_INDUSTRIES}
            />
          </BlueprintCardContent>

          <BlueprintCardFooter className="justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              className="text-xs h-8 px-3 rounded-[4px] font-mono cursor-pointer gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setStep(3)}
              className="text-xs h-8 px-4 rounded-[4px] font-mono cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <span>Continue to Skills & Projects</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </BlueprintCardFooter>
        </BlueprintCard>
      </div>

      {/* STEP 3: SKILLS, AI DRILLS & PROJECTS */}
      <div
        id="panel-step-3"
        role="tabpanel"
        aria-labelledby="step-3"
        className={step === 3 ? "pt-6 animate-in fade-in-50 duration-200" : "hidden"}
      >
        <BlueprintCard>
          <BlueprintCardHeader>
            <div>
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">STEP / 03</span>
              <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground">
                Technical Skills, Projects & AI Focus
              </BlueprintCardTitle>
              <BlueprintCardDescription>
                Help the AI assistant highlight your strengths in resume tailoring and target growth areas in mock interviews.
              </BlueprintCardDescription>
            </div>

            <StatusBadge status="offer" customLabel="Step 3 of 3" size="sm" />
          </BlueprintCardHeader>

          <BlueprintCardContent className="space-y-5">
            {/* Strengths */}
            <SearchableTagsInput
              id="strengths"
              label="Core Technical Strengths & Tech Stacks"
              placeholder="Select strengths or type..."
              value={form.strengths}
              onChange={(newVal) => setForm({ ...form, strengths: newVal })}
              popularItems={[...POPULAR_STACKS, ...POPULAR_STRENGTHS]}
            />

            {/* Weaknesses */}
            <SearchableTagsInput
              id="weaknesses"
              label="Growth Areas / Interview Prep Focus"
              placeholder="Areas to practice in mock interviews..."
              value={form.weaknesses}
              onChange={(newVal) => setForm({ ...form, weaknesses: newVal })}
              popularItems={POPULAR_WEAKNESSES}
            />

            {/* Highlight Projects */}
            <div className="space-y-3 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Top Highlight Projects</p>
                  <p className="text-[11px] text-muted-foreground">
                    Featured in AI resume tailoring and interview talking points.
                  </p>
                </div>
              </div>

              {/* Add/Edit Project Sub-form */}
              <div className="p-3.5 rounded-[6px] bg-muted/20 border border-border space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{editingProjIndex !== null ? "Edit Project Details" : "Add New Highlight Project"}</span>
                  {editingProjIndex !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProjIndex(null)
                        setTempProject({ name: "", stack: "", description: "" })
                      }}
                      className="text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Project Name (e.g. Distributed Job Tracker)"
                    value={tempProject.name}
                    onChange={(e) => setTempProject({ ...tempProject, name: e.target.value })}
                    className="text-xs h-8 rounded-[4px] border-border bg-background font-mono"
                  />
                  <Input
                    placeholder="Tech Stack (e.g. Next.js, Go, PostgreSQL)"
                    value={tempProject.stack}
                    onChange={(e) => setTempProject({ ...tempProject, stack: e.target.value })}
                    className="text-xs h-8 rounded-[4px] border-border bg-background font-mono"
                  />
                </div>
                <Textarea
                  placeholder="Short impact summary (e.g. Built high-concurrency event system serving 50k active users with 99.9% uptime)"
                  value={tempProject.description}
                  onChange={(e) => setTempProject({ ...tempProject, description: e.target.value })}
                  rows={2}
                  className="text-xs rounded-[4px] border-border bg-background resize-none leading-relaxed"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddOrUpdateProject}
                    className="text-xs h-7 px-3 rounded-[4px] font-mono cursor-pointer gap-1"
                  >
                    {editingProjIndex !== null ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    <span>{editingProjIndex !== null ? "Update Project" : "Add Project"}</span>
                  </Button>
                </div>
              </div>

              {/* Added Projects List */}
              {form.projects.length > 0 && (
                <div className="divide-y divide-border/60 rounded-[6px] border border-border bg-card overflow-hidden">
                  {form.projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-3 gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs text-foreground truncate">{proj.name}</p>
                          {proj.stack && (
                            <span className="font-mono text-[10px] text-primary border border-primary/30 bg-primary/5 px-1.5 py-0.2 rounded-[2px]">
                              {proj.stack}
                            </span>
                          )}
                        </div>
                        {proj.description && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                            {proj.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditProject(idx)}
                          className="h-7 w-7 rounded-[4px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                          title="Edit project"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProject(idx)}
                          className="h-7 w-7 rounded-[4px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                          title="Delete project"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </BlueprintCardContent>

          <BlueprintCardFooter className="justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(2)}
              className="text-xs h-8 px-3 rounded-[4px] font-mono cursor-pointer gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveProfile}
              disabled={saving}
              className="text-xs h-8 px-5 rounded-[4px] font-mono cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>{saving ? "Saving Profile..." : "Save & Complete Profile"}</span>
            </Button>
          </BlueprintCardFooter>
        </BlueprintCard>
      </div>
    </PageContainer>
  )
}
