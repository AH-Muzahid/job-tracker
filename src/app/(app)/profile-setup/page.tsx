"use client"

import React, { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  User, Link, Code, Briefcase, BarChart3, Frown, Clock,
  ChevronLeft, ChevronRight, Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const STEPS = [
  { title: "Basic Info", icon: User },
  { title: "Links", icon: Link },
  { title: "Projects", icon: Code },
  { title: "Preferences", icon: Briefcase },
  { title: "Experience", icon: BarChart3 },
  { title: "Weaknesses", icon: Frown },
  { title: "Availability", icon: Clock },
]

export default function ProfileSetupPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    phone: "", location: "", targetRoles: "", workPreference: "",
    salaryExpectation: "", experienceLevel: "", currentStatus: "",
    linkedInUrl: "", githubUrl: "", portfolioUrl: "",
    projects: "",
    strengths: "", weaknesses: "",
    weeklyHours: "", bestDays: "", noticePeriod: "",
    communicationLevel: "", englishLevel: "",
    preferredIndustries: "", preferredCompanies: "",
  })

  useEffect(() => {
    if (isLoaded && !isSignedIn) { router.push("/sign-in"); return }
    if (isLoaded && user) {
      setForm((prev) => ({
        ...prev,
        location: `${user.primaryEmailAddress?.emailAddress || ""}`,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn])

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        phone: form.phone || null,
        location: form.location || null,
        targetRoles: form.targetRoles.split(",").map((s: string) => s.trim()).filter(Boolean),
        workPreference: form.workPreference || null,
        salaryExpectation: form.salaryExpectation || null,
        experienceLevel: form.experienceLevel || null,
        currentStatus: form.currentStatus || null,
        linkedInUrl: form.linkedInUrl || null,
        githubUrl: form.githubUrl || null,
        portfolioUrl: form.portfolioUrl || null,
        bestProjects: form.projects ? form.projects.split("\n").filter(Boolean).map((p: string) => {
          const parts = p.split("|").map((s: string) => s.trim())
          return { name: parts[0] || "", stack: parts[1] || "", description: parts[2] || "" }
        }) : [],
        strengths: form.strengths || null,
        weaknesses: form.weaknesses || null,
        weeklyHours: form.weeklyHours ? parseInt(form.weeklyHours) : null,
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

      if (!res.ok) throw new Error("Failed to save")
      toast.success("Profile saved!")
      router.push("/ai-assistant")
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+880..." />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Dhaka, Bangladesh" />
            </div>
          </div>
        </div>
      )
      case 1: return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input value={form.linkedInUrl} onChange={(e) => update("linkedInUrl", e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="space-y-2">
            <Label>GitHub URL</Label>
            <Input value={form.githubUrl} onChange={(e) => update("githubUrl", e.target.value)} placeholder="https://github.com/..." />
          </div>
          <div className="space-y-2">
            <Label>Portfolio URL</Label>
            <Input value={form.portfolioUrl} onChange={(e) => update("portfolioUrl", e.target.value)} placeholder="https://..." />
          </div>
        </div>
      )
      case 2: return (
        <div className="space-y-2">
          <Label>Best Projects (one per line: Name | Stack | Description)</Label>
          <Textarea
            value={form.projects}
            onChange={(e) => update("projects", e.target.value)}
            placeholder="E-Commerce App | React, Node, MongoDB | Built full-stack with auth and payment&#10;Task Manager | Next.js, Prisma | CRUD app with drag-drop UI"
            className="min-h-[120px]"
          />
        </div>
      )
      case 3: return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Target Roles (comma separated)</Label>
            <Input value={form.targetRoles} onChange={(e) => update("targetRoles", e.target.value)} placeholder="Frontend Developer, React Developer" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Work Preference</Label>
              <Input value={form.workPreference} onChange={(e) => update("workPreference", e.target.value)} placeholder="remote / onsite / hybrid" />
            </div>
            <div className="space-y-2">
              <Label>Salary Expectation</Label>
              <Input value={form.salaryExpectation} onChange={(e) => update("salaryExpectation", e.target.value)} placeholder="e.g. 30k-50k BDT" />
            </div>
          </div>
        </div>
      )
      case 4: return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Input value={form.experienceLevel} onChange={(e) => update("experienceLevel", e.target.value)} placeholder="fresher / junior / career-switcher" />
            </div>
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Input value={form.currentStatus} onChange={(e) => update("currentStatus", e.target.value)} placeholder="actively-looking / employed / studying" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Strengths</Label>
            <Textarea value={form.strengths} onChange={(e) => update("strengths", e.target.value)} placeholder="Your strongest technical and soft skills" />
          </div>
        </div>
      )
      case 5: return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Weaknesses (comma separated)</Label>
            <Input value={form.weaknesses} onChange={(e) => update("weaknesses", e.target.value)} placeholder="DSA, communication, confidence" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Communication Level</Label>
              <Input value={form.communicationLevel} onChange={(e) => update("communicationLevel", e.target.value)} placeholder="beginner / intermediate / fluent" />
            </div>
            <div className="space-y-2">
              <Label>English Level</Label>
              <Input value={form.englishLevel} onChange={(e) => update("englishLevel", e.target.value)} placeholder="beginner / intermediate / advanced" />
            </div>
          </div>
        </div>
      )
      case 6: return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hours per day for job search</Label>
              <Input type="number" value={form.weeklyHours} onChange={(e) => update("weeklyHours", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Best days for deep work</Label>
              <Input value={form.bestDays} onChange={(e) => update("bestDays", e.target.value)} placeholder="Weekdays, Saturday, etc." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notice Period</Label>
            <Input value={form.noticePeriod} onChange={(e) => update("noticePeriod", e.target.value)} placeholder="e.g. 30 days" />
          </div>
          <div className="space-y-2">
            <Label>Preferred Companies / Industries</Label>
            <Input value={form.preferredIndustries} onChange={(e) => update("preferredIndustries", e.target.value)} placeholder="e.g. SaaS, Fintech, Startups" />
          </div>
        </div>
      )
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Profile Setup</h1>
        <p className="text-sm text-muted-foreground mb-4">Complete your profile to get personalized AI assistance</p>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {React.createElement(STEPS[step].icon, { className: "h-3 w-3" })}
          </div>
          <span className="text-sm font-medium">{STEPS[step].title}</span>
          <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save & Continue"}
          </Button>
        )}
      </div>
    </div>
  )
}
