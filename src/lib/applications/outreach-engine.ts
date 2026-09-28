/**
 * Multi-Channel Executive Outreach Engine (Linear / Stripe Standard)
 * Generates context-aware, 100% placeholder-free outreach messages for:
 * 1. Direct Application Email
 * 2. LinkedIn InMail / Recruiter DM
 * 3. LinkedIn Connection Request Note (<300 characters)
 * 4. 5-7 Day Follow-Up Note
 */

export type OutreachChannel = "email" | "linkedin_dm" | "linkedin_connect" | "follow_up"

export interface OutreachChannelContent {
  subject?: string
  body: string
  charCount?: number
}

export interface OutreachChannelBundle {
  email: { subject: string; body: string }
  linkedin_dm: { subject: string; body: string }
  linkedin_connect: { body: string; charCount: number }
  follow_up: { subject: string; body: string }
}

export interface OutreachContext {
  companyName: string
  jobTitle: string
  candidateName: string
  candidateEmail?: string
  githubUrl?: string
  linkedinUrl?: string
  portfolioUrl?: string
  skills?: string[]
  topProjects?: Array<{ name: string; stack?: string; description?: string }>
  location?: string
  notes?: string
}

/**
 * Extracts a real, non-placeholder contact email from JD or notes.
 * Strictly ignores bogus dummy emails like "hr@company.com", "john@example.com".
 */
export function extractContactEmail(text: string = ""): string | null {
  if (!text) return null
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  const matches = text.match(emailRegex) || []
  
  const dummyDomains = ["company.com", "example.com", "yourcompany.com", "domain.com", "acme.com", "test.com"]
  
  const valid = matches.find((email) => {
    const domain = email.split("@")[1]?.toLowerCase()
    return domain && !dummyDomains.includes(domain)
  })

  return valid || null
}

/**
 * Zero-tolerance placeholder sanitizer.
 * Guarantees that NO bracketed tokens like [Hiring Manager/Recruiter] or [Your Name] leak into user view.
 */
