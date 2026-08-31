"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react"
import { 
  Download, 
  Copy, 
  Check, 
  Edit3, 
  Zap, 
  Globe, 
  Mail, 
  Link,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { TailoredResumeData } from "@/types/tailored-resume"

interface ATSResumePreviewProps {
  data: TailoredResumeData
  onClose?: () => void
}

export default function ATSResumePreview({ data: initialData }: ATSResumePreviewProps) {
  const [data, setData] = useState<TailoredResumeData>(initialData)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadPdf() {
    setDownloading(true)
    try {
      const res = await fetch("/api/resumes/download/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to generate vector PDF")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const fileName = `${data.targetCompany ? `${data.targetCompany}-` : ""}Tailored-Resume.pdf`
      a.download = fileName.replace(/[^a-zA-Z0-9-_.]/g, "_")
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("ATS Vector PDF downloaded successfully!")
    } catch (err: any) {
      console.warn("[PDF Download Fallback]:", err)
      // Fallback to window print
      window.print()
    } finally {
      setDownloading(false)
    }
  }

  function handleCopyMarkdown() {
    const md = `# ${data.header.fullName}
**${data.header.title}** | ${data.header.email} | ${data.header.location || ""}
${data.header.linkedinUrl ? `LinkedIn: ${data.header.linkedinUrl} | ` : ""}${data.header.githubUrl ? `GitHub: ${data.header.githubUrl}` : ""}

---

## PROFESSIONAL SUMMARY
${data.summary}

---

## TECHNICAL COMPETENCIES
${data.skillsByDomain.map(d => `- **${d.domain}**: ${d.skills.join(", ")}`).join("\n")}

---

## FEATURED PROJECTS
${data.projects.map(p => `### ${p.name} (${p.stack.join(", ")})\n${p.bullets.map(b => `- ${b}`).join("\n")}`).join("\n\n")}

---

## EXPERIENCE
${data.experience.map(e => `### ${e.role} — ${e.company} (${e.duration})\n${e.bullets.map(b => `- ${b}`).join("\n")}`).join("\n\n")}

---

## EDUCATION
${data.education.map(ed => `- **${ed.degree}**, ${ed.institution} (${ed.year || ""})`).join("\n")}
`
    navigator.clipboard.writeText(md)
    setCopied(true)
    toast.success("Resume markdown copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Control Bar (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-secondary/30 rounded-xl border border-border/80 print:hidden">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2 py-0.5 rounded-md font-semibold">
            <Zap className="h-3 w-3 mr-1" />
            {data.matchScore ? `${data.matchScore}% ATS Match` : "Tailored ATS Resume"}
          </Badge>
          {data.targetCompany && (
            <span className="text-xs text-muted-foreground">
              for <strong className="text-foreground">{data.targetRole || "Role"}</strong> at <strong className="text-foreground">{data.targetCompany}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs h-8 rounded-lg cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" />
            {isEditing ? "Done Editing" : "Edit In-Place"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="text-xs h-8 rounded-lg cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? "Copied" : "Copy Markdown"}
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="text-xs h-8 rounded-lg shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            {downloading ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Printable 1-Page Resume Container */}
      <div className="flex-1 overflow-y-auto max-h-[75vh] p-2 sm:p-4 bg-muted/30 rounded-xl border border-border/60">
        <div 
          id="printable-ats-resume"
          className="max-w-3xl mx-auto bg-white text-slate-900 shadow-lg p-8 sm:p-12 font-sans text-xs leading-normal print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full"
          style={{ fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          {/* Header Section */}
          <header className="border-b border-slate-300 pb-4 mb-4 text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase mb-1">
              {data.header.fullName}
            </h1>
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              {data.header.title}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3 inline text-slate-400" /> {data.header.email}
              </span>
              {data.header.location && <span>• {data.header.location}</span>}
              {data.header.linkedinUrl && (
                <span className="flex items-center gap-1">
                  • <Link className="h-3 w-3 inline text-slate-400" /> {data.header.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '')}
                </span>
              )}
              {data.header.githubUrl && (
                <span className="flex items-center gap-1">
                  • <Link className="h-3 w-3 inline text-slate-400" /> {data.header.githubUrl.replace(/^https?:\/\/(www\.)?/, '')}
                </span>
              )}
              {data.header.portfolioUrl && (
                <span className="flex items-center gap-1">
                  • <Globe className="h-3 w-3 inline text-slate-400" /> {data.header.portfolioUrl.replace(/^https?:\/\/(www\.)?/, '')}
                </span>
              )}
            </div>
          </header>

          {/* Professional Summary */}
          <section className="mb-4">
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-1.5">
              Professional Summary
            </h2>
            {isEditing ? (
              <textarea
                value={data.summary}
                onChange={(e) => setData({ ...data, summary: e.target.value })}
                className="w-full text-[11px] p-2 border border-slate-300 rounded text-slate-900 bg-slate-50"
                rows={3}
              />
            ) : (
              <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
                {data.summary}
              </p>
            )}
          </section>

          {/* Core Technical Competencies */}
          <section className="mb-4">
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-1.5">
              Technical Competencies
            </h2>
            <div className="space-y-1 text-[11px]">
              {data.skillsByDomain.map((domainGroup, idx) => (
                <div key={idx} className="flex items-baseline gap-1.5">
                  <strong className="text-slate-900 shrink-0">{domainGroup.domain}:</strong>
                  {isEditing ? (
                    <input
                      type="text"
                      value={domainGroup.skills.join(", ")}
                      onChange={(e) => {
                        const newSkills = e.target.value.split(",").map(s => s.trim())
                        const updated = [...data.skillsByDomain]
                        updated[idx].skills = newSkills
                        setData({ ...data, skillsByDomain: updated })
                      }}
                      className="flex-1 text-[11px] px-1 border border-slate-300 rounded"
                    />
                  ) : (
                    <span className="text-slate-700">{domainGroup.skills.join(" • ")}</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Featured Production Projects */}
          {data.projects && data.projects.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-2">
                Featured Engineering Projects
              </h2>
              <div className="space-y-3">
                {data.projects.map((proj, pIdx) => (
                  <div key={pIdx}>
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className="text-[11px] font-bold text-slate-900">
                        {proj.name}
                        {proj.stack && proj.stack.length > 0 && (
                          <span className="font-normal text-slate-600 text-[10px] ml-1.5">
                            | {proj.stack.join(", ")}
                          </span>
                        )}
                      </span>
                      {proj.link && (
                        <span className="text-[10px] text-slate-500">
                          {proj.link.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                    </div>
                    <ul className="list-disc list-outside ml-4 space-y-0.5 text-[11px] text-slate-700">
                      {proj.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="leading-snug">
                          {isEditing ? (
                            <input
                              type="text"
                              value={bullet}
                              onChange={(e) => {
                                const updatedProj = [...data.projects]
                                updatedProj[pIdx].bullets[bIdx] = e.target.value
                                setData({ ...data, projects: updatedProj })
                              }}
                              className="w-full text-[10px] px-1 border border-slate-300 rounded"
                            />
                          ) : (
                            bullet
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Work Experience */}
          {data.experience && data.experience.length > 0 && (
            <section className="mb-4">
              <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-2">
                Professional Experience
              </h2>
              <div className="space-y-3">
                {data.experience.map((exp, eIdx) => (
                  <div key={eIdx}>
                    <div className="flex items-baseline justify-between mb-0.5">
                      <div className="text-[11px]">
                        <strong className="text-slate-900">{exp.role}</strong> — <span className="text-slate-700">{exp.company}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium shrink-0">
                        {exp.duration} {exp.location ? `| ${exp.location}` : ""}
                      </div>
                    </div>
                    <ul className="list-disc list-outside ml-4 space-y-0.5 text-[11px] text-slate-700">
                      {exp.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="leading-snug">
                          {isEditing ? (
                            <input
                              type="text"
                              value={bullet}
                              onChange={(e) => {
                                const updatedExp = [...data.experience]
                                updatedExp[eIdx].bullets[bIdx] = e.target.value
                                setData({ ...data, experience: updatedExp })
                              }}
                              className="w-full text-[10px] px-1 border border-slate-300 rounded"
                            />
                          ) : (
                            bullet
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {data.education && data.education.length > 0 && (
            <section>
              <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-1.5">
                Education & Credentials
              </h2>
              <div className="space-y-1 text-[11px]">
                {data.education.map((ed, idx) => (
                  <div key={idx} className="flex items-baseline justify-between">
                    <div>
                      <strong className="text-slate-900">{ed.degree}</strong> — <span className="text-slate-700">{ed.institution}</span>
                    </div>
                    {ed.year && <span className="text-[10px] text-slate-500">{ed.year}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Print-specific CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-ats-resume, #printable-ats-resume * {
            visibility: visible;
          }
          #printable-ats-resume {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  )
}
