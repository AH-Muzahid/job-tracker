"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface FormData {
  goal1: string
  goal1Target: string
  goal2: string
  goal2Target: string
  goal3: string
  goal3Target: string
  blockers: string
  notes: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Record<string, unknown>) => void
  saving: boolean
}

export default function WeeklyGoalForm({ open, onOpenChange, onSave, saving }: Props) {
  const [form, setForm] = useState<FormData>({
    goal1: "", goal1Target: "",
    goal2: "", goal2Target: "",
    goal3: "", goal3Target: "",
    blockers: "", notes: "",
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      goal1: form.goal1,
      goal1Target: form.goal1Target ? parseInt(form.goal1Target) : null,
      goal2: form.goal2 || null,
      goal2Target: form.goal2Target ? parseInt(form.goal2Target) : null,
      goal3: form.goal3 || null,
      goal3Target: form.goal3Target ? parseInt(form.goal3Target) : null,
      blockers: form.blockers || null,
      notes: form.notes || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Weekly Goals</DialogTitle>
          <DialogDescription>
            Goal 1 is your primary placement-oriented goal. Goal 2 should support goal 1.
            Goal 3 is for readiness and skill-building.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label>Goal 1 (Placement-oriented) *</Label>
              <Input
                value={form.goal1}
                onChange={(e) => setForm({ ...form, goal1: e.target.value })}
                placeholder="e.g. Apply to 10 frontend roles"
                required
              />
            </div>
            <div>
              <Label>Target</Label>
              <Input
                type="number"
                value={form.goal1Target}
                onChange={(e) => setForm({ ...form, goal1Target: e.target.value })}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <Label>Goal 2 (Supports goal 1)</Label>
              <Input
                value={form.goal2}
                onChange={(e) => setForm({ ...form, goal2: e.target.value })}
                placeholder="e.g. Tailor resume for 5 roles"
              />
            </div>
            <div>
              <Label>Target</Label>
              <Input
                type="number"
                value={form.goal2Target}
                onChange={(e) => setForm({ ...form, goal2Target: e.target.value })}
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <Label>Goal 3 (Readiness / Skill-building)</Label>
              <Input
                value={form.goal3}
                onChange={(e) => setForm({ ...form, goal3: e.target.value })}
                placeholder="e.g. Complete 3 LeetCode problems"
              />
            </div>
            <div>
              <Label>Target</Label>
              <Input
                type="number"
                value={form.goal3Target}
                onChange={(e) => setForm({ ...form, goal3Target: e.target.value })}
                placeholder="e.g. 3"
              />
            </div>
          </div>
          <div>
            <Label>Blockers</Label>
            <Textarea
              value={form.blockers}
              onChange={(e) => setForm({ ...form, blockers: e.target.value })}
              placeholder="Anything blocking your progress?"
              rows={2}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.goal1.trim()}>
              {saving ? "Saving..." : "Set Goals"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
