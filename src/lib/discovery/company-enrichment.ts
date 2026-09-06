/**
 * Company Profile Enrichment Engine (REC-10)
 * Provides contextual company metadata (headcount, funding stage, industry,
 * remote-first culture, and verified engineering highlights) for discovered roles.
 */

export interface CompanyEnrichmentInfo {
  companyName: string
  headcount?: string
  stage?: string
  industry?: string
  isRemoteFirst?: boolean
  verified?: boolean
  cultureHighlights?: string[]
}

/**
 * Curated directory of known top tech employers, global startups,
 * and prominent regional engineering tech hubs.
 */
export const KNOWN_COMPANY_DIRECTORY: Record<string, Partial<CompanyEnrichmentInfo>> = {
  vercel: {
    headcount: "250–500",
    stage: "Series D ($3.25B Valuation)",
    industry: "Developer Tools & Cloud Infrastructure",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Next.js & Frontend Cloud", "Global Distributed Engineering", "High DX Standard"],
  },
  openai: {
    headcount: "1,000–2,500",
    stage: "Growth / Pre-IPO",
    industry: "Artificial Intelligence & Research",
    isRemoteFirst: false,
    verified: true,
    cultureHighlights: ["Frontier Model Research", "High-Throughput Inference", "Mission-Driven"],
  },
  anthropic: {
    headcount: "500–1,000",
    stage: "Series D ($18B+ Valuation)",
    industry: "AI Safety & Foundation Models",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Constitutional AI", "Claude Research Team", "Collaborative Staff Culture"],
  },
  datadog: {
    headcount: "5,000+",
    stage: "Public (NASDAQ: DDOG)",
    industry: "Cloud Observability & Security",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["High Scale Distributed Tracing", "Enterprise Cloud Monitoring", "Modern Microservices"],
  },
  figma: {
    headcount: "1,000–2,500",
    stage: "Growth / Pre-IPO",
    industry: "Design & Real-Time Collaboration",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["WebAssembly In-Browser Canvas", "High Velocity Product Craft", "Maker Culture"],
  },
  gitlab: {
    headcount: "2,000+",
    stage: "Public (NASDAQ: GTLB)",
    industry: "DevSecOps Platform",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["100% Remote-First Pioneer", "Transparent Public Handbook", "Async-First Culture"],
  },
  mongodb: {
    headcount: "5,000+",
    stage: "Public (NASDAQ: MDB)",
    industry: "Data Platforms & Cloud Databases",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Developer Data Platform", "Distributed Query Engines", "Global Cloud Team"],
  },
  sentry: {
    headcount: "250–500",
    stage: "Series E",
    industry: "Developer Tools & Error Tracking",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Open Source Heritage", "Real-Time APM & Profiling", "Engineer-Led"],
  },
  postman: {
    headcount: "1,000–2,500",
    stage: "Series D ($5.6B Valuation)",
    industry: "API Development & Testing Platform",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Global API Standard", "Developer-Led Growth", "Hybrid & Remote Friendly"],
  },
  "scale ai": {
    headcount: "500–1,000",
    stage: "Series F ($14B Valuation)",
    industry: "AI Data Infrastructure",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Generative AI Infrastructure", "Enterprise RLHF Systems", "Fast Execution"],
  },
  stripe: {
    headcount: "7,000+",
    stage: "Growth / Pre-IPO ($65B+ Valuation)",
    industry: "Global Financial Infrastructure",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Five-Nines Availability", "API-First Architecture", "Rigorous Engineering Bar"],
  },
  github: {
    headcount: "3,000+",
    stage: "Subsidiary (Microsoft)",
    industry: "Developer Tools & Version Control",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Home of 100M+ Developers", "Async & Remote-First Work", "Open Source Support"],
  },
  remote: {
    headcount: "1,000+",
    stage: "Series C ($3B Valuation)",
    industry: "Global HR & Payroll Systems",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["100% Distributed Global Team", "Async Principles", "Work from Anywhere"],
  },
  "brain station 23": {
    headcount: "700+",
    stage: "Enterprise Software Services",
    industry: "Fintech, Cloud & Digital Solutions",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Premier Bangladesh Tech Exporter", "AWS & Microsoft Gold Partner", "Large-Scale Agile Teams"],
  },
  "sj innovation": {
    headcount: "150–300",
    stage: "Digital Agency & QA",
    industry: "Web, Mobile & QA Engineering",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Client-Focused Engineering", "Cross-Platform Full Stack", "Employee Growth Focus"],
  },
  "enosis solutions": {
    headcount: "350+",
    stage: "Custom Software Engineering",
    industry: "Enterprise Software & Cloud Systems",
    isRemoteFirst: false,
    verified: true,
    cultureHighlights: ["Established US/EU Partnerships", "Enterprise Quality Standards", "Structured Mentorship"],
  },
  "kaz software": {
    headcount: "100–250",
    stage: "Product Engineering Boutique",
    industry: "Web & Enterprise SaaS",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Agile Delivery", "Boutique Engineering Standards", "Diverse International Clients"],
  },
  cefalo: {
    headcount: "200–500",
    stage: "Scandinavian Consultancy",
    industry: "Software Engineering & Cloud Architecture",
    isRemoteFirst: true,
    verified: true,
    cultureHighlights: ["Nordic Work Culture", "Modern Clean Architecture", "High Work-Life Balance"],
  },
  pathao: {
    headcount: "500–1,000",
    stage: "Series B",
    industry: "Fintech, Mobility & Logistics",
    isRemoteFirst: false,
    verified: true,
    cultureHighlights: ["High Concurrent Scale in BD", "Consumer Tech Ecosystem", "High-Growth Velocity"],
  },
  chaldal: {
    headcount: "1,000+",
    stage: "Series B (Y Combinator Alum)",
    industry: "E-Commerce & Supply Chain Logistics",
    isRemoteFirst: false,
    verified: true,
    cultureHighlights: ["YC Alum (S15)", "Functional Programming in Production (F#)", "Proprietary Automation"],
  },
}

