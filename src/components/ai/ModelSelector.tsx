"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  Sparkles,
  Cpu,
  Bot,
  Zap,
  Check,
  ChevronDown,
  Settings as SettingsIcon,
  Search,
  RefreshCw,
  Layers,
  Radio,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface FetchedModel {
  id: string
  name: string
  provider?: string
}

export interface AIProfileMeta {
  id: string
  name: string
  providerType: "openai" | "anthropic" | "google" | "custom-openai" | "custom-anthropic"
  baseUrl?: string
  model?: string
  hasKey: boolean
}

interface ModelSelectorProps {
  selectedModelOverride?: string
  onModelOverrideChange?: (model: string | undefined) => void
  className?: string
  compact?: boolean
  variant?: "pill" | "inline"
}

interface ModelsApiResponse {
  models?: FetchedModel[]
  activeModel?: string
  baseUrl?: string
  providerType?: string
}

interface ProfilesApiResponse {
  profiles?: AIProfileMeta[]
  activeId?: string
}

let cachedModelsData: { data: ModelsApiResponse; timestamp: number } | null = null
let inFlightModelsPromise: Promise<ModelsApiResponse | null> | null = null

let cachedProfilesData: { data: ProfilesApiResponse; timestamp: number } | null = null
let inFlightProfilesPromise: Promise<ProfilesApiResponse | null> | null = null

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache

async function getCachedModels(force = false): Promise<ModelsApiResponse | null> {
  const now = Date.now()
  if (!force && cachedModelsData && now - cachedModelsData.timestamp < CACHE_TTL_MS) {
    return cachedModelsData.data
  }
  if (!force && inFlightModelsPromise) {
    return inFlightModelsPromise
  }
  inFlightModelsPromise = fetch("/api/ai/models")
    .then((r) => (r.ok ? (r.json() as Promise<ModelsApiResponse>) : null))
    .then((data) => {
      if (data) cachedModelsData = { data, timestamp: Date.now() }
      return data
    })
    .catch(() => null)
    .finally(() => {
      inFlightModelsPromise = null
    })
  return inFlightModelsPromise
}

async function getCachedProfiles(force = false): Promise<ProfilesApiResponse | null> {
  const now = Date.now()
  if (!force && cachedProfilesData && now - cachedProfilesData.timestamp < CACHE_TTL_MS) {
    return cachedProfilesData.data
  }
  if (!force && inFlightProfilesPromise) {
    return inFlightProfilesPromise
  }
  inFlightProfilesPromise = fetch("/api/settings/ai-key")
    .then((r) => (r.ok ? (r.json() as Promise<ProfilesApiResponse>) : null))
    .then((data) => {
      if (data) cachedProfilesData = { data, timestamp: Date.now() }
      return data
    })
    .catch(() => null)
    .finally(() => {
      inFlightProfilesPromise = null
    })
  return inFlightProfilesPromise
}

export function invalidateModelSelectorCache() {
  cachedModelsData = null
  cachedProfilesData = null
}

