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

      const res = await fetch("/api/profile", {
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
      label: "Remote Only",
      desc: "Worldwide & regional remote opportunities",
      dot: "bg-emerald-500",
    },
    {
      id: "hybrid" as const,
      label: "Hybrid Preferred",
      desc: "Flexible in-office and remote blend",
      dot: "bg-sky-500",
    },
    {
      id: "onsite" as const,
      label: "On-site Only",
      desc: "Physical office in your target city",
      dot: "bg-amber-500",
    },
    {
      id: "open" as const,
      label: "Open to Any",
      desc: "Show both remote and local opportunities",
      dot: "bg-primary",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-none border border-border bg-card p-5 sm:p-6 shadow-xl relative">
        <DecorIcon position="top-right" />
        <DecorIcon position="bottom-left" />

        <DialogHeader className="space-y-1.5 text-left mb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-none bg-primary/10 text-primary border border-primary/20">
              <Sliders className="size-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Discovery Intent & Criteria
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Configure your non-negotiable preferences. The Two-Stage Discovery Engine uses this as a hard disqualification gate and scoring foundation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Work Mode Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Radio className="size-3 text-primary" />
              Work Arrangement (Highest Priority)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {workModes.map((mode) => {
                const isSelected = workPreference === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setWorkPreference(mode.id)}
                    className={cn(
                      "flex flex-col text-left p-2.5 border transition-all cursor-pointer rounded-none relative",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40 text-foreground"
                        : "border-border bg-background hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", mode.dot)} />
                        <span className="text-xs font-semibold text-foreground">{mode.label}</span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground/80 leading-tight">
                      {mode.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Location & City */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3 text-primary" />
              Target City / Location (Required for On-site & Hybrid)
            </Label>
            <Input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="e.g. Dhaka, Bangladesh or Berlin, Germany"
              className="text-xs h-9 rounded-none bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              On-site jobs outside this location will be strictly eliminated from your feed.
            </p>
          </div>

          {/* Target Roles */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="size-3 text-primary" />
              Target Role Titles (Comma-separated)
            </Label>
            <Input
              value={targetRolesInput}
              onChange={(e) => setTargetRolesInput(e.target.value)}
              placeholder="e.g. Full Stack Developer, Frontend Engineer, React Developer"
              className="text-xs h-9 rounded-none bg-background"
            />
          </div>

          {/* Experience Level */}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="size-3 text-primary" />
              Seniority / Experience Level
            </Label>
            <Select value={experienceLevel} onValueChange={(val) => setExperienceLevel(val)}>
              <SelectTrigger className="text-xs h-9 rounded-none bg-background">
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="Junior">Junior (0 - 2 years)</SelectItem>
                <SelectItem value="Mid">Mid-Level (2 - 5 years)</SelectItem>
                <SelectItem value="Senior">Senior (5+ years)</SelectItem>
                <SelectItem value="Lead">Lead / Principal (8+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Blueprint Note */}
          <div className="p-2.5 border border-primary/20 bg-primary/5 text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Direct Pipeline Impact:</span> Saving updates your permanent User Profile and triggers a personalized 6-hour scraper sync across LinkedIn, RemoteOK, and multi-board feeds.
          </div>

          {/* Modal Actions (Sticky Docked Footer) */}
          <div className="sticky -bottom-5 sm:-bottom-6 -mx-5 sm:-mx-6 mt-6 p-3 sm:p-4 border-t border-border bg-card/95 backdrop-blur-sm flex items-center justify-end gap-2 z-20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-8 text-xs rounded-none cursor-pointer"
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
