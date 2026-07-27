"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  User, Link, Code, Briefcase, BarChart3, Frown, Clock,
  ChevronLeft, ChevronRight, Save, Trash2, Plus, Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableTagsInput } from "@/components/profile-setup/SearchableTagsInput"

const POPULAR_STACKS = [
  // Frontend & Mobile
  "React", "Next.js", "TypeScript", "JavaScript", "Vue.js", "Svelte", "Angular", "HTML5", "CSS3",
  "TailwindCSS", "Redux", "Zustand", "React Query", "Shadcn UI", "Radix UI", "Framer Motion",
  "React Native", "Flutter", "Swift", "Kotlin", "Dart",
  // Backend & APIs
  "Node.js", "Express.js", "NestJS", "Python", "Django", "FastAPI", "Flask", "Go", "Rust",
  "Ruby on Rails", "Spring Boot", "ASP.NET Core", "Laravel", "GraphQL", "gRPC", "REST API",
  // Databases & ORMs
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "DynamoDB", "Supabase", "Firebase",
  "Prisma", "Drizzle ORM", "Mongoose", "Elasticsearch",
  // DevOps & Cloud
  "Docker", "Kubernetes", "AWS", "Google Cloud (GCP)", "Azure", "Terraform", "GitHub Actions",
  "GitLab CI", "CI/CD", "Nginx", "Vercel", "Netlify",
  // AI & Data Science
  "OpenAI API", "LangChain", "PyTorch", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn",
  // Programming Languages
  "C++", "Java", "C#", "PHP", "Ruby", "Scala", "Shell Scripting"
]

const POPULAR_ROLES = [
  "Frontend Developer", "Backend Developer", "Fullstack Developer", 
  "Software Engineer", "Senior Software Engineer", "React Developer", 
  "Node.js Developer", "Python Developer", "Go Developer",
  "Mobile App Developer (iOS/Android)", "DevOps Engineer", "Cloud Engineer", 
  "System Administrator", "Database Administrator", "Site Reliability Engineer (SRE)",
  "QA Engineer", "Automation Test Engineer", "Security Engineer",
  "Data Scientist", "Data Engineer", "Machine Learning Engineer", "AI Engineer",
  "Product Manager", "Project Manager", "Scrum Master", "Agile Coach",
  "UI/UX Designer", "Product Designer", "Graphic Designer",
  "Technical Writer", "Developer Advocate", "Solutions Architect"
]

const POPULAR_STRENGTHS = [
  // Core Technical
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Python", "SQL", "Git", 
  "API Design & Development", "System Design", "Database Design & Optimization",
  "Clean Code & Refactoring", "Microservices Architecture", "Cloud Infrastructure (AWS/GCP)",
  "CI/CD & DevOps Automation", "Unit & Integration Testing", "Performance Optimization",
  "Responsive Web Design", "State Management", "Mobile App Development",
  // Problem Solving & Methodology
  "Data Structures & Algorithms", "Debugging & Troubleshooting", "Agile & Scrum Methodologies",
  "Problem Solving", "Logical Reasoning", "Analytical Thinking",
  // Interpersonal & Soft Skills
  "Team Collaboration", "Technical Mentorship", "Effective Communication", "Fast Learner",
  "Adaptability & Flexibility", "Self-Motivation", "Time Management", "Project Ownership"
]

const POPULAR_WEAKNESSES = [
  // Interpersonal & Communication
  "Public Speaking & Presenting", "Giving Constructive Feedback", "Asking for Help Early",
  "Networking & Building Connections", "Written Communication (Briefness)", "Negotiation Skills",
  "Dealing with Ambiguity", "Sharing Unfinished Work Early",
  
  // Professional Habits & Self-Management
  "Delegating Tasks", "Saying 'No' (Over-committing)", "Imposter Syndrome / Self-Doubt",
  "Work-Life Balance Management", "Perfectionism (Detail Obsession)", "Estimating Project Timelines",
  "Impatience with Slow Processes", "Handling Negative Feedback", "Multitasking Under Pressure",
  
  // Technical/Engineering Growth Areas (Minimal)
  "System Design & Scalability", "Testing / TDD (Test-Driven Development)", "UI/UX Design & Typography",
  "Legacy Codebase Refactoring", "Technical Documentation"
]