export default function ModelSelector({
  selectedModelOverride,
  onModelOverrideChange,
  className,
  compact = false,
  variant = "pill",
}: ModelSelectorProps) {
  const [models, setModels] = useState<FetchedModel[]>([])
  const [activeModel, setActiveModel] = useState<string>("")
  const [profiles, setProfiles] = useState<AIProfileMeta[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState<string | null>(null)
  const [providerType, setProviderType] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [open, setOpen] = useState(false)

  // Fetch available live models from the configured baseUrl or provider (cached & deduplicated)
  const loadModelsAndProfiles = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    try {
      const [modelsData, profilesData] = await Promise.all([
        getCachedModels(isManualRefresh),
        getCachedProfiles(isManualRefresh),
      ])

      if (modelsData) {
        setModels(modelsData.models || [])
        setActiveModel(modelsData.activeModel || "")
        setBaseUrl(modelsData.baseUrl || null)
        setProviderType(modelsData.providerType || null)
      }

      if (profilesData) {
        setProfiles(profilesData.profiles || [])
        setActiveProfileId(profilesData.activeId || null)
      }

      if (isManualRefresh) {
        toast.success("AI models refreshed from endpoint")
      }
    } catch {
      // Ignore background network errors
    } finally {
      setLoading(false)
      if (isManualRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadModelsAndProfiles()
  }, [loadModelsAndProfiles])

  // Current effective model
  const effectiveModel = selectedModelOverride || activeModel

  // Filtered models based on search and quick category tags
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchesSearch =
        !searchQuery.trim() ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (selectedTag === "all") return true
      if (selectedTag === "gemini") return m.id.toLowerCase().includes("gemini")
      if (selectedTag === "claude") return m.id.toLowerCase().includes("claude") || m.id.toLowerCase().includes("sonnet") || m.id.toLowerCase().includes("opus")
      if (selectedTag === "gpt") return m.id.toLowerCase().includes("gpt") || m.id.toLowerCase().includes("o1") || m.id.toLowerCase().includes("o3") || m.id.toLowerCase().includes("openai")
      if (selectedTag === "llama") return m.id.toLowerCase().includes("llama") || m.id.toLowerCase().includes("qwen") || m.id.toLowerCase().includes("deepseek")
      return true
    })
  }, [models, searchQuery, selectedTag])

  // Select a specific model
  async function handleSelectModel(modelId: string) {
    setSwitching(true)
    try {
      // 1. Update in memory for current chat session
      setActiveModel(modelId)
      onModelOverrideChange?.(modelId)

      // 2. Persist to active profile in backend
      invalidateModelSelectorCache()
      await fetch("/api/settings/ai-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelId }),
      })

      const shortName = modelId.split("/").pop() || modelId
      toast.success(`Selected model: ${shortName}`)
      setOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to select model"
      toast.error(msg)
    } finally {
      setSwitching(false)
    }
  }

  // Switch active profile endpoint
  async function handleSwitchProfile(profileId: string) {
    if (profileId === activeProfileId) return
    setSwitching(true)
    try {
      invalidateModelSelectorCache()
      const res = await fetch("/api/settings/ai-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeId: profileId }),
      })
      if (!res.ok) throw new Error("Failed to switch profile")

      setActiveProfileId(profileId)
      onModelOverrideChange?.(undefined)
      await loadModelsAndProfiles()
      toast.success("Switched AI provider profile")
    } catch {
      toast.error("Failed to switch profile")
    } finally {
      setSwitching(false)
    }
  }

  const getProviderIcon = (type?: string | null) => {
    switch (type) {
      case "google":
        return <Zap className="h-3.5 w-3.5 text-amber-500" />
      case "anthropic":
        return <Layers className="h-3.5 w-3.5 text-purple-500" />
      case "custom-openai":
      case "custom-anthropic":
        return <Cpu className="h-3.5 w-3.5 text-emerald-500" />
      default:
        return <Bot className="h-3.5 w-3.5 text-primary" />
    }
  }

  const displayModelName = () => {
    if (effectiveModel) {
      const parts = effectiveModel.split("/")
      const raw = parts[parts.length - 1]
      // Make clean short readable name e.g. "gemini-3.5-flash-medium" -> "Flash Medium" or "Flash"
      if (raw.toLowerCase().includes("gemini-3.5-flash-medium")) return "Flash Medium"
      if (raw.toLowerCase().includes("gemini-3.5-flash")) return "Flash"
      if (raw.toLowerCase().includes("gemini-3-flash")) return "Flash"
      if (raw.toLowerCase().includes("gemini-3.1-pro")) return "3.1 Pro"
      if (raw.toLowerCase().includes("gemini-2.5-pro")) return "2.5 Pro"
      if (raw.toLowerCase().includes("gemini-2.0-flash")) return "2.0 Flash"
      if (raw.toLowerCase().includes("claude-sonnet-4-6")) return "Sonnet 4.6"
      if (raw.toLowerCase().includes("claude-sonnet-5")) return "Sonnet 5"
      if (raw.toLowerCase().includes("claude-opus")) return "Opus"
      if (raw.toLowerCase().includes("gpt-4o-mini")) return "4o Mini"
      if (raw.toLowerCase().includes("gpt-4o")) return "GPT-4o"
      return raw.length > 18 ? raw.slice(0, 18) + "..." : raw
    }
    const activeProf = profiles.find((p) => p.id === activeProfileId)
    return activeProf?.name || "Select Model"
  }

  if (loading) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground animate-pulse", className)}>
        <Sparkles className="h-3 w-3" />
        <span className="text-[11px]">Loading...</span>
      </div>
    )
  }

  const isInline = variant === "inline"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={switching}
          className={cn(
            isInline
              ? "group inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all focus:outline-none"
              : "group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 hover:bg-accent hover:border-border px-2.5 py-1 text-xs font-medium transition-all shadow-2xs backdrop-blur-xs focus:outline-none focus:ring-1 focus:ring-primary/40",
            switching && "opacity-60 cursor-wait",
            className
          )}
          title="Select AI Model"
        >
          <span className="flex items-center gap-1">
            {!isInline && getProviderIcon(providerType)}
            <span className={cn("truncate font-medium", compact ? "max-w-[90px]" : "max-w-[140px]")}>
              {displayModelName()}
            </span>
          </span>
          <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side={isInline ? "top" : "bottom"}
        sideOffset={6}
        className="w-80 sm:w-96 p-2 shadow-2xl rounded-xl z-50"
      >
        {/* Header */}
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
            <span>Live Models ({models.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                loadModelsAndProfiles(true)
              }}
              disabled={refreshing}
              className="text-[11px] font-normal normal-case text-muted-foreground hover:text-foreground flex items-center gap-1 p-0.5 rounded transition-colors"
              title="Refresh models from endpoint"
            >
              <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin text-primary")} />
              <span>Refresh</span>
            </button>
            <Link
              href="/settings"
              className="text-[11px] font-normal normal-case text-primary hover:underline flex items-center gap-0.5"
            >
              <SettingsIcon className="h-3 w-3" /> Settings
            </Link>
          </div>
        </DropdownMenuLabel>

        {baseUrl && (
          <div className="px-2 pb-1 text-[10px] text-muted-foreground font-mono truncate">
            Endpoint: <span className="text-foreground">{baseUrl}</span>
          </div>
        )}

        <DropdownMenuSeparator className="my-1" />

        {/* Search & Category Filter */}
        <div className="p-1 space-y-1.5">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fetched models (e.g. gemini, claude, gpt)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/80 bg-muted/40 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
            {[
              { id: "all", label: "All" },
              { id: "gemini", label: "Gemini" },
              { id: "claude", label: "Claude" },
              { id: "gpt", label: "GPT" },
              { id: "llama", label: "Open/Llama" },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSelectedTag(chip.id)
                }}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors shrink-0",
                  selectedTag === chip.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator className="my-1" />

        {/* Models List */}
        <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
          {filteredModels.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">No matching models found.</p>
            </div>
          ) : (
            filteredModels.map((m) => {
              const isSelected = effectiveModel === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectModel(m.id)}
                  className={cn(
                    "w-full text-left flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all hover:bg-accent text-xs",
                    isSelected && "bg-primary/10 border border-primary/30 text-primary font-medium"
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Sparkles className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <div className="overflow-hidden">
                      <p className="font-mono text-xs truncate text-foreground">
                        {m.id}
                      </p>
                      {m.provider && (
                        <p className="text-[10px] text-muted-foreground capitalize">
                          Provider: {m.provider}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Profile Switcher Footer */}
        {profiles.length > 1 && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
              Switch AI Key Profile
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSwitchProfile(p.id)
                  }}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] border transition-colors flex items-center gap-1",
                    p.id === activeProfileId
                      ? "border-primary/50 bg-primary/15 text-primary font-medium"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{p.name}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                    {p.providerType.replace("custom-", "")}
                  </Badge>
                </button>
              ))}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
