import { mergeApplicationAssets } from "./application-assets"
import { z } from "zod"
import { prisma, withDbRetry } from "@/lib/prisma"
import { extractEvidenceTechMentions } from "./factual-grounding"
import { requireOwnedApplication } from "./ownership"
import { extractTechTagsFromText } from "@/lib/discovery/scrapers"

import { TailoredResumeSchema, ResumeRequestSchema, CandidateProjectSchema } from "./resume-schema"
export { TailoredResumeSchema, ResumeRequestSchema } from "./resume-schema"

/** Tailoring ranks and copies candidate-provided facts; it never generates new facts. */
export async function buildVerifiedResume(userId: string, input: z.infer<typeof ResumeRequestSchema>) {
  const owned = input.applicationId ? await requireOwnedApplication(userId, input.applicationId) : null
  const [user, profile, resume] = await Promise.all([
    withDbRetry(() => prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })),
    withDbRetry(() => prisma.userProfile.findUnique({ where: { userId }, select: { strengths: true, bestProjects: true, location: true, linkedInUrl: true, githubUrl: true, portfolioUrl: true } })),
    withDbRetry(() => prisma.resume.findFirst({ where: { userId, ...(input.resumeId ? { id: input.resumeId } : { isDefault: true }) }, select: { textContent: true, fileUrl: true } })),
  ])
  const raw = resume?.textContent?.slice(0, 60000) || ""
  if (resume?.fileUrl === "/api/resumes/download/preview") throw new Error("Add your resume from an original source; legacy generated resumes need fact verification first")
  const projects = z.array(CandidateProjectSchema).safeParse(profile?.bestProjects)
  if (!raw.trim() && !profile?.strengths?.trim() && (!projects.success || !projects.data.length)) throw new Error("Add your resume or verified profile facts before tailoring")
  let structured: z.infer<typeof TailoredResumeSchema> | undefined
  try { structured = TailoredResumeSchema.parse(JSON.parse(raw)) } catch { /* plain text source */ }
  const sourceSkills = structured?.skillsByDomain.flatMap((d) => d.skills) || extractEvidenceTechMentions(`${raw}\n${profile?.strengths || ""}`)
  const jdSkills = extractTechTagsFromText(input.jdText).map((s) => s.toLowerCase())
  const relevance = (value: string) => jdSkills.filter((s) => value.toLowerCase().includes(s)).length
  const skills = [...new Set(sourceSkills)].sort((a, b) => relevance(b) - relevance(a)).slice(0, 40)
  const matchScore = jdSkills.length ? Math.round(jdSkills.filter((s) => skills.some((k) => k.toLowerCase() === s)).length / jdSkills.length * 100) : undefined
  const data = TailoredResumeSchema.parse({
    header: { ...(structured?.header || {}), fullName: user?.name || structured?.header.fullName || "", email: user?.email || structured?.header.email || "", title: structured?.header.title || "", location: profile?.location || structured?.header.location, linkedinUrl: profile?.linkedInUrl || structured?.header.linkedinUrl, githubUrl: profile?.githubUrl || structured?.header.githubUrl, portfolioUrl: profile?.portfolioUrl || structured?.header.portfolioUrl },
    summary: structured?.summary || raw.split(/\n/).map((s) => s.trim()).find((s) => s.length > 40 && s.length < 1000) || profile?.strengths || "",
    skillsByDomain: skills.length ? [{ domain: "Candidate-provided skills", skills }] : [],
    experience: structured?.experience || [],
    projects: structured?.projects || (projects.success ? projects.data.map((p) => ({ name: p.name, stack: typeof p.stack === "string" ? p.stack.split(/[,|/]+/).map((s) => s.trim()) : p.stack || [], bullets: p.description ? [p.description] : [] })) : []),
    education: structured?.education || [],
    targetCompany: owned?.companyName || input.targetCompany, targetRole: owned?.jobTitle || input.targetRole,
    matchScore, generatedAt: new Date().toISOString(),
  })
  if (owned) {
    await mergeApplicationAssets(userId, owned.id, { resumeData: data })
  }
  return { data, matchScore, applicationId: owned?.id, evidenceSource: "candidate-provided", scoreKind: "skill-overlap", previewOnly: !owned }
}
