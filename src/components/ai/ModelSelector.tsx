"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Sparkles,
  Cpu,
  Bot,
  Zap,
  Check,
  ChevronDown,
  Settings as SettingsIcon,
  PlusCircle,
  Layers,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
}

export default function ModelSelector({
  selectedModelOverride,
  onModelOverrideChange,
  className,
  compact = false,
}: ModelSelectorProps) {
  const [profiles, setProfiles] = useState<AIProfileMeta[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ai-key")
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles || [])
        setActiveId(data.activeId || null)
      }
    } catch {
      // Ignore network errors on background poll
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  const activeProfile = profiles.find((p) => p.id === activeId) || profiles[0]

  async function handleSwitchProfile(profileId: string) {
    if (profileId === activeId) return
    setSwitching(true)
    try {
      const res = await fetch("/api/settings/ai-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeId: profileId }),
      })
      if (!res.ok) throw new Error("Failed to switch active AI profile")

      setActiveId(profileId)
      const switchedProfile = profiles.find((p) => p.id === profileId)
      toast.success(`Switched AI model to ${switchedProfile?.name || "selected profile"}`)
      // Clear manual model override when switching profile
      onModelOverrideChange?.(undefined)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not switch AI profile"
      toast.error(msg)
    } finally {
      setSwitching(false)
    }
  }

  const getProviderIcon = (type?: string) => {
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

  const getDisplayName = () => {
    if (selectedModelOverride) {
      return selectedModelOverride.split("/").pop() || selectedModelOverride
    }
    if (activeProfile) {
      const modelName = activeProfile.model?.split("/").pop() || activeProfile.model
      return modelName ? `${activeProfile.name} (${modelName})` : activeProfile.name
    }
    return "Select Model"
  }

  if (loading) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 text-xs text-muted-foreground animate-pulse", className)}>
        <Sparkles className="h-3 w-3" />
        <span>Loading AI...</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={switching}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 hover:bg-accent hover:border-border px-2.5 py-1 text-xs font-medium transition-all shadow-2xs backdrop-blur-xs focus:outline-none focus:ring-1 focus:ring-primary/40",
            switching && "opacity-60 cursor-wait",
            className
          )}
          title="Change active AI model or key profile"
        >
          <span className="flex items-center gap-1">
            {getProviderIcon(activeProfile?.providerType)}
            <span className={cn("truncate max-w-[130px] sm:max-w-[180px]", compact && "max-w-[100px]")}>
              {getDisplayName()}
            </span>
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 sm:w-72 p-1.5 shadow-xl rounded-xl">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>AI Model Profiles</span>
          <Link
            href="/settings"
            className="text-[11px] font-normal normal-case text-primary hover:underline flex items-center gap-1"
          >
            <SettingsIcon className="h-3 w-3" /> Settings
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {profiles.length === 0 ? (
          <div className="p-3 text-center space-y-2">
            <p className="text-xs text-muted-foreground">No AI key profiles configured.</p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Add Key in Settings
            </Link>
          </div>
        ) : (
          <DropdownMenuGroup className="space-y-0.5">
            {profiles.map((prof) => {
              const isSelected = activeProfile?.id === prof.id
              return (
                <DropdownMenuItem
                  key={prof.id}
                  onClick={() => handleSwitchProfile(prof.id)}
                  className={cn(
                    "flex items-start justify-between p-2 rounded-lg cursor-pointer transition-colors focus:bg-accent/80",
                    isSelected && "bg-primary/10 border border-primary/20"
                  )}
                >
                  <div className="flex items-start gap-2 overflow-hidden">
                    <div className="mt-0.5 shrink-0">{getProviderIcon(prof.providerType)}</div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate text-foreground">
                          {prof.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[9px] uppercase px-1 py-0 h-4 shrink-0"
                        >
                          {prof.providerType.replace("custom-", "")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                        {prof.model || (prof.baseUrl ? `Proxy: ${prof.baseUrl}` : "Default Model")}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0 mt-1 ml-2" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        )}

        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem asChild>
          <Link
            href="/settings"
            className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add / Manage AI Key Profiles</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
