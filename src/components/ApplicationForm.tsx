"use client"

import { useState, FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface ApplicationFormData {
  companyName: string
  jobTitle: string
  jobUrl: string
  source: string
  applicationDate: string
  status: string
  notes: string
}

interface ApplicationFormProps {
  initialData?: ApplicationFormData
  applicationId?: string
}

const defaultData: ApplicationFormData = {
  companyName: "",
  jobTitle: "",
  jobUrl: "",
  source: "",
  applicationDate: new Date().toISOString().split("T")[0],
  status: "",
  notes: "",
}

export default function ApplicationForm({
  initialData,
  applicationId,
}: ApplicationFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<ApplicationFormData>(
    initialData || defaultData
  )
  const initialForm = initialData || defaultData
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const hasUnsaved = JSON.stringify(form) !== JSON.stringify(initialForm)

  useEffect(() => {
    if (!hasUnsaved || submitting) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [hasUnsaved, submitting])

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.companyName.trim()) errs.companyName = "Company name is required"
    if (!form.jobTitle.trim()) errs.jobTitle = "Job title is required"
    if (!form.source) errs.source = "Source is required"
    if (!form.applicationDate) errs.applicationDate = "Date is required"
    if (!form.status) errs.status = "Status is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)

    const url = applicationId
      ? `/api/applications/${applicationId}`
      : "/api/applications"
    const method = applicationId ? "PATCH" : "POST"

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrors({ form: data.error || "Something went wrong" })
        toast.error(data.error || "Something went wrong")
        return
      }

      toast.success(applicationId ? "Application updated" : "Application created")
      router.push("/applications")
      router.refresh()
    } catch {
      setErrors({ form: "Network error. Please try again." })
      toast.error("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function updateField(field: keyof ApplicationFormData, value: string) {
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="companyName">
          Company Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="companyName"
          value={form.companyName}
          onChange={(e) => updateField("companyName", e.target.value)}
        />
        {errors.companyName && (
          <p className="text-sm text-destructive">{errors.companyName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobTitle">
          Job Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="jobTitle"
          value={form.jobTitle}
          onChange={(e) => updateField("jobTitle", e.target.value)}
        />
        {errors.jobTitle && (
          <p className="text-sm text-destructive">{errors.jobTitle}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobUrl">Job Post URL</Label>
        <Input
          id="jobUrl"
          type="url"
          placeholder="https://"
          value={form.jobUrl}
          onChange={(e) => updateField("jobUrl", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="source">
          Application Source <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.source}
          onValueChange={(v) => updateField("source", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
            <SelectItem value="Bdjobs">Bdjobs</SelectItem>
            <SelectItem value="Indeed">Indeed</SelectItem>
            <SelectItem value="Wellfound">Wellfound</SelectItem>
            <SelectItem value="Facebook">Facebook</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.source && (
          <p className="text-sm text-destructive">{errors.source}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="applicationDate">
          Application Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="applicationDate"
          type="date"
          value={form.applicationDate}
          onChange={(e) => updateField("applicationDate", e.target.value)}
        />
        {errors.applicationDate && (
          <p className="text-sm text-destructive">{errors.applicationDate}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">
          Status <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.status}
          onValueChange={(v) => updateField("status", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Saved">Saved</SelectItem>
            <SelectItem value="Applied">Applied</SelectItem>
            <SelectItem value="Assessment">Assessment</SelectItem>
            <SelectItem value="Interview">Interview</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Offer">Offer</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && (
          <p className="text-sm text-destructive">{errors.status}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={4}
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </div>

      {errors.form && (
        <p className="text-sm text-destructive">{errors.form}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Saving..."
            : applicationId
            ? "Update Application"
            : "Add Application"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
