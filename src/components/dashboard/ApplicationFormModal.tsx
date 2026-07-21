"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TagOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicationId?: string
  onUpdated: () => void
}

const defaultForm = {
  companyName: "",
  jobTitle: "",
  jobUrl: "",
  source: "",
  applicationDate: new Date().toISOString().split("T")[0],
  status: "",
  notes: "",
}

export default function ApplicationFormModal({
  open,
  onOpenChange,
  applicationId,
  onUpdated,
}: Props) {
  const isEdit = !!applicationId
  const [form, setForm] = useState(defaultForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [tags, setTags] = useState<TagOption[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!open) {
      setForm(defaultForm)
      setSelectedTagIds([])
      setErrors({})
      return
    }

    if (isEdit) {
      setLoadingData(true)
      fetch(`/api/applications/${applicationId}`)
        .then((r) => r.json())
        .then((data) => {
          setForm({
            companyName: data.companyName,
            jobTitle: data.jobTitle,
            jobUrl: data.jobUrl || "",
            source: data.source,
            applicationDate: data.applicationDate.split("T")[0],
            status: data.status,
            notes: data.notes || "",
          })
          setSelectedTagIds((data.tags || []).map((t: { tag: { id: string } }) => t.tag.id))
        })
        .catch(() => toast.error("Failed to load data"))
        .finally(() => setLoadingData(false))
    }
  }, [open, isEdit, applicationId])

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.companyName.trim()) errs.companyName = "Required"
    if (!form.jobTitle.trim()) errs.jobTitle = "Required"
    if (!form.source) errs.source = "Required"
    if (!form.applicationDate) errs.applicationDate = "Required"
    if (!form.status) errs.status = "Required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    const url = isEdit ? `/api/applications/${applicationId}` : "/api/applications"
    const method = isEdit ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tagIds: selectedTagIds }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to save")
        return
      }
      toast.success(isEdit ? "Updated successfully" : "Created successfully")
      onOpenChange(false)
      onUpdated()
    } catch {
      toast.error("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev }
        delete copy[field]
        return copy
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Application" : "Add Application"}</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Company" error={errors.companyName} required>
              <Input
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                placeholder="e.g. Google"
              />
            </FormField>

            <FormField label="Job Title" error={errors.jobTitle} required>
              <Input
                value={form.jobTitle}
                onChange={(e) => updateField("jobTitle", e.target.value)}
                placeholder="e.g. Senior Frontend Developer"
              />
            </FormField>

            <FormField label="Job URL" error={undefined}>
              <Input
                type="url"
                placeholder="https://..."
                value={form.jobUrl}
                onChange={(e) => updateField("jobUrl", e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Source" error={errors.source} required>
                <Select value={form.source} onValueChange={(v) => updateField("source", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["LinkedIn", "Bdjobs", "Indeed", "Wellfound", "Facebook", "Referral", "Other"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Status" error={errors.status} required>
                <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="Date" error={errors.applicationDate} required>
              <Input
                type="date"
                value={form.applicationDate}
                onChange={(e) => updateField("applicationDate", e.target.value)}
              />
            </FormField>

            <FormField label="Notes" error={undefined}>
              <Textarea
                rows={3}
                placeholder="Optional notes..."
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </FormField>

            <div className="space-y-2">
              <Label>Tags</Label>
              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTagIds.map((id) => {
                    const tag = tags.find((t) => t.id === id)
                    if (!tag) return null
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setSelectedTagIds((prev) => prev.filter((t) => t !== id))}
                      >
                        {tag.name} ×
                      </Badge>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value
                    if (id && !selectedTagIds.includes(id)) {
                      setSelectedTagIds((prev) => [...prev, id])
                    }
                  }}
                >
                  <option value="">Add tag...</option>
                  {tags.filter((t) => !selectedTagIds.includes(t.id)).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
