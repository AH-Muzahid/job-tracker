"use client"

import React, { useState, useRef } from "react"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface SalaryUploadDropzoneProps {
  onUploadSuccess?: (count: number) => void
  className?: string
}

export function SalaryUploadDropzone({
  onUploadSuccess,
  className = "",
}: SalaryUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      validateAndSetFile(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null)
    setResultMessage(null)

    const name = file.name.toLowerCase()
    if (!name.endsWith(".csv") && !name.endsWith(".json")) {
      setErrorMessage("Only .csv and .json files are supported")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File exceeds 5MB size limit")
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setErrorMessage(null)
    setResultMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/salary/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload salary data")
      }

      setResultMessage(`Imported ${data.count} salary benchmark record(s)`)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (onUploadSuccess) onUploadSuccess(data.count)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during upload"
      setErrorMessage(msg)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className={`rounded-[6px] border border-border bg-card p-6 text-foreground ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Bring Your Own (BYO) Salary Benchmarks
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Import custom salary surveys or internal compensation data via CSV or JSON.
          </p>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[6px] border border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/40 bg-muted/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {selectedFile ? (
            <FileSpreadsheet className="h-5 w-5 text-foreground" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </div>

        {selectedFile ? (
          <div>
            <p className="text-xs font-medium text-foreground">{selectedFile.name}</p>
            <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium text-foreground">
              Drop your CSV or JSON file here, or click to browse
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Expected columns: company, role, location, salaryMin, salaryMax, currency
            </p>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              setSelectedFile(null)
              if (fileInputRef.current) fileInputRef.current.value = ""
            }}
            className="rounded-sm border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isUploading}
            onClick={handleUpload}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#533AFD] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Upload Benchmarks</span>
            )}
          </button>
        </div>
      )}

      {resultMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-sm border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="tabular-nums">{resultMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  )
}
