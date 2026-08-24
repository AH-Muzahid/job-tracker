export interface TailoredResumeData {
  header: {
    fullName: string
    title: string
    email: string
    location?: string
    phone?: string
    linkedinUrl?: string
    githubUrl?: string
    portfolioUrl?: string
  }
  summary: string
  skillsByDomain: Array<{
    domain: string
    skills: string[]
  }>
  experience: Array<{
    role: string
    company: string
    location?: string
    duration: string
    bullets: string[]
  }>
  projects: Array<{
    name: string
    stack: string[]
    bullets: string[]
    link?: string
  }>
  education: Array<{
    degree: string
    institution: string
    year?: string
  }>
  targetCompany?: string
  targetRole?: string
  matchScore?: number
  generatedAt?: string
}
