/**
 * Multi-Channel Executive Outreach Engine (Linear / Stripe Standard)
 * Generates context-aware, 100% placeholder-free outreach messages for:
 * 1. Direct Application Email
 * 2. LinkedIn InMail / Recruiter DM
 * 3. LinkedIn Connection Request Note (<300 characters)
 * 4. 5-7 Day Follow-Up Note
 */

export type OutreachChannel = "email" | "linkedin_dm" | "linkedin_connect" | "follow_up" | "form_portal"

export interface ScreenerQA {
  question: string
  answer: string
}

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
  form_portal?: { portalNote: string; screenerAnswers: ScreenerQA[] }
}

export interface ApplicationStrategyDetection {
  strategy: OutreachChannel
  reason: string
  detectedEmail: string | null
  portalUrl?: string | null
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
 * Intelligently prunes a raw technology list down to the 2-4 most impactful,
 * non-redundant tools matching the target role or JD context.
 * Prevents "buzzword soup" (e.g. dumping 14 technologies in one sentence).
 */
export function pruneRelevantStack(
  stack: string | string[] = "",
  roleOrJd: string = "",
  maxItems: number = 3
): string {
  const rawList = Array.isArray(stack)
    ? stack
    : stack
        .split(/[,/|\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

  if (rawList.length === 0) {
    return "TypeScript, Next.js, and Node.js"
  }

  // Deduplication & redundant pair elimination (e.g. drop JavaScript if TypeScript is present)
  const normalized = Array.from(new Set(rawList))
  const hasTs = normalized.some((t) => /typescript|\bts\b/i.test(t))
  const hasNext = normalized.some((t) => /next(?:\.?js)?/i.test(t))
  const hasTailwind = normalized.some((t) => /tailwind/i.test(t))

  const filtered = normalized.filter((tech) => {
    // If TypeScript exists, drop plain JavaScript
    if (hasTs && /^(?:javascript|js)$/i.test(tech.trim())) return false
    // If Next.js exists and we have > 3 items, drop generic React
    if (hasNext && normalized.length > 3 && /^react(?:\.?js)?$/i.test(tech.trim())) return false
    // If Tailwind exists, drop generic CSS
    if (hasTailwind && /^(?:css|css3)$/i.test(tech.trim())) return false
    return true
  })

  // Prioritize tools that match the target role or JD
  const roleTerms = roleOrJd.toLowerCase().split(/[^a-z0-9.+]+/).filter(Boolean)
  const scored = filtered.map((tech) => {
    const techLower = tech.toLowerCase()
    let score = 0
    for (const term of roleTerms) {
      if (term.length > 1 && techLower.includes(term)) {
        score += 3
      }
    }
    // High-value modern web anchors get a baseline boost
    if (/next|typescript|node|react|websockets?|mongodb|postgres|docker/i.test(techLower)) {
      score += 1
    }
    return { tech, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const topSlice = scored.slice(0, Math.max(1, maxItems)).map((s) => s.tech)

  if (topSlice.length === 1) return topSlice[0]
  if (topSlice.length === 2) return `${topSlice[0]} and ${topSlice[1]}`
  return `${topSlice.slice(0, -1).join(", ")}, and ${topSlice[topSlice.length - 1]}`
}

/**
 * Generates an authentic, fully contextual 4-channel outreach bundle
 * with ZERO placeholders and instant submit readiness.
 * Follows the 5-part high-conversion builder standard (Hook, Hero Project, Metric, Bridge, Low-friction CTA).
 */
export function generateDeterministicOutreachBundle(ctx: OutreachContext): OutreachChannelBundle {
  const company = ctx.companyName || "the team"
  const role = ctx.jobTitle || "Software Engineer"
  const candidate = ctx.candidateName || "Candidate"
  
  const projects = Array.isArray(ctx.topProjects) ? ctx.topProjects : []
  const topProj = projects[0] || {
    name: "Full-Stack Web Architecture",
    stack: "TypeScript, Next.js, Node.js",
    description: "production scalable systems with database persistence",
  }

  // Prune skills and project stack to eliminate buzzword-stuffing
  const prunedSkills = pruneRelevantStack(ctx.skills || "TypeScript, React, Next.js, Node.js", role, 3)
  const prunedProjStack = pruneRelevantStack(topProj.stack || prunedSkills, role, 3)

  const linksLine = [
    ctx.portfolioUrl ? `Portfolio: ${ctx.portfolioUrl}` : null,
    ctx.githubUrl ? `GitHub: ${ctx.githubUrl}` : null,
    ctx.linkedinUrl ? `LinkedIn: ${ctx.linkedinUrl}` : null,
  ].filter(Boolean).join(" | ")

  // 1. Full Direct Email (Linear/Stripe builder standard, under 110 words)
  const emailSubject = `Application for ${role} - ${candidate}`
  const emailBody = `Dear ${company} Hiring Team,

I noticed ${company} is looking for a ${role}. Given my background engineering scalable web applications with ${prunedSkills}, I wanted to reach out directly.

Recently, I engineered ${topProj.name} using ${prunedProjStack}. I focused on solving core architectural challenges around real-time performance and state consistency, keeping latency low and code modular.

Given ${company}'s focus on shipping high-velocity products, I can make an immediate impact on your upcoming milestones. Would you be open to a brief 10-minute intro chat this week?

Best regards,
${candidate}
${ctx.candidateEmail ? `${ctx.candidateEmail}\n` : ""}${linksLine ? `${linksLine}\n` : ""}`.trim()

  // 2. LinkedIn InMail / Recruiter DM (< 90 words, conversational & direct)
  const linkedinDmSubject = `${role} role inquiry - ${candidate}`
  const linkedinDmBody = `Hi ${company} Team,

I saw the opening for the ${role} position at ${company} and wanted to reach out directly.

I specialize in full-stack architecture with ${prunedSkills}, recently building ${topProj.name} (${prunedProjStack}). Given ${company}'s tech roadmap, I'm confident I can make an immediate contribution to your engineering velocity.

Are you the right person leading this search, or could you point me to who is? Would love to share my portfolio if you have 5 minutes.

Best regards,
${candidate}`.trim()

  // 3. LinkedIn Connection Note (Strict <= 300 characters for LinkedIn connection modal)
  let connectRaw = `Hi! I saw the ${role} opening at ${company}. I recently built ${topProj.name} with ${prunedProjStack}. Would love to connect and follow ${company}'s engineering work!`
  if (connectRaw.length > 295) {
    connectRaw = `Hi! I saw the ${role} role at ${company}. I specialize in ${prunedSkills} (e.g. ${topProj.name}) and would love to connect with your team.`
  }
  if (connectRaw.length > 295) {
    connectRaw = `Hi! I saw the ${role} opening at ${company}. I specialize in ${prunedSkills} and would love to connect!`
  }
  const connectBody = connectRaw.slice(0, 300)

  // 4. 5-7 Day Follow-Up (Courteous, sharp, under 90 words)
  const followUpSubject = `Following up: ${role} application - ${candidate}`
  const followUpBody = `Dear ${company} Hiring Team,

I wanted to briefly follow up on my application for the ${role} position at ${company}. I remain very enthusiastic about the opportunity to contribute with my experience in ${prunedSkills}.

Since applying, I've continued building and would be delighted to answer any questions or share code samples. If there are any updates regarding your hiring timeline, please let me know.

Thank you again for your time and consideration.

Best regards,
${candidate}`.trim()

  const portalNote = `I noticed ${company} is looking for a ${role}. Given my background engineering scalable web applications with ${prunedSkills}, I am excited to apply.

Recently, I engineered ${topProj.name} using ${prunedProjStack}, focusing on real-time performance and clean modular architecture. Given ${company}'s shipping velocity, I am confident I can make an immediate contribution to your engineering roadmap.

Portfolio & Code: ${linksLine || "Available on profile"}`.trim()

  const screenerAnswers = generateDeterministicScreenerAnswers(ctx)

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
    form_portal: {
      portalNote: sanitizeOutreachPlaceholders(portalNote, ctx),
      screenerAnswers: screenerAnswers.map((qa) => ({
        question: sanitizeOutreachPlaceholders(qa.question, ctx),
        answer: sanitizeOutreachPlaceholders(qa.answer, ctx),
      })),
    },
  }
}

/**
 * Intelligently detects the most effective application channel/strategy based on
 * JD text instructions, job posting URL (e.g. Greenhouse, Lever, Workday), and source.
 * Prevents token waste by generating only what the candidate needs to submit.
 */
export function detectApplicationStrategy(
  rawJd: string = "",
  source: string = "",
  jobUrl: string | null = ""
): ApplicationStrategyDetection {
  const detectedEmail = extractContactEmail(rawJd)
  const lowerJd = rawJd.toLowerCase()
  const lowerUrl = (jobUrl || "").toLowerCase()
  const lowerSource = (source || "").toLowerCase()

  // 1. Explicit email application instructions (e.g. "email your resume to jobs@...")
  const hasEmailCallToAction =
    /\b(?:send|email|forward|submit)\s+(?:your\s+)?(?:resume|cv|portfolio|application)\s+to\b/i.test(rawJd) ||
    /\bapply\s+(?:via|by|at)\s+email\b/i.test(rawJd)

  // 2. ATS or online application portal patterns
  const isAtsUrl =
    lowerUrl.includes("greenhouse.io") ||
    lowerUrl.includes("lever.co") ||
    lowerUrl.includes("workday.com") ||
    lowerUrl.includes("ashbyhq.com") ||
    lowerUrl.includes("smartrecruiters.com") ||
    lowerUrl.includes("bamboohr.com") ||
    lowerUrl.includes("breezy.hr") ||
    lowerUrl.includes("apply") ||
    lowerUrl.includes("jobs.") ||
    lowerUrl.includes("careers.") ||
    lowerUrl.includes("myworkdayjobs")

  const hasFormInstructions =
    lowerJd.includes("apply online") ||
    lowerJd.includes("application form") ||
    lowerJd.includes("submit your application below") ||
    lowerJd.includes("apply via link") ||
    lowerJd.includes("fill out the form")

  // If explicit email instruction or direct email found with no ATS link
  if (detectedEmail && (hasEmailCallToAction || !isAtsUrl)) {
    return {
      strategy: "email",
      reason: `Direct contact email found (${detectedEmail}). Prepared direct application email.`,
      detectedEmail,
      portalUrl: jobUrl,
    }
  }

  // 3. LinkedIn recruiter / DM
  const isLinkedInSource = lowerSource.includes("linkedin")
  const hasLinkedInDmPrompt =
    lowerJd.includes("message me") ||
    lowerJd.includes("reach out directly on linkedin") ||
    lowerJd.includes("dm me") ||
    lowerJd.includes("connect on linkedin")

  if (hasLinkedInDmPrompt || (isLinkedInSource && !isAtsUrl && !detectedEmail && !hasFormInstructions)) {
    return {
      strategy: "linkedin_dm",
      reason: "Direct LinkedIn outreach prompt detected. Prepared recruiter message.",
      detectedEmail: null,
      portalUrl: jobUrl,
    }
  }

  // 4. Default to ATS / Portal Form mode when an ATS URL, web application form, or external job link exists
  return {
    strategy: "form_portal",
    reason: isAtsUrl
      ? "ATS application portal detected. Prepared concise portal note and copyable screener Q&A answers."
      : "Application submission via careers portal. Prepared targeted screener Q&A answers.",
    detectedEmail,
    portalUrl: jobUrl,
  }
}

/**
 * Generates targeted, high-conversion screener answers for ATS application forms.
 * Addresses typical questions asked by Greenhouse, Lever, Workday, etc.
 */
export function generateDeterministicScreenerAnswers(
  ctx: OutreachContext,
  roleDomain: string = "fullstack"
): ScreenerQA[] {
  const company = ctx.companyName || "the team"
  const role = ctx.jobTitle || "Software Engineer"
  const prunedSkills = pruneRelevantStack(ctx.skills || "TypeScript, React, Next.js, Node.js", role, 3)
  const topProj = ctx.topProjects?.[0] || {
    name: "Full-Stack Web Architecture",
    stack: "TypeScript, Next.js, Node.js",
  }

  const domainFocus =
    roleDomain === "frontend"
      ? "ensuring responsive UI state synchronization and smooth client rendering"
      : roleDomain === "backend"
      ? "optimizing API response times, database query performance, and reliable server architecture"
      : "shipping end-to-end features with type-safe APIs and responsive user interfaces"

  return [
    {
      question: `Why are you interested in joining ${company} as a ${role}?`,
      answer: `I admire ${company}'s product engineering focus. Having hands-on experience building production systems with ${prunedSkills}, I am eager to apply my background in ${domainFocus} to help your team ship faster.`,
    },
    {
      question: `Describe a recent technical project you built with ${prunedSkills} and the primary engineering challenge solved.`,
      answer: `I recently engineered ${topProj.name} using ${prunedSkills}. The core challenge was keeping latency low and code modular while handling high-frequency state updates. I structured clean component boundaries and optimized data flow to ensure rock-solid performance.`,
    },
    {
      question: `What is your work authorization, availability, or preferred work arrangement?`,
      answer: `I am available to start immediately or within two weeks. I thrive in remote or hybrid teams with asynchronous communication, thorough documentation, and core collaboration overlaps.`,
    },
  ]
}
