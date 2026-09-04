"use client"

import { useEffect, useState } from "react"
import {
  Bot,
  Plus,
  Trash2,
  Zap,
  Check,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export interface AIProfile {
  id: string
  name: string
  providerType: "openai" | "anthropic" | "google" | "custom-openai" | "custom-anthropic"
  baseUrl?: string
  model?: string
  hasKey: boolean
}

export interface AIConfigCardProps {
  initialData?: { activeId: string | null; profiles: AIProfile[] } | null
  isLoading?: boolean
}

export function AIConfigCard({ initialData, isLoading = false }: AIConfigCardProps) {
  const [profiles, setProfiles] = useState<AIProfile[]>(initialData?.profiles || [])
  const [activeId, setActiveId] = useState<string | null>(initialData?.activeId || null)
  const [loadingAi, setLoadingAi] = useState(isLoading && !initialData)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [profName, setProfName] = useState("")
  const [aiProvider, setAiProvider] = useState("google")
  const [aiApiKey, setAiApiKey] = useState("")
  const [aiBaseUrl, setAiBaseUrl] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [savingAi, setSavingAi] = useState(false)

  // Testing connection state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})

  useEffect(() => {
    if (initialData) {
      setProfiles(initialData.profiles || [])
      setActiveId(initialData.activeId || null)
      setLoadingAi(false)
    }
  }, [initialData])

  useEffect(() => {
    if (!initialData) {
      loadAiConfig()
    }
  }, [initialData])

  async function loadAiConfig() {
    setLoadingAi(true)
    try {
      const res = await fetch("/api/settings/ai-key")
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles || [])
        setActiveId(data.activeId || null)
      }
    } catch {
      toast.error("Failed to load AI configurations")
    } finally {
      setLoadingAi(false)
    }
  }

  function openNewProfileForm() {
    setEditingId(null)
    setProfName("")
    setAiProvider("google")
    setAiApiKey("")
    setAiBaseUrl("")
    setAiModel("")
    setShowForm(true)
  }

  function openEditProfileForm(prof: AIProfile) {
    setEditingId(prof.id)
    setProfName(prof.name)
    setAiProvider(prof.providerType)
    setAiApiKey("")
    setAiBaseUrl(prof.baseUrl || "")
    setAiModel(prof.model || "")
    setShowForm(true)
  }

  async function saveProfile() {
    if (!profName.trim()) {
      toast.error("Please enter a profile name")
      return
    }

    if (!editingId && !aiApiKey.trim()) {
      toast.error("API Key is required for new profile")
      return
    }

    setSavingAi(true)
    try {
      const isCustom = aiProvider === "custom-openai" || aiProvider === "custom-anthropic"
      const res = await fetch("/api/settings/ai-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          name: profName.trim(),
          providerType: aiProvider,
          apiKey: aiApiKey || undefined,
          baseUrl: isCustom ? aiBaseUrl || undefined : undefined,
          model: isCustom ? aiModel || undefined : undefined,
          makeActive: !activeId || !editingId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save profile")
      }

      toast.success("AI Profile saved successfully")
      setShowForm(false)
      loadAiConfig()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile"
      toast.error(message)
    } finally {
      setSavingAi(false)
    }
  }

  async function switchActiveProfile(id: string) {
    try {
      const res = await fetch("/api/settings/ai-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeId: id }),
      })

      if (!res.ok) throw new Error("Failed to switch profile")

      setActiveId(id)
      toast.success("Active AI provider switched")
    } catch {
      toast.error("Failed to switch active profile")
    }
  }

  async function deleteProfile(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete profile "${name}"?`)) return

    try {
      const res = await fetch(`/api/settings/ai-key?id=${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete profile")

      toast.success(`Profile "${name}" deleted`)
      loadAiConfig()
    } catch {
      toast.error("Failed to delete profile")
    }
  }

  async function testConnection(id: string) {
    setTestingId(id)
    setTestResults((prev) => ({ ...prev, [id]: null }))

    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: id }),
      })
      const data = await res.json()
      setTestResults((prev) => ({ ...prev, [id]: data.ok === true }))
      if (data.ok) {
        toast.success("Connection test successful!")
      } else {
        toast.error(data.error || "Connection failed. Check API key & parameters.")
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: false }))
      toast.error("Failed to test connection")
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="relative rounded-none border border-border bg-card/60 backdrop-blur-xl p-4 sm:p-6 transition-colors">
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/70 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-muted/40 text-foreground shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">AI / RUNTIME</span>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">AI Key Profiles & Vault</h3>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={openNewProfileForm}
          className="rounded-none font-mono text-xs h-8 px-3.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 w-full sm:w-auto justify-center"
        >
          <Plus className="h-3.5 w-3.5" /> Add Profile Key
        </Button>
      </div>

      <div className="space-y-4 pt-4">
        {loadingAi ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-none" />
            <Skeleton className="h-14 w-full rounded-none" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="border border-dashed border-border rounded-none p-6 sm:p-8 text-center space-y-3 bg-muted/10">
            <Bot className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">No AI Key Profiles Configured</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add a Google Gemini, OpenAI, or Anthropic key to power AI assistance, tailored resumes, and auto-matching.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openNewProfileForm}
              className="rounded-none font-mono text-xs h-8 gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <Plus className="h-3.5 w-3.5" /> Add Your First Key
            </Button>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {profiles.map((prof) => {
              const isActive = prof.id === activeId
              const testStatus = testResults[prof.id]
              const isTestingThis = testingId === prof.id

              return (
                <div
                  key={prof.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-none border transition-all gap-2 ${
                    isActive
                      ? "border-primary/50 bg-primary/5 shadow-xs"
                      : "border-border bg-card/40 hover:border-border/80"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">{prof.name}</span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase border border-primary/40 bg-primary/10 text-primary px-1.5 py-0.5 rounded-none shrink-0">
                          <Zap className="h-3 w-3 fill-current" /> Active
                        </span>
                      )}
                      <span className="font-mono text-[10px] uppercase border border-border bg-muted/40 px-1.5 py-0.5 rounded-none text-muted-foreground shrink-0">
                        {prof.providerType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {prof.model ? `Model: ${prof.model}` : `Default model for ${prof.providerType}`}
                      {prof.baseUrl && ` • ${prof.baseUrl}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-start sm:justify-end shrink-0">
                    {isTestingThis ? (
                      <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing...
                      </span>
                    ) : testStatus === true ? (
                      <span className="flex items-center gap-1 font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : testStatus === false ? (
                      <span className="flex items-center gap-1 font-mono text-xs text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    ) : null}

                    {!isActive && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="rounded-none font-mono text-xs h-7 px-2.5 gap-1 cursor-pointer"
                        onClick={() => switchActiveProfile(prof.id)}
                      >
                        <Check className="h-3 w-3" /> Set Active
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-none font-mono text-xs h-7 px-2.5 gap-1 cursor-pointer"
                      onClick={() => testConnection(prof.id)}
                      disabled={isTestingThis}
                    >
                      {isTestingThis ? "Testing..." : "Test"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-none h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => openEditProfileForm(prof)}
                      title="Edit profile"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-none h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={() => deleteProfile(prof.id, prof.name)}
                      title="Delete profile"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showForm && (
          <div className="mt-4 p-4 border border-border rounded-none bg-muted/20 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h4 className="font-semibold text-xs font-mono uppercase tracking-wider text-foreground">
                {editingId ? "Edit AI Profile" : "Register AI Profile Key"}
              </h4>
              <button
                type="button"
                className="h-6 w-6 inline-flex items-center justify-center font-mono text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-foreground">Profile Name</Label>
                <Input
                  placeholder="e.g. Primary Gemini, Fast Groq"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="rounded-none text-xs h-8 font-mono border-border bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-foreground">Provider Type</Label>
                <select
                  className="flex h-8 w-full rounded-none border border-border bg-background px-3 py-1 font-mono text-xs text-foreground shadow-none focus:outline-none"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                >
                  <option value="google">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="custom-openai">Custom (OpenAI-compatible)</option>
                  <option value="custom-anthropic">Custom (Anthropic-compatible)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-foreground">API Key</Label>
              <Input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder={editingId ? "•••••••••• (leave blank to keep unchanged)" : "sk-... or AIzaSy..."}
                className="rounded-none text-xs h-8 font-mono border-border bg-background"
              />
            </div>

            {(aiProvider === "custom-openai" || aiProvider === "custom-anthropic") && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-foreground">Base URL</Label>
                  <Input
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder={
                      aiProvider === "custom-anthropic"
                        ? "https://your-anthropic-proxy.com/v1"
                        : "https://api.openrouter.ai/v1"
                    }
                    className="rounded-none text-xs h-8 font-mono border-border bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-foreground">Model Name</Label>
                  <Input
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder={
                      aiProvider === "custom-anthropic"
                        ? "claude-3-5-sonnet-20241022"
                        : "google/gemini-2.0-flash-exp:free or openrouter/auto"
                    }
                    className="rounded-none text-xs h-8 font-mono border-border bg-background"
                  />
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Examples: <code className="bg-muted px-1 py-0.5 border border-border">openrouter/auto</code>, <code className="bg-muted px-1 py-0.5 border border-border">google/gemini-2.0-flash-exp:free</code>
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 justify-end pt-2 border-t border-border/40">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="rounded-none font-mono text-xs h-8 px-3 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveProfile}
                disabled={savingAi}
                className="rounded-none font-mono text-xs h-8 px-4 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {savingAi ? "Saving..." : editingId ? "Update Profile" : "Save Profile"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
