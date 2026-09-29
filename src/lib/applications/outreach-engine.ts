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
  email?: { subject: string; body: string }
  linkedin_dm?: { subject: string; body: string }
  linkedin_connect?: { body: string; charCount: number }
  follow_up?: { subject: string; body: string }
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
 * Synthesizes a clean, standard human job title from a hashtag-heavy string
 * (e.g. "#hiring #wearehiring #juniordeveloper #fullstackdeveloper #mernstack ...")
 */
export function synthesizeTitleFromHashtags(text: string): string {
  if (!text) return "Software Engineer"
  const lower = text.toLowerCase()

  // 1. Detect Seniority
  let seniority = ""
  if (/\b(?:intern|internship|co-?op)\b|#intern\b|#internship\b/.test(lower)) {
    seniority = "Intern"
  } else if (/\b(?:trainee|apprentice)\b|#trainee\b/.test(lower)) {
    seniority = "Trainee"
  } else if (/\b(?:junior|jr\.?|entry-?level|fresher)\b|#junior|#jr\b|#entrylevel\b|#fresher\b/.test(lower)) {
    seniority = "Junior"
  } else if (/\b(?:lead|principal|staff)\b|#lead\b|#principal\b|#staff\b/.test(lower)) {
    seniority = "Lead"
  } else if (/\b(?:senior|sr\.?)\b|#senior|#sr\b/.test(lower)) {
    seniority = "Senior"
  }

  // 2. Detect Domain / Role
  let role = "Software Engineer"
  if (/full-?stack|mern|mean|fullstack|mernstack|meanstack/i.test(lower)) {
    role = "Full Stack Developer"
  } else if (/front-?end|frontend|react|vue|angular|nextjs|svelte/i.test(lower)) {
    role = "Frontend Developer"
  } else if (/back-?end|backend|nodejs|express|django|fastapi|golang|python|spring|ruby|rails/i.test(lower)) {
    role = "Backend Developer"
  } else if (/mobile|ios|android|flutter|reactnative|swift|kotlin/i.test(lower)) {
    role = "Mobile Developer"
  } else if (/devops|cloud|sre|infrastructure|kubernetes|docker|aws|azure/i.test(lower)) {
    role = "DevOps Engineer"
  } else if (/ai|machine\s*learning|machinelearning|deeplearning|llm/i.test(lower)) {
    role = "AI Engineer"
  } else if (/qa|quality\s*assurance|tester|testing|automation/i.test(lower)) {
    role = "QA Engineer"
  } else if (/ui[/-]?ux|uiux|product\s*design|productdesign/i.test(lower)) {
    role = "UI/UX Designer"
  } else if (/web\s*dev|webdevelopment|webdeveloper/i.test(lower)) {
    role = "Web Developer"
  } else if (/software\s*dev|softwaredeveloper|softwareengineer|developer|engineer/i.test(lower)) {
    role = "Software Engineer"
  }

  if (seniority) {
    if (role.toLowerCase().startsWith(seniority.toLowerCase())) {
      return role
    }
    return `${seniority} ${role}`
  }

  return role
}

/**
 * Normalizes, strips social media hashtags, recruiter buzzwords, emojis, and noise
 * from raw job titles.
 * Guarantees an authentic, human-readable job title suitable for executive outreach
 * and official applications.
 */
