"use client"

import { useRef } from "react"
import { Loader2, FileText } from "lucide-react"

interface Props {
  uploading: boolean
  onFileUpload: (file: File) => void
}

export function UploadMode({ uploading, onFileUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0])
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-background/50 hover:bg-muted/30 transition-all rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center space-y-2 min-h-[110px]"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onFileUpload(e.target.files[0])
        }}
      />
      {uploading ? (
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      ) : (
        <FileText className="h-6 w-6 text-muted-foreground" />
      )}
      <div>
        <p className="text-xs font-semibold text-foreground">
          {uploading ? "Extracting file text..." : "Click or drag & drop JD file (PDF, TXT)"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          Text will automatically load into analysis mode
        </p>
      </div>
    </div>
  )
}
