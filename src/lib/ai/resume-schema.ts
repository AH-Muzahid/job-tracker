import { z } from "zod"

const text = z.string().max(12000)
const webLink = z.string().max(2048).url().refine((value) => ["https:", "http:"].includes(new URL(value).protocol))
const optionalWebLink = z.preprocess((value) => value === "" || value === null ? undefined : value, webLink.optional())
export const CandidateProjectSchema = z.object({ name: text, stack: z.union([text, z.array(text)]).optional(), description: text.optional() })
export const TailoredResumeSchema = z.object({
  header: z.object({ fullName: text, title: text, email: text, location: text.optional(), phone: text.optional(), linkedinUrl: optionalWebLink, githubUrl: optionalWebLink, portfolioUrl: optionalWebLink }),
  summary: text,
  skillsByDomain: z.array(z.object({ domain: text, skills: z.array(text).max(100) })).max(12),
  experience: z.array(z.object({ role: text, company: text, duration: text, location: text.optional(), bullets: z.array(text).max(30) })).max(30),
  projects: z.array(z.object({ name: text, stack: z.array(text).max(50), bullets: z.array(text).max(30), link: optionalWebLink })).max(30),
  education: z.array(z.object({ degree: text, institution: text, year: text.optional() })).max(20),
  targetCompany: text.optional(), targetRole: text.optional(), matchScore: z.number().min(0).max(100).optional(), generatedAt: text.optional(),
})
export const ResumeRequestSchema = z.object({ jdText: z.string().min(20).max(30000), targetRole: z.string().max(200).optional(), targetCompany: z.string().max(200).optional(), applicationId: z.string().min(1).max(128).optional(), resumeId: z.string().max(128).optional() })