/**
 * Normalizes company names for robust hash matching.
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\-_/\\()]/g, " ")
    .replace(/\b(inc|corp|corporation|llc|ltd|limited|technologies|technology|labs|solutions|gmbh)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Heuristically infers company metadata from the job context
 * when the company is not in the curated directory.
 */
export function inferCompanyMetadataFromJob(
  companyName: string,
  context?: {
    description?: string
    location?: string
    url?: string
    tags?: string[]
  }
): CompanyEnrichmentInfo {
  const desc = (context?.description || "").toLowerCase()
  const loc = (context?.location || "").toLowerCase()
  const combined = `${companyName} ${loc} ${desc}`

  // 1. Stage Detection
  let stage: string | undefined
  if (/\b(series\s+[a-f]|seed\s+round|y\s+combinator|yc\s+[sw]\d{2})\b/i.test(desc)) {
    if (/\b(seed\s+round|yc\s+[sw]\d{2}|y\s+combinator)\b/i.test(desc)) {
      stage = "Seed / Early Stage"
    } else {
      const match = desc.match(/\b(series\s+[a-f])\b/i)
      stage = match ? match[1].toUpperCase() : "Venture Backed"
    }
  } else if (/\b(publicly\s+traded|nasdaq|nyse|ipo)\b/i.test(desc)) {
    stage = "Public"
  } else if (/\b(agency|consultancy|digital\s+services|outsourcing)\b/i.test(desc)) {
    stage = "Agency / Services"
  } else if (/\b(bootstrapped|profitable|profitable\s+saas)\b/i.test(desc)) {
    stage = "Bootstrapped / Profitable"
  }

  // 2. Headcount Detection
  let headcount: string | undefined
  const headcountMatch = desc.match(/\b(\d{1,4}\s*[-–to]\s*\d{1,4}|\d{2,4}\+?)\s*(?:employees|people|team\s+members|staff)\b/i)
  if (headcountMatch) {
    headcount = headcountMatch[0].trim()
  } else if (/\b(startup|small\s+agile\s+team|early\s+stage\s+team)\b/i.test(desc)) {
    headcount = "10–50"
  } else if (/\b(enterprise|multinational|global\s+leader)\b/i.test(desc)) {
    headcount = "1,000+"
  }

  // 3. Industry Detection
  let industry: string | undefined
  if (/\b(fintech|payments|crypto|banking|blockchain)\b/i.test(combined)) {
    industry = "Fintech & Payments"
  } else if (/\b(ai|artificial\s+intelligence|machine\s+learning|llm|deep\s+learning|generative\s+ai)\b/i.test(combined)) {
    industry = "AI & Machine Learning"
  } else if (/\b(devops|infrastructure|cloud|kubernetes|observability|developer\s+tools|api)\b/i.test(combined)) {
    industry = "Developer Tools & Cloud"
  } else if (/\b(health|biotech|medical|healthcare|telehealth)\b/i.test(combined)) {
    industry = "Healthcare & MedTech"
  } else if (/\b(ecommerce|marketplace|retail|d2c|shopping)\b/i.test(combined)) {
    industry = "E-Commerce & Marketplaces"
  } else if (/\b(saas|b2b\s+software|enterprise\s+software)\b/i.test(combined)) {
    industry = "B2B SaaS"
  } else if (/\b(security|cybersecurity|infosec|compliance)\b/i.test(combined)) {
    industry = "Cybersecurity & Privacy"
  }

  // 4. Remote-First Detection
  const isRemoteFirst =
    /\b(remote-first|fully\s+remote|work\s+from\s+anywhere|distributed\s+team|async-first)\b/i.test(combined) ||
    loc.includes("remote")

  // 5. Culture Highlights
  const cultureHighlights: string[] = []
  if (isRemoteFirst) cultureHighlights.push("Remote-First Culture")
  if (/\b(async|asynchronous|no\s+meetings)\b/i.test(desc)) cultureHighlights.push("Async Work Principles")
  if (/\b(open\s+source|oss)\b/i.test(desc)) cultureHighlights.push("Open Source Engaged")
  if (/\b(equity|stock\s+options|rsu)\b/i.test(desc)) cultureHighlights.push("Equity Offering")
  if (/\b(learning\s+budget|education\s+stipend|conference)\b/i.test(desc)) cultureHighlights.push("Continuous Learning Support")

  return {
    companyName,
    headcount,
    stage,
    industry,
    isRemoteFirst,
    verified: false,
    cultureHighlights: cultureHighlights.slice(0, 3),
  }
}

/**
 * Enriches a company with metadata from either the verified directory
 * or contextual heuristics (REC-10).
 */
export function getCompanyEnrichment(
  companyName: string,
  context?: {
    description?: string
    location?: string
    url?: string
    tags?: string[]
  }
): CompanyEnrichmentInfo {
  if (!companyName) {
    return { companyName: "Unknown" }
  }

  const normalized = normalizeCompanyName(companyName)

  // Direct match or partial match in curated directory
  let curated = KNOWN_COMPANY_DIRECTORY[normalized]
  if (!curated) {
    for (const [key, value] of Object.entries(KNOWN_COMPANY_DIRECTORY)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        curated = value
        break
      }
    }
  }

  if (curated) {
    return {
      companyName,
      headcount: curated.headcount,
      stage: curated.stage,
      industry: curated.industry,
      isRemoteFirst: curated.isRemoteFirst ?? true,
      verified: true,
      cultureHighlights: curated.cultureHighlights || [],
    }
  }

  return inferCompanyMetadataFromJob(companyName, context)
}