export function sanitizeOutreachPlaceholders(text: string = "", ctx: OutreachContext): string {
  if (!text) return ""

  const company = ctx.companyName || "the team"
  const role = ctx.jobTitle || "the open role"
  const candidate = ctx.candidateName || "Candidate"

  let cleaned = text
    // Replace greetings with natural company references
    .replace(/\[\s*Hiring\s*Manager(?:\/Recruiter|\/Team)?\s*\]/gi, `${company} Hiring Team`)
    .replace(/\[\s*Recruiter(?:\/Hiring\s*Manager)?\s*\]/gi, `${company} Recruiter`)
    .replace(/\[\s*Team(?:\/Name)?\s*\]/gi, `${company} Team`)
    .replace(/\[\s*Name(?:\/Title)?\s*\]/gi, `${company} Team`)
    // Replace candidate info
    .replace(/\[\s*(?:Your\s*Name|Candidate(?:\s*Name)?)\s*\]/gi, candidate)
    .replace(/\[\s*Company(?:\s*Name)?\s*\]/gi, company)
    .replace(/\[\s*(?:Job|Role)(?:\s*Title)?\s*\]/gi, role)
    // Replace links
    .replace(/\[\s*(?:GitHub(?:\s*Link|\s*URL)?)\s*\]/gi, ctx.githubUrl || "my GitHub profile")
    .replace(/\[\s*(?:LinkedIn(?:\s*Link|\s*URL)?)\s*\]/gi, ctx.linkedinUrl || "my LinkedIn profile")
    .replace(/\[\s*(?:Portfolio(?:\s*Link|\s*URL)?)\s*\]/gi, ctx.portfolioUrl || "my portfolio")
    .replace(/\[\s*(?:Email(?:\s*Address)?)\s*\]/gi, ctx.candidateEmail || "")

  // Remove common template artifacts
  cleaned = cleaned.replace(/\[\s*Insert\s*[^\]]+\]/gi, "")
  cleaned = cleaned.replace(/\[\s*Optional:[^\]]+\]/gi, "")
  cleaned = cleaned.replace(/\[\s*e\.g\.[^\]]+\]/gi, "")

  // Catch any remaining bracketed tokens
  cleaned = cleaned.replace(/\[\s*([^\]]+)\s*\]/g, (_m, inner) => {
    const lower = String(inner).toLowerCase()
    if (lower.includes("name")) return candidate
    if (lower.includes("company")) return company
    if (lower.includes("role") || lower.includes("job")) return role
    if (lower.includes("link") || lower.includes("url")) return ctx.portfolioUrl || ctx.githubUrl || ""
    return inner.trim()
  })

  // Strip empty brackets, normalize spacing and multiple linebreaks
  return cleaned
    .replace(/\[\s*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Generates an authentic, fully contextual 4-channel outreach bundle
 * with ZERO placeholders and instant submit readiness.
 */
export function generateDeterministicOutreachBundle(ctx: OutreachContext): OutreachChannelBundle {
  const company = ctx.companyName || "the team"
  const role = ctx.jobTitle || "Software Engineer"
  const candidate = ctx.candidateName || "Candidate"
  
  const projects = Array.isArray(ctx.topProjects) ? ctx.topProjects : []
  const topProj = projects[0] || {
    name: "Full-Stack Web Architecture",
    stack: "React, TypeScript, Next.js, Node.js",
    description: "production scalable systems with database persistence",
  }
  const skillsList = ctx.skills && ctx.skills.length > 0
    ? ctx.skills.slice(0, 4).join(", ")
    : "TypeScript, React, Next.js, and Node.js"

  const linksLine = [
    ctx.portfolioUrl ? `Portfolio: ${ctx.portfolioUrl}` : null,
    ctx.githubUrl ? `GitHub: ${ctx.githubUrl}` : null,
    ctx.linkedinUrl ? `LinkedIn: ${ctx.linkedinUrl}` : null,
  ].filter(Boolean).join(" | ")

  // 1. Full Direct Email (3 structured paragraphs)
  const emailSubject = `Application for ${role} - ${candidate}`
  const emailBody = `Dear ${company} Hiring Team,

I am writing to express my strong interest in the ${role} position at ${company}. Having architected scalable web applications with ${skillsList}, I am excited by ${company}'s work and would love to contribute to your engineering team.

Recently, I engineered "${topProj.name}" using ${topProj.stack || skillsList}, focusing on clean modular architecture, high performance, and reliable state management. My engineering approach centers on delivering measurable product impact while writing clean, type-safe, maintainable code.

I would welcome the opportunity to discuss how my hands-on build experience aligns with ${company}'s upcoming milestones. Are you open to a brief 10-minute intro chat this week?

Best regards,
${candidate}
${ctx.candidateEmail ? `${ctx.candidateEmail}\n` : ""}${linksLine ? `${linksLine}\n` : ""}`.trim()

  // 2. LinkedIn InMail / Recruiter DM (< 90 words, conversational & direct)
  const linkedinDmSubject = `${role} role inquiry - ${candidate}`
  const linkedinDmBody = `Hi ${company} Team,

I saw the opening for the ${role} position at ${company} and wanted to reach out directly.

I've been engineering full-stack applications with ${skillsList}, recently building ${topProj.name} (${topProj.stack || "modern web stack"}). Given ${company}'s tech focus, I'm confident I can make an immediate contribution to your team's roadmap.

Are you the right person leading this search, or could you point me to who is? Would love to share my portfolio if you have 5 minutes.

Best regards,
${candidate}`.trim()

  // 3. LinkedIn Connection Note (Strict <= 300 characters for LinkedIn connection modal)
  let connectRaw = `Hi! I saw the ${role} opening at ${company}. I've recently built ${topProj.name} with ${skillsList}. Would love to connect and follow ${company}'s engineering work!`
  if (connectRaw.length > 295) {
    connectRaw = `Hi! I saw the ${role} role at ${company}. I specialize in ${skillsList} (e.g. ${topProj.name}) and would love to connect with your team.`
  }
  if (connectRaw.length > 295) {
    connectRaw = `Hi! I saw the ${role} opening at ${company}. I specialize in ${skillsList} and would love to connect!`
  }
  const connectBody = connectRaw.slice(0, 300)

  // 4. 5-7 Day Follow-Up
  const followUpSubject = `Following up: ${role} application - ${candidate}`
  const followUpBody = `Dear ${company} Hiring Team,

I hope your week is going well.

I am writing to briefly follow up on my application for the ${role} position at ${company}. I remain very enthusiastic about the opportunity to contribute with my experience in ${skillsList}.

Since applying, I've continued building and would be delighted to answer any questions or provide code samples. If there are any updates regarding the hiring timeline, please let me know.

Thank you again for your time and consideration.

Best regards,
${candidate}`.trim()

  return {
    email: {
      subject: sanitizeOutreachPlaceholders(emailSubject, ctx),
      body: sanitizeOutreachPlaceholders(emailBody, ctx),
    },
    linkedin_dm: {
      subject: sanitizeOutreachPlaceholders(linkedinDmSubject, ctx),
      body: sanitizeOutreachPlaceholders(linkedinDmBody, ctx),
    },
    linkedin_connect: {
      body: sanitizeOutreachPlaceholders(connectBody, ctx),
      charCount: connectBody.length,
    },
    follow_up: {
      subject: sanitizeOutreachPlaceholders(followUpSubject, ctx),
      body: sanitizeOutreachPlaceholders(followUpBody, ctx),
    },
  }
}