export function cleanJobTitle(rawTitle: string = ""): string {
  if (!rawTitle || typeof rawTitle !== "string") return "Software Engineer"

  // 1. Decode basic HTML entities
  let title = rawTitle
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")

  // 2. Strip URLs and email addresses
  title = title
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\S+@\S+\.[a-z]{2,}/gi, "")

  // 3. Strip emojis & miscellaneous symbols
  title = title.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
    ""
  )

  // 4. Check for hashtag dominance or raw hashtag soup
  const hashtagMatches = title.match(/#[a-zA-Z0-9_]+/g) || []
  const textWithoutHashtags = title.replace(/#[a-zA-Z0-9_]+/g, "").replace(/[.…]+$/g, "").trim()

  const isHashtagSoup =
    hashtagMatches.length >= 2 ||
    (hashtagMatches.length >= 1 && textWithoutHashtags.length < 5) ||
    title.trim().startsWith("#") ||
    /^(?:we\s+are\s+)?hiring\s*$/i.test(textWithoutHashtags)

  if (isHashtagSoup) {
    const words = textWithoutHashtags.split(/\s+/).filter(Boolean)
    const hasCoreTechWord = /\b(developer|engineer|fullstack|frontend|backend|devops|designer|architect|intern|programmer)\b/i.test(
      textWithoutHashtags
    )

    if (words.length >= 2 && hasCoreTechWord && textWithoutHashtags.length >= 8) {
      title = textWithoutHashtags
    } else {
      return synthesizeTitleFromHashtags(rawTitle)
    }
  } else {
    title = textWithoutHashtags || title
  }

  // 5. Strip common recruiter announcements and prefixes
  const prefixRegex =
    /^(?:we(?:'re|\s+are)\s+(?:urgently\s+)?hiring|hiring\s+alert|urgent\s+(?:opening|hiring|requirement)|immediate\s+(?:opening|requirement)(?:\s+for)?|job\s+(?:alert|opening|opportunity)|open\s+position(?:\s+for)?|looking\s+for(?:\s+an?)?|seeking(?:\s+an?)?|new\s+role|opportunity\s+for|we\s+need|hiring)\s*[:\-–—|•]?\s*/i
  title = title.replace(prefixRegex, "")

  // 6. Strip trailing recruiter noise & parenthetical clutter
  title = title.replace(
    /\s*[\(\[]\s*(?:remote|hybrid|onsite|on-site|immediate\s+joiner|urgent|full\s*time|part\s*time|contract|internship|f\/m\/d|m\/f\/d|m\/w\/d|m\/f\/x|\d+[\s\-\+]*(?:years?|yrs?)(?:\s+exp(?:erience)?)?|us|usa|uk|eu|apac|emea|bangalore|dhaka|india|remote\s*-\s*[a-z]+)\s*[\)\]]/gi,
    ""
  )

  // Strip trailing delimiter noise: e.g. " - Remote", " | Immediate Joiner"
  title = title.replace(
    /\s*[-–—|•]\s*(?:100%\s*)?(?:remote|hybrid|onsite|on-site|full\s*time|part\s*time|immediate\s+joiner|urgent|apply\s+now).*$/i,
    ""
  )

  // Strip trailing ellipses & dots
  title = title.replace(/[.…]+$/g, "")

  // Clean edge delimiters
  title = title.replace(/^[\s\-–—:|•/]+|[\s\-–—:|•/]+$/g, "").replace(/\s+/g, " ").trim()

  if (!title || title.length < 3) {
    return synthesizeTitleFromHashtags(rawTitle) || "Software Engineer"
  }

  // Capitalize properly if all-caps or all-lowercase
  if (title === title.toUpperCase() || title === title.toLowerCase()) {
    title = title
      .split(" ")
      .map((w) => {
        const lower = w.toLowerCase()
        if (lower === "next.js" || lower === "nextjs") return "Next.js"
        if (lower === "node.js" || lower === "nodejs") return "Node.js"
        if (lower === "react.js" || lower === "reactjs") return "React"
        if (lower === "vue.js" || lower === "vuejs") return "Vue.js"
        if (lower === "ui/ux" || lower === "uiux") return "UI/UX"
        if (lower === "ai" || lower === "ml" || lower === "qa" || lower === "sre" || lower === "api") return lower.toUpperCase()
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      })
      .join(" ")
  }

  return title
}

/**
 * Zero-tolerance placeholder sanitizer.
 * Guarantees that NO bracketed tokens like [Hiring Manager/Recruiter] or [Your Name] leak into user view.
 */
export function sanitizeOutreachPlaceholders(text: string = "", ctx: OutreachContext): string {
  if (!text) return ""

  const company = ctx.companyName || "the team"
  const role = cleanJobTitle(ctx.jobTitle) || "the open role"
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

  // Eradicate any remaining social media hashtag blocks in text
  cleaned = cleaned.replace(/(?:#[a-zA-Z0-9_]+\s*){2,}/g, role)
  cleaned = cleaned.replace(/#[a-zA-Z0-9_]{2,}/g, "")

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
  const cleanedRole = cleanJobTitle(roleOrJd)
  const roleTerms = `${cleanedRole} ${roleOrJd}`.toLowerCase().split(/[^a-z0-9.+]+/).filter(Boolean)
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
 * Generates an authentic, fully contextual outreach bundle with ZERO placeholders.
 * When targetChannel is specified, generates ONLY that specific channel to prevent token waste
 * and avoid cluttering the candidate dossier.
 */
export function generateDeterministicOutreachBundle(
  ctx: OutreachContext,
  targetChannel?: OutreachChannel,
  customQuestions?: string[]
): OutreachChannelBundle {
  const company = ctx.companyName || "the team"
  const role = cleanJobTitle(ctx.jobTitle) || "Software Engineer"
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

  const bundle: OutreachChannelBundle = {}

  // 1. Full Direct Email (Linear/Stripe builder standard, under 110 words)
  if (!targetChannel || targetChannel === "email") {
    const emailSubject = `Application for ${role} - ${candidate}`
    const emailBody = `Dear ${company} Hiring Team,

I noticed ${company} is looking for a ${role}. Given my background engineering scalable web applications with ${prunedSkills}, I wanted to reach out directly.

Recently, I engineered ${topProj.name} using ${prunedProjStack}. I focused on solving core architectural challenges around real-time performance and state consistency, keeping latency low and code modular.

Given ${company}'s focus on shipping high-velocity products, I can make an immediate impact on your upcoming milestones. Would you be open to a brief 10-minute intro chat this week?

Best regards,
${candidate}
${ctx.candidateEmail ? `${ctx.candidateEmail}\n` : ""}${linksLine ? `${linksLine}\n` : ""}`.trim()

    bundle.email = {
      subject: sanitizeOutreachPlaceholders(emailSubject, ctx),
      body: sanitizeOutreachPlaceholders(emailBody, ctx),
    }
  }

  // 2. LinkedIn InMail / Recruiter DM (< 90 words, conversational & direct)
  if (!targetChannel || targetChannel === "linkedin_dm") {
    const linkedinDmSubject = `${role} role inquiry - ${candidate}`
    const linkedinDmBody = `Hi ${company} Team,

I saw the opening for the ${role} position at ${company} and wanted to reach out directly.

I specialize in full-stack architecture with ${prunedSkills}, recently building ${topProj.name} (${prunedProjStack}). Given ${company}'s tech roadmap, I'm confident I can make an immediate contribution to your engineering velocity.

Are you the right person leading this search, or could you point me to who is? Would love to share my portfolio if you have 5 minutes.

Best regards,
${candidate}`.trim()

    bundle.linkedin_dm = {
      subject: sanitizeOutreachPlaceholders(linkedinDmSubject, ctx),
      body: sanitizeOutreachPlaceholders(linkedinDmBody, ctx),
    }
  }

  // 3. LinkedIn Connection Note (Strict <= 300 characters for LinkedIn connection modal)
  if (!targetChannel || targetChannel === "linkedin_connect") {
    let connectRaw = `Hi! I saw the ${role} opening at ${company}. I recently built ${topProj.name} with ${prunedProjStack}. Would love to connect and follow ${company}'s engineering work!`
    if (connectRaw.length > 295) {
      connectRaw = `Hi! I saw the ${role} role at ${company}. I specialize in ${prunedSkills} (e.g. ${topProj.name}) and would love to connect with your team.`
    }
    if (connectRaw.length > 295) {
      connectRaw = `Hi! I saw the ${role} opening at ${company}. I specialize in ${prunedSkills} and would love to connect!`
    }
    const connectBody = connectRaw.slice(0, 300)

    bundle.linkedin_connect = {
      body: sanitizeOutreachPlaceholders(connectBody, ctx),
      charCount: connectBody.length,
    }
  }

  // 4. 5-7 Day Follow-Up (Courteous, sharp, under 90 words)
  if (!targetChannel || targetChannel === "follow_up") {
    const followUpSubject = `Following up: ${role} application - ${candidate}`
    const followUpBody = `Dear ${company} Hiring Team,

I wanted to briefly follow up on my application for the ${role} position at ${company}. I remain very enthusiastic about the opportunity to contribute with my experience in ${prunedSkills}.

Since applying, I've continued building and would be delighted to answer any questions or share code samples. If there are any updates regarding your hiring timeline, please let me know.

Thank you again for your time and consideration.

Best regards,
${candidate}`.trim()

    bundle.follow_up = {
      subject: sanitizeOutreachPlaceholders(followUpSubject, ctx),
      body: sanitizeOutreachPlaceholders(followUpBody, ctx),
    }
  }

  // 5. Form Portal
  if (!targetChannel || targetChannel === "form_portal") {
    const portalNote = `I noticed ${company} is looking for a ${role}. Given my background engineering scalable web applications with ${prunedSkills}, I am excited to apply.

Recently, I engineered ${topProj.name} using ${prunedProjStack}, focusing on real-time performance and clean modular architecture. Given ${company}'s shipping velocity, I am confident I can make an immediate contribution to your engineering roadmap.

Portfolio & Code: ${linksLine || "Available on profile"}`.trim()

    const screenerAnswers = customQuestions && customQuestions.length > 0
      ? generateDeterministicScreenerAnswers(ctx, customQuestions)
      : (!targetChannel ? generateDeterministicScreenerAnswers(ctx) : [])

    bundle.form_portal = {
      portalNote: sanitizeOutreachPlaceholders(portalNote, ctx),
      screenerAnswers: screenerAnswers.map((qa) => ({
        question: sanitizeOutreachPlaceholders(qa.question, ctx),
        answer: sanitizeOutreachPlaceholders(qa.answer, ctx),
      })),
    }
  }

  return bundle
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
 * Supports custom questions provided by the candidate or default ATS screener prompts.
 */
export function generateDeterministicScreenerAnswers(
  ctx: OutreachContext,
  questionsOrDomain?: string[] | string,
  roleDomain: string = "fullstack"
): ScreenerQA[] {
  const company = ctx.companyName || "the team"
  const role = cleanJobTitle(ctx.jobTitle) || "Software Engineer"
  const prunedSkills = pruneRelevantStack(ctx.skills || "TypeScript, React, Next.js, Node.js", role, 3)
  const topProj = ctx.topProjects?.[0] || {
    name: "Full-Stack Web Architecture",
    stack: "TypeScript, Next.js, Node.js",
  }

  const resolvedDomain = typeof questionsOrDomain === "string" ? questionsOrDomain : roleDomain
  const domainFocus =
    resolvedDomain === "frontend"
      ? "ensuring responsive UI state synchronization and smooth client rendering"
      : resolvedDomain === "backend"
      ? "optimizing API response times, database query performance, and reliable server architecture"
      : "shipping end-to-end features with type-safe APIs and responsive user interfaces"

  // If specific questions were passed
  if (Array.isArray(questionsOrDomain) && questionsOrDomain.length > 0) {
    return questionsOrDomain.map((q) => {
      const qLower = q.toLowerCase()
      let answer = ""

      if (qLower.includes("why") && (qLower.includes("company") || qLower.includes("join") || qLower.includes("work") || qLower.includes("interest") || qLower.includes("role"))) {
        answer = `I admire ${company}'s engineering focus. Having hands-on experience building production systems in ${prunedSkills}, I am excited to apply my background in ${domainFocus} to help your team ship high-velocity products.`
      } else if (qLower.includes("challenge") || qLower.includes("difficult") || qLower.includes("project") || qLower.includes("built") || qLower.includes("bug") || qLower.includes("accomplish") || qLower.includes("decision") || qLower.includes("architecture")) {
        answer = `In my project ${topProj.name}, I solved core architectural and performance challenges using ${topProj.stack || prunedSkills}. I optimized component boundaries and asynchronous data flow, preventing state synchronization bottlenecks and keeping response times low.`
      } else if (qLower.includes("salary") || qLower.includes("compensation") || qLower.includes("expectation")) {
        answer = `My compensation expectation is aligned with current market rates for a ${role}, and I am open to discussing this based on the complete scope and responsibilities of the role.`
      } else if (qLower.includes("visa") || qLower.includes("authorization") || qLower.includes("sponsor") || qLower.includes("eligib") || qLower.includes("status") || qLower.includes("authorized")) {
        answer = `I am legally authorized to work and available to start immediately or within a standard two-week notice period.`
      } else if (qLower.includes("websocket") || qLower.includes("real-time") || qLower.includes("realtime")) {
        answer = `In ${topProj.name}, I implemented real-time communication using WebSockets and Node.js streams, minimizing update latency and handling state consistency across concurrent sessions.`
      } else if (qLower.includes("experience") || qLower.includes("years") || qLower.includes("stack") || qLower.includes("tech") || qLower.includes("background") || qLower.includes("how do you")) {
        answer = `I have extensive practical engineering experience with ${prunedSkills}, demonstrated in production-grade systems like ${topProj.name}. I specialize in modular architecture, end-to-end type safety, and shipping clean, reliable user experiences.`
      } else {
        answer = `In my work on ${topProj.name}, I approach engineering challenges pragmatically, combining ${prunedSkills} with thorough testing, autonomous ownership, and clear communication to deliver reliable results for ${company}.`
      }

      return {
        question: sanitizeOutreachPlaceholders(q, ctx),
        answer: sanitizeOutreachPlaceholders(answer, ctx),
      }
    })
  }

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
