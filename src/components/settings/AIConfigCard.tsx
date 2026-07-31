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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

export function AIConfigCard() {
  const [profiles, setProfiles] = useState<AIProfile[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(true)

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
    loadAiConfig()
  }, [])

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
    if (id !== activeId) {
      await switchActiveProfile(id)
    }

    setTestingId(id)
    setTestResults((prev) => ({ ...prev, [id]: null }))

    try {
      const res = await fetch("/api/ai/test-connection", { method: "POST" })
      const data = await res.json()
      setTestResults((prev) => ({ ...prev, [id]: data.ok === true }))
      if (data.ok) {
        toast.success("Connection test successful!")
      } else {
        toast.error("Connection failed. Check API key & parameters.")
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: false }))
      toast.error("Failed to test connection")
    } finally {
      setTestingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> AI Key Profiles
          </CardTitle>
          <CardDescription className="text-xs mt-1">
            Add multiple AI Provider keys and switch between them instantly when rate limits occur.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openNewProfileForm} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Key
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loadingAi ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center space-y-3">
            <Bot className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">No AI Profiles Configured</p>
              <p className="text-xs text-muted-foreground">Add a Google Gemini, OpenAI, or Anthropic key to power AI features.</p>
            </div>
            <Button size="sm" variant="outline" onClick={openNewProfileForm} className="gap-1">
              <Plus className="h-4 w-4" /> Add your first key
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {profiles.map((prof) => {
              const isActive = prof.id === activeId
              const testStatus = testResults[prof.id]
              const isTestingThis = testingId === prof.id

              return (
                <div
                  key={prof.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border transition-all ${
                    isActive
                      ? "border-primary/30 dark:border-primary/25 bg-primary/5 dark:bg-primary/10 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="space-y-1 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{prof.name}</span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          <Zap className="h-3 w-3 fill-current" /> Active
                        </span>
                      )}
                      <span className="text-[11px] font-mono uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {prof.providerType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {prof.model ? `Model: ${prof.model}` : `Default model for ${prof.providerType}`}
                      {prof.baseUrl && ` • ${prof.baseUrl}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isTestingThis ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing...
                      </span>
                    ) : testStatus === true ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" /> Working
                      </span>
                    ) : testStatus === false ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    ) : null}

                    {!isActive && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs gap-1"
                        onClick={() => switchActiveProfile(prof.id)}
                      >
                        <Check className="h-3.5 w-3.5" /> Switch Active
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => testConnection(prof.id)}
                      disabled={isTestingThis}
                    >
                      {isTestingThis ? "Testing..." : "Test"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditProfileForm(prof)}
                      title="Edit profile"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteProfile(prof.id, prof.name)}
                      title="Delete profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showForm && (
          <div className="mt-4 p-4 border rounded-lg bg-card/80 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-sm">
                {editingId ? "Edit AI Profile" : "Add New AI Profile"}
              </h4>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={() => setShowForm(false)}
              >
                ✕
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Profile Name</Label>
                <Input
                  placeholder="e.g. Primary Gemini, Backup DeepSeek"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Provider Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
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

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder={editingId ? "•••••••••• (leave blank to keep unchanged)" : "sk-... or AIzaSy..."}
              />
            </div>

            {(aiProvider === "custom-openai" || aiProvider === "custom-anthropic") && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder={
                      aiProvider === "custom-anthropic"
                        ? "https://your-anthropic-proxy.com/v1"
                        : "https://api.openrouter.ai/v1"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder={
                      aiProvider === "custom-anthropic"
                        ? "claude-3-5-sonnet-20241022"
                        : "deepseek/deepseek-chat"
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveProfile} disabled={savingAi}>
                {savingAi ? "Saving..." : editingId ? "Update Profile" : "Save Profile"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