const POPULAR_DAYS = [
  "Weekdays", "Weekends", "Saturday", "Sunday", "Monday", 
  "Tuesday", "Wednesday", "Thursday", "Friday"
]

const POPULAR_INDUSTRIES = [
  "SaaS (Software as a Service)", "Fintech (Financial Technology)", "AI / Machine Learning",
  "E-commerce & Retail", "Healthcare & Medtech", "Edtech (Educational Technology)", 
  "Web3 & Blockchain", "E-learning", "Cybersecurity", "Cloud Computing & Infrastructure",
  "Agile Product Development", "Mobile App Development", "Startups & Venture Capital",
  "Adtech (Advertising Technology)", "Proptech (Property Technology)", "Logistics & Supply Chain",
  "Travel & Hospitality", "Gaming & Entertainment", "Social Media & Networking",
  "Data Analytics & Business Intelligence", "Internet of Things (IoT)", "Telecommunications",
  "Enterprise Software", "Non-Profit & Social Impact", "Human Resources (HR) Tech"
]

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
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [tempProject, setTempProject] = useState({ name: "", stack: "", description: "" })
  const [selectedStacks, setSelectedStacks] = useState<string[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [form, setForm] = useState({
    phone: "", location: "", targetRoles: "", workPreference: "",
    salaryExpectation: "", experienceLevel: "", currentStatus: "",
    linkedInUrl: "", githubUrl: "", portfolioUrl: "",
    projects: [] as { name: string; stack: string; description: string }[],
    strengths: "", weaknesses: "",
    weeklyHours: "", bestDays: "", noticePeriod: "",
    communicationLevel: "", englishLevel: "",
    preferredIndustries: "", preferredCompanies: "",
  })

  useEffect(() => {
    if (isLoaded && !isSignedIn) { router.push("/sign-in"); return }
    if (isLoaded && isSignedIn && !profileLoaded) {
      setProfileLoaded(true)
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.userId) {
            setForm({
              phone: data.phone || "",
              location: data.location || "",
              targetRoles: Array.isArray(data.targetRoles) ? data.targetRoles.join(", ") : "",
              workPreference: data.workPreference || "",
              salaryExpectation: data.salaryExpectation || "",
              experienceLevel: data.experienceLevel || "",
              currentStatus: data.currentStatus || "",
              linkedInUrl: data.linkedInUrl || "",
              githubUrl: data.githubUrl || "",
              portfolioUrl: data.portfolioUrl || "",
              projects: Array.isArray(data.bestProjects) ? data.bestProjects : [],
              strengths: data.strengths || "",
              weaknesses: data.weaknesses || "",
              weeklyHours: data.weeklyHours !== null && data.weeklyHours !== undefined ? String(data.weeklyHours) : "",
              bestDays: data.bestDays || "",
              noticePeriod: data.noticePeriod || "",
              communicationLevel: data.communicationLevel || "",
              englishLevel: data.englishLevel || "",
              preferredIndustries: data.preferredIndustries || "",
              preferredCompanies: data.preferredCompanies || "",
            })
          }
        })
        .catch((err) => {
          console.error("Error fetching profile:", err)
          setProfileLoaded(false) // retry on error
        })
        .finally(() => {
          setLoadingProfile(false)
        })
    } else if (isLoaded && !isSignedIn) {
      setLoadingProfile(false)
    }
  }, [isLoaded, isSignedIn, profileLoaded, router])

  useEffect(() => {
    router.prefetch("/ai-assistant")
  }, [router])

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
        bestProjects: form.projects || [],
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

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
      case 2: {
        const projectList = form.projects || []
        
        const handleStartEdit = (idx: number) => {
          const proj = projectList[idx]
          setTempProject({
            name: proj.name,
            stack: proj.stack,
            description: proj.description
          })
          setSelectedStacks(proj.stack ? proj.stack.split(", ").filter(Boolean) : [])
          setEditingIndex(idx)
        }

        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-foreground">Best Projects</Label>
              <p className="text-xs text-muted-foreground">Add the key personal or professional projects you&apos;d like to show off.</p>
            </div>

            {/* List of current projects */}
            {projectList.length > 0 && (
              <div className="space-y-3">
                {projectList.map((proj, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{proj.name}</span>
                        {proj.stack && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {proj.stack.split(", ").map((tech, i) => (
                              <span key={i} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded font-mono border border-border">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{proj.description}</p>
                    </div>
                    
                    <div className="flex gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        type="button"
                        onClick={() => handleStartEdit(idx)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        type="button"
                        onClick={() => {
                          const updated = projectList.filter((_, i) => i !== idx)
                          setForm(prev => ({ ...prev, projects: updated }))
                          if (editingIndex === idx) {
                            setEditingIndex(null)
                            setTempProject({ name: "", stack: "", description: "" })
                            setSelectedStacks([])
                          }
                        }}
                        className="h-7 w-7 text-rose-500 hover:text-rose-455 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Project Form inline (capped at 3 unless editing) */}
            {projectList.length >= 3 && editingIndex === null ? (
              <div className="p-4 rounded-lg border border-amber-550/10 bg-amber-500/5 text-center text-xs text-amber-600 dark:text-amber-455 font-semibold">
                Maximum of 3 best projects reached. Delete an existing project to add a new one.
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {editingIndex !== null ? "Edit Project Details" : `Add New Project (${projectList.length}/3)`}
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="projName" className="text-xs text-slate-650 dark:text-slate-300">Project Name</Label>
                    <Input 
                      id="projName" 
                      placeholder="e.g. Portfolio Website" 
                      className="h-9 text-xs bg-background border-input text-foreground" 
                      value={tempProject.name}
                      onChange={(e) => setTempProject(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  
                  {/* Searchable Stack Selection */}
                  <SearchableTagsInput
                    id="project-tech-stack"
                    label="Tech Stack"
                    placeholder="Search or type tech..."
                    popularItems={POPULAR_STACKS}
                    value={selectedStacks.join(", ")}
                    onChange={(val) => setSelectedStacks(val ? val.split(", ") : [])}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="projDesc" className="text-xs text-slate-655 dark:text-slate-300">Description</Label>
                  <Textarea 
                    id="projDesc" 
                    placeholder="Describe what you built and any key features..." 
                    className="min-h-[80px] text-xs bg-background border border-input rounded-lg p-3 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 focus:border-primary transition-all resize-none outline-none"
                    value={tempProject.description}
                    onChange={(e) => setTempProject(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {editingIndex !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingIndex(null)
                        setTempProject({ name: "", stack: "", description: "" })
                        setSelectedStacks([])
                      }}
                      className="h-8 text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (!tempProject.name.trim()) {
                        toast.error("Project Name is required")
                        return
                      }
                      
                      const newProject = {
                        name: tempProject.name,
                        stack: selectedStacks.join(", "),
                        description: tempProject.description
                      }

                      if (editingIndex !== null) {
                        const updated = [...projectList]
                        updated[editingIndex] = newProject
                        setForm(prev => ({ ...prev, projects: updated }))
                        setEditingIndex(null)
                        toast.success("Project updated successfully!")
                      } else {
                        setForm(prev => ({ 
                          ...prev, 
                          projects: [...projectList, newProject]
                        }))
                        toast.success("Project added to list!")
                      }
                      
                      setTempProject({ name: "", stack: "", description: "" })
                      setSelectedStacks([])
                    }}
                    className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
                  >
                    {editingIndex !== null ? "Update Project" : <><Plus className="h-3 w-3 mr-1" /> Add Project</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      }
      case 3: return (
        <div className="space-y-4">
          <SearchableTagsInput
            id="target-roles"
            label="Target Roles"
            placeholder="Search or type roles (e.g. Frontend Developer)..."
            popularItems={POPULAR_ROLES}
            value={form.targetRoles}
            onChange={(val) => update("targetRoles", val)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Work Preference</Label>
              <Select value={form.workPreference} onValueChange={(val) => update("workPreference", val)}>
                <SelectTrigger className="bg-background border-input text-xs text-foreground h-10">
                  <SelectValue placeholder="Select preference..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {["Remote", "Onsite", "Hybrid"].map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={form.experienceLevel} onValueChange={(val) => update("experienceLevel", val)}>
                <SelectTrigger className="bg-background border-input text-xs text-foreground h-10">
                  <SelectValue placeholder="Select experience..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {["Fresher", "Junior", "Mid-level", "Senior", "Career-switcher"].map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Select value={form.currentStatus} onValueChange={(val) => update("currentStatus", val)}>
                <SelectTrigger className="bg-background border-input text-xs text-foreground h-10">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {["Actively-looking", "Employed", "Studying", "Not-looking"].map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SearchableTagsInput
            id="strengths-selection"
            label="Strengths"
            placeholder="Search or type strengths (e.g. React)..."
            popularItems={POPULAR_STRENGTHS}
            value={form.strengths}
            onChange={(val) => update("strengths", val)}
          />
        </div>
      )
      case 5: return (
        <div className="space-y-4">
          <SearchableTagsInput
            id="weaknesses-selection"
            label="Weaknesses"
            placeholder="Search or type weaknesses (e.g. DSA)..."
            popularItems={POPULAR_WEAKNESSES}
            value={form.weaknesses}
            onChange={(val) => update("weaknesses", val)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Communication Level</Label>
              <Select value={form.communicationLevel} onValueChange={(val) => update("communicationLevel", val)}>
                <SelectTrigger className="bg-background border-input text-xs text-foreground h-10">
                  <SelectValue placeholder="Select level..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {["Beginner", "Intermediate", "Fluent"].map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>English Level</Label>
              <Select value={form.englishLevel} onValueChange={(val) => update("englishLevel", val)}>
                <SelectTrigger className="bg-background border-input text-xs text-foreground h-10">
                  <SelectValue placeholder="Select level..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                  {["Beginner", "Intermediate", "Advanced", "Fluent"].map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <SearchableTagsInput
              id="best-days"
              label="Best days for deep work"
              placeholder="Search or type days (e.g. Weekdays)..."
              popularItems={POPULAR_DAYS}
              value={form.bestDays}
              onChange={(val) => update("bestDays", val)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notice Period</Label>
            <Select value={form.noticePeriod} onValueChange={(val) => update("noticePeriod", val)}>
              <SelectTrigger className="bg-background border-input text-xs text-foreground h-10">
                <SelectValue placeholder="Select notice period..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                {["Immediate", "15 days", "30 days", "60 days", "90 days"].map((s) => (
                  <SelectItem key={s} value={s.toLowerCase()} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SearchableTagsInput
            id="preferred-industries"
            label="Preferred Companies / Industries"
            placeholder="Search or type industries (e.g. SaaS)..."
            popularItems={POPULAR_INDUSTRIES}
            value={form.preferredIndustries}
            onChange={(val) => update("preferredIndustries", val)}
          />
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
        <CardContent className="p-6">
          {!isLoaded || (isSignedIn && loadingProfile) ? (
            <div className="space-y-5 animate-pulse py-2">
              <div className="h-4 bg-secondary rounded w-1/3" />
              <div className="space-y-3 pt-2">
                <div className="h-10 bg-secondary/80 rounded-lg" />
                <div className="h-20 bg-secondary/85 rounded-lg" />
              </div>
            </div>
          ) : (
            renderStep()
          )}
        </CardContent>
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
