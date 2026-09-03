/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Radio, Briefcase, MapPin, Target, Check, RefreshCw, Sliders } from "lucide-react"
import { DecorIcon } from "@/components/decor-icon"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface UserPreferencesPayload {
  workPreference?: string | null
  location?: string | null
  targetRoles?: string[]
  experienceLevel?: string | null
}

interface DiscoveryPreferencesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPreferences?: UserPreferencesPayload | null
  onSaved?: () => void
}

export function DiscoveryPreferencesModal({
  open,
  onOpenChange,
  currentPreferences,
  onSaved,
}: DiscoveryPreferencesModalProps) {
  const [workPreference, setWorkPreference] = useState<"remote" | "hybrid" | "onsite" | "open">("open")
  const [locationInput, setLocationInput] = useState("")
  const [targetRolesInput, setTargetRolesInput] = useState("")
  const [experienceLevel, setExperienceLevel] = useState<string>("Mid")
  const [isSaving, setIsSaving] = useState(false)

  // Hydrate local state when current preferences change or modal opens
  useEffect(() => {
    if (currentPreferences) {
      if (
        currentPreferences.workPreference === "remote" ||
        currentPreferences.workPreference === "hybrid" ||
        currentPreferences.workPreference === "onsite" ||
        currentPreferences.workPreference === "open"
      ) {
        setWorkPreference(currentPreferences.workPreference)
      } else {
        setWorkPreference("open")
      }

      setLocationInput(currentPreferences.location || "")
      setTargetRolesInput((currentPreferences.targetRoles || []).join(", "))
      setExperienceLevel(currentPreferences.experienceLevel || "Mid")
    }
  }, [currentPreferences, open])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const roles = targetRolesInput
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)

      const payload = {
        workPreference,
        location: locationInput.trim() || undefined,
        targetRoles: roles.length > 0 ? roles : undefined,
        experienceLevel: experienceLevel || undefined,
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error?.message || "Failed to update profile criteria")
      }

      toast.success("Discovery criteria updated! Syncing your personalized job feed...")
      onOpenChange(false)
      onSaved?.()
    } catch (err: any) {
      toast.error(err?.message || "Failed to save preferences")
    } finally {
      setIsSaving(false)
    }
  }

  const workModes = [
    {
      id: "remote" as const,
      label: "Remote",
      shortDesc: "Worldwide & remote",
      dot: "bg-emerald-500",
    },
    {
      id: "hybrid" as const,
      label: "Hybrid",
      shortDesc: "In-office + remote",
      dot: "bg-sky-500",
    },
    {
      id: "onsite" as const,
      label: "On-site",
      shortDesc: "Target city only",
      dot: "bg-amber-500",
    },
    {
      id: "open" as const,
      label: "Open to Any",
      shortDesc: "Remote & local",
      dot: "bg-primary",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-none border border-border bg-card p-5 sm:p-6 shadow-2xl overflow-hidden">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />

        <DialogHeader className="space-y-1 text-left mb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-none bg-primary/10 text-primary border border-primary/20">
              <Sliders className="size-3.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                Discovery Intent &amp; Criteria
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure your non-negotiable filters and 6-hour scraper sync parameters.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Work Arrangement Selector (Compact 4-Column Grid) */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Radio className="size-3 text-primary" />
              Work Arrangement (Hard Filter)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {workModes.map((mode) => {
                const isSelected = workPreference === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setWorkPreference(mode.id)}
                    className={cn(
                      "flex flex-col text-left p-2 border transition-all cursor-pointer rounded-none relative",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40 text-foreground"
                        : "border-border bg-background hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 rounded-full", mode.dot)} />
                        <span className="text-[11px] font-semibold text-foreground leading-none">{mode.label}</span>
                      </div>
                      {isSelected && <Check className="size-3 text-primary" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                      {mode.shortDesc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2-Column Row: Target Location + Seniority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3 text-primary" />
                Target City / Location
              </Label>
              <Input
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g. Dhaka, Bangladesh"
                className="text-xs h-8 rounded-none bg-background border-border"
              />
              <p className="text-[10px] text-muted-foreground">
                Required for on-site &amp; hybrid roles.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target className="size-3 text-primary" />
                Seniority Level
              </Label>
              <Select value={experienceLevel} onValueChange={(val) => setExperienceLevel(val)}>
                <SelectTrigger className="text-xs h-8 rounded-none bg-background border-border cursor-pointer">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="rounded-none z-[200]">
                  <SelectItem value="Entry" className="cursor-pointer text-xs">Entry Level (0-1 yrs)</SelectItem>
                  <SelectItem value="Junior" className="cursor-pointer text-xs">Junior (1-2 yrs)</SelectItem>
                  <SelectItem value="Mid" className="cursor-pointer text-xs">Mid-Level (2-5 yrs)</SelectItem>
                  <SelectItem value="Senior" className="cursor-pointer text-xs">Senior (5-8 yrs)</SelectItem>
                  <SelectItem value="Lead" className="cursor-pointer text-xs">Lead / Staff (8+ yrs)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Matches expected role seniority.
              </p>
            </div>
          </div>

          {/* Target Role Titles + Quick Add Chips */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="size-3 text-primary" />
                Target Role Titles
              </Label>
              <span className="text-[10px] font-mono text-muted-foreground">comma-separated</span>
            </div>
            <Input
              value={targetRolesInput}
              onChange={(e) => setTargetRolesInput(e.target.value)}
              placeholder="e.g. Full Stack Developer, Frontend Engineer, React Developer"
              className="text-xs h-8 rounded-none bg-background border-border"
            />
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] font-mono text-muted-foreground mr-0.5">Quick add:</span>
              {["Full Stack", "Frontend", "Backend", "React", "Node.js", "AI Engineer"].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    const current = targetRolesInput.split(",").map((s) => s.trim()).filter(Boolean)
                    if (!current.some((c) => c.toLowerCase() === role.toLowerCase())) {
                      setTargetRolesInput(current.length > 0 ? `${targetRolesInput}, ${role}` : role)
                    }
                  }}
                  className="text-[10px] px-1.5 py-0.5 border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-none transition-colors"
                >
                  +{role}
                </button>
              ))}
            </div>
          </div>

          {/* Blueprint Note */}
          <div className="p-2 border border-primary/20 bg-primary/5 text-[11px] text-muted-foreground leading-snug flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-primary shrink-0" />
            <p>
              <span className="font-semibold text-foreground">Direct Pipeline Impact:</span> Updates your User Profile and immediately re-evaluates the feed against your new criteria.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-8 text-xs rounded-none cursor-pointer border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="h-8 text-xs gap-1.5 rounded-none cursor-pointer bg-primary text-primary-foreground font-medium"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>Save &amp; Update Feed</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
