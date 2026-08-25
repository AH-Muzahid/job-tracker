"use client"

import React, { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableTagsInput } from "@/components/profile-setup/SearchableTagsInput"
import { Skeleton } from "@/components/ui/skeleton"

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
  { id: 1, title: "Resume & Contact", description: "Upload resume to autofill details" },
  { id: 2, title: "Career Goals", description: "Target roles, salary & work mode" },
  { id: 3, title: "Skills & Experience", description: "Technical strengths & projects" },
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
                linkedInUrl: data.linkedInUrl || "",
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
      return () => { isMounted = false }
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

  function handleRemoveProject(index: number) {
    setForm({
      ...form,
      projects: form.projects.filter((_, i) => i !== index),
    })
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
      <div className="max-w-3xl mx-auto space-y-6 py-4 sm:py-6 px-3 sm:px-6 pb-16 w-full min-w-0">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-4 w-96 max-w-full rounded-sm" />
        </div>
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-muted/60 border border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg">
              <Skeleton className="size-5 rounded-full shrink-0" />
              <Skeleton className="h-3 w-20 rounded-sm hidden sm:block" />
            </div>
          ))}
        </div>
        <div className="p-6 rounded-xl border border-border bg-card space-y-5">
          <div className="space-y-1.5 pb-4 border-b border-border">
            <Skeleton className="h-5 w-40 rounded-sm" />
            <Skeleton className="h-3.5 w-64 rounded-sm" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4 sm:py-6 px-3 sm:px-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile Setup</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Autofill from your resume or customize your career targets for personalized AI job matching.
        </p>
      </div>

      {/* 3-Step Wizard Navigation */}
      <nav aria-label="Profile setup steps" className="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-muted/60 border border-border">
        {WIZARD_STEPS.map((s) => {
          const isActive = step === s.id
          const isDone = step > s.id

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              aria-current={isActive ? "step" : undefined}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 sm:p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-background text-foreground shadow-xs border border-border/80 font-semibold"
                  : isDone
                  ? "text-foreground/80 hover:bg-background/50 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/30"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {isDone ? "✓" : s.id}
              </span>
              <div className="min-w-0">
                <p className="text-xs leading-none truncate">{s.title}</p>
                <p className="hidden sm:block text-[10px] text-muted-foreground truncate mt-0.5">
                  {s.description}
                </p>
              </div>
            </button>
          )
        })}
      </nav>

      {/* STEP 1: RESUME AUTOFILL & CONTACT */}
      {step === 1 && (
        <Card className="rounded-xl border border-border bg-card shadow-2xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              1. Resume Extraction & Contact Details
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Upload your resume or select an existing one to automatically extract phone, location, links, and skills.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Resume Upload & Extract Box */}
            <div className="p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    ⚡ Smart Resume Autofill
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Upload a PDF resume to populate 80% of this form automatically.
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
                    className="text-xs h-8 cursor-pointer font-medium"
                  >
                    {extracting ? "Extracting..." : "Upload New PDF"}
                  </Button>

                  {existingResumes.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleExtractResume(undefined, selectedResumeId)}
                      disabled={extracting}
                      className="text-xs h-8 cursor-pointer font-medium"
                    >
                      {extracting ? "Extracting..." : "Extract from Saved Resume"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Extraction Badges */}
              {extractedFields.length > 0 && (
                <div className="pt-2 border-t border-primary/20">
                  <p className="text-[11px] font-medium text-primary mb-1">
                    ✓ Autofilled from Resume:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedFields.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded-md bg-background border border-primary/30 text-primary text-[10px] font-medium"
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
                  placeholder="+880 1700 000000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs font-medium text-foreground">
                  Current Location
                </Label>
                <Input
                  id="location"
                  placeholder="Dhaka, Bangladesh / Remote"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Social & Portfolio Links */}
            <div className="space-y-3 pt-2 border-t border-border">
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
                    className="text-xs h-8 font-mono text-[11px]"
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
                    className="text-xs h-8 font-mono text-[11px]"
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
                    className="text-xs h-8 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs h-8 px-4 cursor-pointer font-medium"
              >
                Continue to Career Goals
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: CAREER GOALS & PREFERENCES */}
      {step === 2 && (
        <Card className="rounded-xl border border-border bg-card shadow-2xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              2. Target Career & Work Preferences
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Set the job titles, work arrangements, and compensation expectations you are targeting.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
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
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select work mode" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
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
                  placeholder="e.g. $80k - $100k / BDT 150k"
                  value={form.salaryExpectation}
                  onChange={(e) => setForm({ ...form, salaryExpectation: e.target.value })}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notice" className="text-xs font-medium text-foreground">
                  Notice Period / Availability
                </Label>
                <Input
                  id="notice"
                  placeholder="e.g. Immediate / 1 Month"
                  value={form.noticePeriod}
                  onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                  className="text-xs h-8"
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

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="text-xs h-8 px-4 cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs h-8 px-4 cursor-pointer font-medium"
              >
                Continue to Skills & Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: SKILLS, AI DRILLS & PROJECTS */}
      {step === 3 && (
        <Card className="rounded-xl border border-border bg-card shadow-2xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-foreground">
              3. Technical Skills, Projects & AI Focus
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Help the AI assistant highlight your strengths in resume tailoring and target weak areas in mock interviews.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
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
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Top Highlight Projects</p>
                  <p className="text-[11px] text-muted-foreground">
                    Featured in AI resume tailoring and interview talking points.
                  </p>
                </div>
              </div>

              {/* Add Project Sub-form */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Project Name (e.g. Real-time Job Tracker)"
                    value={tempProject.name}
                    onChange={(e) => setTempProject({ ...tempProject, name: e.target.value })}
                    className="text-xs h-8 bg-background"
                  />
                  <Input
                    placeholder="Tech Stack (e.g. Next.js, Go, PostgreSQL)"
                    value={tempProject.stack}
                    onChange={(e) => setTempProject({ ...tempProject, stack: e.target.value })}
                    className="text-xs h-8 bg-background"
                  />
                </div>
                <Textarea
                  placeholder="Short impact summary (e.g. Built high-concurrency event system serving 50k users)"
                  value={tempProject.description}
                  onChange={(e) => setTempProject({ ...tempProject, description: e.target.value })}
                  rows={2}
                  className="text-xs bg-background resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddOrUpdateProject}
                    className="text-xs h-7 cursor-pointer"
                  >
                    {editingProjIndex !== null ? "Update Project" : "Add Project"}
                  </Button>
                </div>
              </div>

              {/* Added Projects List */}
              {form.projects.length > 0 && (
                <div className="space-y-2">
                  {form.projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-2.5 rounded-lg border border-border bg-card text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">{proj.name}</p>
                        {proj.stack && <p className="text-[11px] text-primary font-mono">{proj.stack}</p>}
                        {proj.description && <p className="text-[11px] text-muted-foreground">{proj.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(idx)}
                        className="text-muted-foreground hover:text-destructive text-xs cursor-pointer p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="text-xs h-8 px-4 cursor-pointer"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="text-xs h-8 px-5 cursor-pointer font-medium"
              >
                {saving ? "Saving..." : "Save & Complete Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
