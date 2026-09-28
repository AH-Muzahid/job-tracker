"use client"

import { useEffect, useState } from "react"
import {
  Bot,
  Plus,
  Trash2,
  Check,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react"
import {
  BlueprintCard,
  BlueprintCardHeader,
  BlueprintCardTitle,
  BlueprintCardContent,
} from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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

  // Form dialog state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [profName, setProfName] = useState("")
  const [aiProvider, setAiProvider] = useState<"google" | "openai" | "anthropic" | "custom-openai" | "custom-anthropic">("google")
  const [aiApiKey, setAiApiKey] = useState("")
  const [showKeyText, setShowKeyText] = useState(false)
  const [aiBaseUrl, setAiBaseUrl] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [savingAi, setSavingAi] = useState(false)

  // Testing connection state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})

  // Delete modal state
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<AIProfile | null>(null)

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
    setShowKeyText(false)
    setAiBaseUrl("")
    setAiModel("")
    setShowForm(true)
  }

  function openEditProfileForm(prof: AIProfile) {
    setEditingId(prof.id)
    setProfName(prof.name)
    setAiProvider(prof.providerType)
    setAiApiKey("")
    setShowKeyText(false)
    setAiBaseUrl(prof.baseUrl || "")
    setAiModel(prof.model || "")
    setShowForm(true)
  }

  function applyPreset(provider: "google" | "custom-openai", name: string, baseUrl?: string, model?: string) {
    setAiProvider(provider)
    setProfName(name)
    if (baseUrl) setAiBaseUrl(baseUrl)
    if (model) setAiModel(model)
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
      let message = "Failed to save profile"
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        message = "Network error: Unable to reach the CareerTrack server."
      } else if (err instanceof Error) {
        message = err.message
      }
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

  async function handleDeleteProfileConfirm() {
    if (!deleteProfileTarget) return

    try {
      const res = await fetch(`/api/settings/ai-key?id=${deleteProfileTarget.id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete profile")

      toast.success(`Profile "${deleteProfileTarget.name}" deleted`)
      setDeleteProfileTarget(null)
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
    <>
      <BlueprintCard>
        {/* Crisp Header: Title on left, compact button on right (never full-width) */}
        <BlueprintCardHeader className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 items-center justify-center rounded-[4px] border border-border bg-muted/40 text-foreground shrink-0 shadow-2xs">
              <Bot className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase block leading-none mb-1">
                AI / RUNTIME
              </span>
              <BlueprintCardTitle className="text-sm font-semibold tracking-tight text-foreground truncate">
                AI Key Profiles & Vault
              </BlueprintCardTitle>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={openNewProfileForm}
            className="rounded-[4px] text-xs h-7 px-3 font-medium cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0 transition-colors shadow-2xs"
          >
            <Plus className="size-3.5" />
            <span>Add Key</span>
          </Button>
        </BlueprintCardHeader>

        <BlueprintCardContent className="p-4 sm:p-5">
          {loadingAi ? (
            <div className="space-y-2.5">
              <Skeleton className="h-14 w-full rounded-[6px]" />
              <Skeleton className="h-14 w-full rounded-[6px]" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="border border-dashed border-border rounded-[6px] p-6 sm:p-8 text-center space-y-3 bg-muted/10">
              <Bot className="size-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">No AI Key Profiles Configured</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add a Google Gemini, OpenAI, Anthropic, or OpenRouter key to power tailored resumes, copilot advice, and evaluation.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={openNewProfileForm}
                className="rounded-[4px] text-xs h-7 gap-1.5 cursor-pointer font-medium"
              >
                <Plus className="size-3.5" /> Add Your First Key
              </Button>
            </div>
          ) : (
            /* Flat divided row list (Stripe standard - NO nested boxes) */
            <div className="rounded-[6px] border border-border bg-card overflow-hidden divide-y divide-border">
              {profiles.map((prof) => {
                const isActive = prof.id === activeId
                const testStatus = testResults[prof.id]
                const isTestingThis = testingId === prof.id

                return (
                  <div
                    key={prof.id}
                    className={cn(
                      "p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors",
                      isActive ? "bg-primary/[0.03]" : "hover:bg-muted/15"
                    )}
                  >
                    {/* Left: Identity, Badges & Model Info */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground tracking-tight">
                          {prof.name}
                        </span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            ACTIVE
                          </span>
                        ) : null}
                        <span className="font-mono text-[10px] uppercase border border-border bg-muted/40 px-1.5 py-0.5 rounded-[2px] text-muted-foreground shrink-0">
                          {prof.providerType}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground flex-wrap">
                        <span className="text-foreground/90 font-medium">
                          {prof.model || `Default model for ${prof.providerType}`}
                        </span>
                        {prof.baseUrl && (
                          <>
                            <span className="text-muted-foreground/40">•</span>
                            <span
                              className="truncate max-w-[200px] sm:max-w-[320px] text-muted-foreground/80 hover:text-foreground transition-colors"
                              title={prof.baseUrl}
                            >
                              {prof.baseUrl.replace(/^https?:\/\//, "")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions Toolbar */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {isTestingThis && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground mr-1">
                          <Loader2 className="size-3 animate-spin text-primary" />
                          <span className="hidden sm:inline">Testing...</span>
                        </span>
                      )}
                      {testStatus === true && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 mr-1">
                          <CheckCircle className="size-3" />
                          <span className="hidden sm:inline">Verified</span>
                        </span>
                      )}
                      {testStatus === false && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-destructive mr-1">
                          <XCircle className="size-3" />
                          <span className="hidden sm:inline">Failed</span>
                        </span>
                      )}

                      {!isActive && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-[4px] text-xs h-7 px-2.5 font-medium border-border hover:bg-muted/40 cursor-pointer"
                          onClick={() => switchActiveProfile(prof.id)}
                        >
                          <Check className="size-3 text-primary mr-1" />
                          Set Active
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-[4px] text-xs h-7 px-2.5 font-medium border-border hover:bg-muted/40 cursor-pointer"
                        onClick={() => testConnection(prof.id)}
                        disabled={isTestingThis}
                      >
                        Test
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-[4px] size-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => openEditProfileForm(prof)}
                        title="Edit profile"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-[4px] size-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={() => setDeleteProfileTarget(prof)}
                        title="Delete profile"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </BlueprintCardContent>
      </BlueprintCard>

      {/* Add / Edit Profile Dialog Modal (Clean & uncluttered) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg rounded-[6px] border border-border bg-background p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {editingId ? "Edit AI Profile" : "Register AI Profile Key"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide credentials for your custom LLM provider or self-hosted API gateway.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Presets */}
          {!editingId && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Quick Presets:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset("google", "Google Gemini Flash")}
                  className="px-2 py-1 rounded-[4px] text-[11px] font-mono border border-border bg-muted/30 hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  Gemini
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("custom-openai", "OpenRouter Auto", "https://openrouter.ai/api/v1", "openrouter/auto")}
                  className="px-2 py-1 rounded-[4px] text-[11px] font-mono border border-border bg-muted/30 hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  OpenRouter
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("custom-openai", "Groq LLaMA 3.3", "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile")}
                  className="px-2 py-1 rounded-[4px] text-[11px] font-mono border border-border bg-muted/30 hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  Groq
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("custom-openai", "DeepSeek Chat", "https://api.deepseek.com/v1", "deepseek-chat")}
                  className="px-2 py-1 rounded-[4px] text-[11px] font-mono border border-border bg-muted/30 hover:bg-muted text-foreground cursor-pointer transition-colors"
                >
                  DeepSeek
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Profile Name</Label>
                <Input
                  placeholder="e.g. Primary Gemini, Fast Groq"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="rounded-[4px] text-xs h-8 font-mono border-border bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Provider Type</Label>
                <select
                  className="flex h-8 w-full rounded-[4px] border border-border bg-background px-3 py-1 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as typeof aiProvider)}
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
              <Label className="text-xs font-medium text-foreground">API Key</Label>
              <div className="relative">
                <Input
                  type={showKeyText ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={editingId ? "•••••••••• (leave blank to keep unchanged)" : "sk-... or AIzaSy..."}
                  className="rounded-[4px] text-xs h-8 font-mono border-border bg-background pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showKeyText ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {(aiProvider === "custom-openai" || aiProvider === "custom-anthropic") && (
              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Base URL</Label>
                  <Input
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder={
                      aiProvider === "custom-anthropic"
                        ? "https://your-anthropic-proxy.com/v1"
                        : "https://api.openrouter.ai/v1"
                    }
                    className="rounded-[4px] text-xs h-8 font-mono border-border bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Model Name</Label>
                  <Input
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder={
                      aiProvider === "custom-anthropic"
                        ? "claude-3-5-sonnet-20241022"
                        : "openrouter/auto"
                    }
                    className="rounded-[4px] text-xs h-8 font-mono border-border bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              className="rounded-[4px] text-xs h-8 px-3 font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveProfile}
              disabled={savingAi}
              className="rounded-[4px] text-xs h-8 px-4 font-medium cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
            >
              {savingAi ? "Saving..." : editingId ? "Update Profile" : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteProfileTarget)} onOpenChange={(open) => !open && setDeleteProfileTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-[6px] border border-border bg-background p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 pb-2">
              <div className="size-8 rounded-[4px] bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground">Delete AI Profile</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to remove &quot;{deleteProfileTarget?.name}&quot;?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This will permanently remove the associated API key from your secure vault. Applications actively using this provider may fail unless another is active.
          </p>
          <DialogFooter className="pt-3 gap-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteProfileTarget(null)}
              className="rounded-[4px] text-xs h-8 px-3 font-medium cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteProfileConfirm}
              className="rounded-[4px] text-xs h-8 px-3.5 font-medium cursor-pointer"
            >
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
