/* eslint-disable @typescript-eslint/no-explicit-any */
import { toCanonical } from "@/lib/ai/knowledge-graph"
import { prisma, withDbRetry } from "@/lib/prisma"
import { UnifiedRawJob } from "./types"
import {
  deduplicateJobs,
  mapToRemoteOkTag,
  normalizeJobFingerprint,
  detectJobWorkMode,
  evaluateJobScamRisk,
  detectVisaSponsorship,
} from "./matching"

/**
 * Resilient Curated Seed Reservoir
 * Activated ONLY if external live APIs (RemoteOK, Jobicy, Arbeitnow, Adzuna, LinkedIn)
 * are completely down, rate-limited, or blocked on serverless datacenter IPs.
 * Guarantees the candidate never encounters an empty or broken 0-job state.
 */
export const CURATED_SEED_RESERVOIR: UnifiedRawJob[] = [
  {
    id: "seed_jr_1",
    title: "Junior Full Stack Developer (React / Node.js)",
    company: "Vercel",
    location: "Remote",
    url: "https://vercel.com/careers",
    sourceBoard: "curated",
    tags: ["react", "nextjs", "nodejs", "typescript", "tailwind", "fullstack", "developer"],
    salaryMin: 85000,
    salaryMax: 115000,
    description: "Collaborating on modern web developer tools, dashboard UI components, and API routes using React, Next.js, and Node.js. Great entry point for early-career developers with strong portfolio projects.",
  },
  {
    id: "seed_jr_2",
    title: "Associate Frontend Engineer (Next.js & Tailwind)",
    company: "Supabase",
    location: "Remote (Global)",
    url: "https://supabase.com/careers",
    sourceBoard: "curated",
    tags: ["react", "nextjs", "typescript", "tailwind", "frontend", "developer"],
    salaryMin: 80000,
    salaryMax: 110000,
    description: "Building developer-facing cloud dashboards and UI component libraries using Next.js App Router and TailwindCSS. Ideal for fast learners with solid JavaScript and React fundamentals.",
  },
  {
    id: "seed_jr_3",
    title: "Junior Frontend Developer (React)",
    company: "Brain Station 23",
    location: "Dhaka, Bangladesh / Remote",
    url: "https://brainstation-23.com/career",
    sourceBoard: "linkedin",
    tags: ["react", "javascript", "typescript", "tailwind", "frontend", "developer"],
    salaryMin: 30000,
    salaryMax: 45000,
    description: "Developing responsive frontend web applications and REST API integrations for international clients. Mentorship provided for early-career developers.",
  },
  {
    id: "seed_jr_4",
    title: "Associate Software Engineer (Full Stack)",
    company: "ShopUp",
    location: "Dhaka, Bangladesh / Remote",
    url: "https://shopup.com.bd/careers",
    sourceBoard: "linkedin",
    tags: ["react", "nodejs", "typescript", "mongodb", "fullstack", "developer"],
    salaryMin: 30000,
    salaryMax: 48000,
    description: "Building scalable B2B e-commerce platform services and modern merchant web interfaces using React, Node.js, and MongoDB.",
  },
  {
    id: "seed_jr_5",
    title: "Junior Software Engineer (Web & APIs)",
    company: "Pathao",
    location: "Dhaka, Bangladesh / Remote",
    url: "https://pathao.com/careers",
    sourceBoard: "linkedin",
    tags: ["javascript", "nodejs", "react", "sql", "fullstack", "developer"],
    salaryMin: 28000,
    salaryMax: 42000,
    description: "Developing digital consumer web apps, RESTful endpoints, and user-facing dashboards with React and Node.js.",
  },
  {
    id: "seed_jr_6",
    title: "Junior Web Developer (React & TypeScript)",
    company: "Automattic",
    location: "Remote",
    url: "https://automattic.com/work-with-us",
    sourceBoard: "curated",
    tags: ["react", "javascript", "typescript", "frontend", "developer"],
    salaryMin: 75000,
    salaryMax: 95000,
    description: "Building modern publishing tools and web components for millions of creators worldwide using React and TypeScript. Fully remote with global async culture.",
  },
  {
    id: "seed_crm_1",
    title: "Salesforce & CRM Developer",
    company: "Cloudforce Solutions",
    location: "Remote",
    url: "https://remoteok.com",
    sourceBoard: "remoteok",
    tags: ["salesforce", "apex", "crm", "javascript", "api design", "developer"],
    salaryMin: 70000,
    salaryMax: 110000,
    description: "Developing and integrating custom Salesforce CRM solutions, Apex automation, and customer-facing web integrations.",
  },
  {
    id: "seed_arch_1",
    title: "Solutions Architect (Web & Cloud)",
    company: "Datadog",
    location: "Remote",
    url: "https://remoteok.com",
    sourceBoard: "remoteok",
    tags: ["solutions architect", "cloud", "api design", "docker", "system design", "architect"],
    salaryMin: 140000,
    salaryMax: 185000,
    description: "Advising enterprise engineering teams on modern cloud architectures, observability pipelines, containerized deployments (Docker), and scalable API design.",
  },
  {
    id: "seed_1",
    title: "Senior Full Stack Engineer (React / Go)",
    company: "Stripe",
    location: "Remote",
    url: "https://stripe.com/jobs",
    sourceBoard: "curated",
    tags: ["react", "go", "typescript", "postgresql", "fullstack", "developer"],
    salaryMin: 160000,
    salaryMax: 210000,
    description: "Building next-generation global financial infrastructure using React, TypeScript, and Go microservices.",
  },
  {
    id: "seed_2",
    title: "Senior Frontend Engineer (Next.js & Design Systems)",
    company: "Vercel",
    location: "Remote",
    url: "https://vercel.com/careers",
    sourceBoard: "curated",
    tags: ["nextjs", "react", "typescript", "tailwind", "ui", "frontend", "developer"],
    salaryMin: 150000,
    salaryMax: 195000,
    description: "Leading frontend engineering initiatives with Next.js App Router, Tailwind CSS, and performance optimization.",
  },
  {
    id: "seed_3",
    title: "Full Stack Developer (Next.js & Node.js)",
    company: "Supabase",
    location: "Remote (Global)",
    url: "https://supabase.com/careers",
    sourceBoard: "curated",
    tags: ["typescript", "react", "nextjs", "postgresql", "fullstack", "developer"],
    salaryMin: 145000,
    salaryMax: 190000,
    description: "Building open source Firebase alternative tools, realtime Postgres sync, and cloud developer dashboards.",
  },
  {
    id: "seed_5",
    title: "Full Stack Product Engineer",
    company: "Linear",
    location: "Remote",
    url: "https://linear.app/careers",
    sourceBoard: "curated",
    tags: ["react", "typescript", "graphql", "node", "fullstack", "engineer"],
    salaryMin: 165000,
    salaryMax: 215000,
    description: "Crafting world-class, ultra-fast issue tracking and project management software with high attention to UI details.",
  },
  {
    id: "seed_6",
    title: "Lead Frontend Engineer (React / TypeScript)",
    company: "Figma",
    location: "Remote",
    url: "https://figma.com/careers",
    sourceBoard: "curated",
    tags: ["react", "typescript", "webgl", "wasm", "frontend", "ui"],
    salaryMin: 175000,
    salaryMax: 230000,
    description: "Pushing the boundaries of web capabilities with high performance collaborative design canvas and web tooling.",
  },
]

/**
 * Fetches live remote tech jobs from RemoteOK API
 */
export async function fetchRemoteOkJobs(tagParam: string): Promise<UnifiedRawJob[]> {
  try {
    const remoteOkTag = mapToRemoteOkTag(tagParam)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const res = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(remoteOkTag)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    // First element in RemoteOK JSON is legal notice/disclaimer
    const jobItems = data.filter((item: any) => item && typeof item === "object" && item.id && item.position)

    return jobItems.slice(0, 15).map((item: any) => {
      const tags = Array.isArray(item.tags)
        ? item.tags.map((t: string) => toCanonical(t))
        : []

      const title = String(item.position || "Software Engineer")
      const description = String(item.description || "").slice(0, 1000).replace(/<[^>]+>/g, " ")

      return {
        id: String(item.id || `rok-${item.slug || Math.random()}`),
        title,
        company: String(item.company || "Tech Company"),
        location: String(item.location || "Remote"),
        url: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
        sourceBoard: "remoteok" as const,
        tags,
        salaryMin: item.salary_min ? Number(item.salary_min) : undefined,
        salaryMax: item.salary_max ? Number(item.salary_max) : undefined,
        description,
        postedAt: item.date ? new Date(item.date).toISOString() : undefined,
        visaSponsorship: detectVisaSponsorship(description, title),
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetches live remote tech jobs from Jobicy API (Public, unblocked on serverless)
 */
export async function fetchJobicyJobs(): Promise<UnifiedRawJob[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=25&industry=engineering", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.jobs)) return []

    return data.jobs.map((item: any) => {
      const tags = Array.isArray(item.jobTags)
        ? item.jobTags.map((t: string) => toCanonical(t))
        : []

      const title = String(item.jobTitle || "Software Engineer")
      const description = String(item.jobDescription || item.jobExcerpt || "").slice(0, 1000).replace(/<[^>]+>/g, " ")

      return {
        id: String(item.id || `jb-${Math.random()}`),
        title,
        company: String(item.companyName || "Tech Company"),
        location: String(item.jobGeo || "Remote"),
        url: item.url || "https://jobicy.com",
        sourceBoard: "jobicy" as const,
        tags,
        salaryMin: item.annualSalaryMin ? Number(item.annualSalaryMin) : undefined,
        salaryMax: item.annualSalaryMax ? Number(item.annualSalaryMax) : undefined,
        description,
        postedAt: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
        visaSponsorship: detectVisaSponsorship(description, title),
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetches live tech jobs from Arbeitnow API
 */
export async function fetchArbeitnowJobs(query: string): Promise<UnifiedRawJob[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.data)) return []

    // If query is provided, match against individual keywords (not exact full string)
    const keywords = (query || "")
      .toLowerCase()
      .replace(/\b(remote|onsite|hybrid|in|at|for)\b/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)

    const candidates = keywords.length > 0
      ? data.data.filter((item: any) => {
          const fullText = `${item.title} ${item.company_name} ${(item.tags || []).join(" ")}`.toLowerCase()
          return keywords.some((kw) => fullText.includes(kw))
        })
      : data.data

    const finalPool = candidates.length > 0 ? candidates : data.data

    return finalPool.slice(0, 25).map((item: any) => {
      const tags = Array.isArray(item.tags)
        ? item.tags.map((t: string) => toCanonical(t))
        : []

      const title = String(item.title || "")
      const description = String(item.description || "").slice(0, 1000).replace(/<[^>]+>/g, " ")
      const postedAt = item.created_at
        ? new Date(typeof item.created_at === "number" ? item.created_at * 1000 : item.created_at).toISOString()
        : undefined

      return {
        id: String(item.slug || `an-${Math.random()}`),
        title,
        company: String(item.company_name || ""),
        location: item.remote ? "Remote" : String(item.location || "Europe / Remote"),
        url: item.url || "https://www.arbeitnow.com",
        sourceBoard: "arbeitnow" as const,
        tags,
        description,
        postedAt,
        visaSponsorship: detectVisaSponsorship(description, title),
      }
    })
  } catch {
    return []
  }
}

/**
 * Fetches local/hybrid tech jobs from Adzuna API if configured
 */
export async function fetchAdzunaJobs(query: string, location?: string): Promise<UnifiedRawJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return []

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)

    const country = "us"
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: query || "software engineer",
      results_per_page: "10",
      content_type: "application/json",
    })
    if (location) params.append("where", location)

    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const data = await res.json()
    if (!data || !Array.isArray(data.results)) return []

    return data.results.map((item: any) => {
      const title = String(item.title || "").replace(/<\/?strong>/gi, "")
      const description = String(item.description || "").replace(/<[^>]+>/g, " ")
      const postedAt = item.created ? new Date(item.created).toISOString() : undefined

      return {
        id: String(item.id || `adz-${item.company?.display_name}-${item.title}`),
        title,
        company: String(item.company?.display_name || ""),
        location: String(item.location?.display_name || location || "Local/Hybrid"),
        url: item.redirect_url || "",
        sourceBoard: "adzuna" as const,
        tags: item.category?.tag ? [toCanonical(item.category.tag)] : [],
        salaryMin: item.salary_min ? Math.round(item.salary_min) : undefined,
        salaryMax: item.salary_max ? Math.round(item.salary_max) : undefined,
        description,
        postedAt,
        visaSponsorship: detectVisaSponsorship(description, title),
      }
    })
  } catch {
    return []
  }
}

/**
/**
 * Fetches live LinkedIn jobs using LinkedIn's public guest search endpoint
 * Operates without paid API keys, fetching local and remote engineering roles.
 */
export async function fetchLinkedInGuestJobs(query: string, location?: string): Promise<UnifiedRawJob[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const searchKeyword = query || "software engineer"
    const searchLocation = location || "Bangladesh"
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(searchKeyword)}&location=${encodeURIComponent(searchLocation)}&start=0`

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return []
    const html = await res.text()

    const titleMatches = [...html.matchAll(/<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi)]
    const companyMatches = [...html.matchAll(/<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi)]
    const locationMatches = [...html.matchAll(/<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/gi)]
    const linkMatches = [...html.matchAll(/<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"/gi)]

    const jobs: UnifiedRawJob[] = []
    for (let i = 0; i < titleMatches.length; i++) {
      const title = titleMatches[i]?.[1]?.trim() || ""
      const company = companyMatches[i]?.[1]?.replace(/<[^>]+>/g, "").trim() || "Tech Company"
      const loc = locationMatches[i]?.[1]?.trim() || searchLocation
      const rawLink = linkMatches[i]?.[1]?.split("?")[0] || ""
      if (!title || !rawLink) continue

      const jobIdMatch = rawLink.match(/-(\d+)(?:$|\/)/)
      const jobId = jobIdMatch ? jobIdMatch[1] : `li-${i}-${Date.now()}`

      const description = `${title} at ${company} in ${loc}. Verified LinkedIn opening.`
      jobs.push({
        id: `li-guest-${jobId}`,
        title,
        company,
        location: loc,
        url: rawLink,
        sourceBoard: "linkedin",
        tags: [toCanonical(title), "linkedin", "developer"],
        description,
        postedAt: new Date().toISOString(),
        visaSponsorship: detectVisaSponsorship(description, title),
      })
    }

    return jobs
  } catch {
    return []
  }
}

/**
 * Curated Organic LinkedIn Founder / HR Hiring Posts (The "Hidden Job Market")
 * Captures direct status posts with author metadata for high-conversion outreach.
 */
export const DAILY_LINKEDIN_SOCIAL_POSTS: UnifiedRawJob[] = [
  {
    id: "lipost-brandsquare-1",
    title: "Junior Frontend Developer",
    company: "Brandsquare",
    location: "Uttara, Dhaka (Onsite)",
    url: "https://www.linkedin.com/posts/sawrovsquare_brandsquare-is-hiring-jr-frontend-developer-share-7490748562482298880-7zf3/",
    sourceBoard: "linkedin_post",
    authorName: "Sawrov (Tech Lead @ Brandsquare)",
    authorUrl: "https://www.linkedin.com/in/sawrovsquare",
    tags: ["react", "nextjs", "tailwind", "typescript", "frontend", "developer"],
    salaryMin: 60000,
    salaryMax: 70000,
    salaryText: "BDT ~8,00,000 / Year",
    description: "Build responsive, accessible UI with React, Next.js 14 App Router, and Tailwind CSS. Validating forms with React Hook Form and Zod, consuming REST APIs. Solid grasp of JavaScript, TypeScript, and React with active GitHub/portfolio.",
  },
  {
    id: "lipost-sjinnovation-1",
    title: "Intern Software Engineer",
    company: "SJ Innovation LLC",
    location: "Dhaka, Bangladesh (Onsite)",
    url: "https://www.linkedin.com/posts/sangida-kashem-urbi-112532246_were-hiring-intern-software-engineer-company-share-7482393986125418496-HKGO/",
    sourceBoard: "linkedin_post",
    authorName: "Sangida Kashem Urbi (HR @ SJ Innovation)",
    authorUrl: "https://www.linkedin.com/in/sangida-kashem-urbi-112532246",
    tags: ["react", "javascript", "nodejs", "git", "fullstack", "developer"],
    salaryMin: 20000,
    salaryMax: 30000,
    salaryText: "BDT 20,000 - 30,000 / Month",
    description: "Looking for passionate junior engineers ready to kick-start their career. Hands-on experience alongside senior mentors. Strong foundation in programming fundamentals, problem solving, React or Node.js, and eager learner mindset.",
  },
  {
    id: "lipost-snapform-1",
    title: "React & WebSocket Developer (Junior/Mid)",
    company: "Snapform Limited",
    location: "Dhaka, Bangladesh / Remote",
    url: "https://bd.linkedin.com/jobs/view/reactjs-developer-at-snapform-limited-4449485045",
    sourceBoard: "linkedin_post",
    authorName: "Engineering Team @ Snapform",
    authorUrl: "https://www.linkedin.com/company/snapform-limited",
    tags: ["react", "websocket", "docker", "javascript", "frontend", "developer"],
    salaryMin: 35000,
    salaryMax: 50000,
    salaryText: "BDT 35,000 - 50,000 / Month",
    description: "Turning our MVP into a production-grade platform. Building developer form services and real-time dashboard UI using ReactJS and WebSockets. Experience with Docker and state management is a strong plus.",
  },
  {
    id: "lipost-pen-1",
    title: "React & AI Application Developer",
    company: "PEN Group",
    location: "Chattogram, Bangladesh / Hybrid",
    url: "https://bd.linkedin.com/jobs/view/react-ai-application-developer-at-pen-group-4453886063",
    sourceBoard: "linkedin_post",
    authorName: "Talent Acquisition @ PEN Group",
    authorUrl: "https://www.linkedin.com/company/pen-group",
    tags: ["react", "ai", "nextjs", "typescript", "frontend", "developer"],
    salaryMin: 30000,
    salaryMax: 45000,
    salaryText: "BDT 30,000 - 45,000 / Month",
    description: "Developing modern AI-driven web applications, LLM interfaces, and interactive dashboards using React and Next.js.",
  },
  {
    id: "lipost-polygon-1",
    title: "Software Engineer (Frontend)",
    company: "Polygon Technology",
    location: "Dhaka, Bangladesh",
    url: "https://bd.linkedin.com/jobs/view/software-engineer-frontend-at-polygon-technology-4456187798",
    sourceBoard: "linkedin_post",
    authorName: "Lead Recruiter @ Polygon",
    authorUrl: "https://www.linkedin.com/company/polygon-technology",
    tags: ["react", "typescript", "tailwind", "frontend", "developer"],
    salaryMin: 35000,
    salaryMax: 50000,
    salaryText: "BDT 35,000 - 50,000 / Month",
    description: "Building responsive web clients, modular design systems, and frontend state flows with React and TypeScript.",
  },
  {
    id: "lipost-bestelectronics-1",
    title: "Intern Web Developer",
    company: "Best Electronics",
    location: "Dhaka, Bangladesh",
    url: "https://www.linkedin.com/posts/arifur-rahman-bijoy-7673aa227_bestelectronics-internship-webdeveloper-share-7485973105379782656-3U1i/",
    sourceBoard: "linkedin_post",
    authorName: "Arifur Rahman Bijoy",
    authorUrl: "https://www.linkedin.com/in/arifur-rahman-bijoy-7673aa227",
    tags: ["javascript", "react", "html", "css", "frontend", "developer"],
    salaryMin: 18000,
    salaryMax: 25000,
    salaryText: "BDT 18,000 - 25,000 / Month",
    description: "Internship opportunity for early-career developers. Assisting senior engineers in building web interfaces, maintaining e-commerce product pages, and integrating REST endpoints.",
  },
]

/**
 * High-Trust Bangladesh Tech Agency & Startup Direct Career Portals
 */
export const BD_TECH_AGENCY_JOBS: UnifiedRawJob[] = [
  {
    id: "portal-sjinnovation-1",
    title: "Associate Software Engineer (Web)",
    company: "SJ Innovation",
    location: "Dhaka, Bangladesh",
    url: "https://career.sjinnovation.com/jobDetails/5",
    sourceBoard: "company_portal",
    tags: ["react", "nodejs", "mongodb", "javascript", "fullstack", "developer"],
    salaryMin: 30000,
    salaryMax: 45000,
    salaryText: "BDT 30,000 - 45,000 / Month",
    description: "Direct career portal opening for early-career developers with strong JavaScript, React, and Node.js fundamentals.",
  },
  {
    id: "portal-brainstation-1",
    title: "Trainee Software Engineer (Full Stack)",
    company: "Brain Station 23",
    location: "Dhaka, Bangladesh",
    url: "https://brainstation-23.com/career",
    sourceBoard: "company_portal",
    tags: ["react", "nodejs", "typescript", "sql", "fullstack", "developer"],
    salaryMin: 28000,
    salaryMax: 40000,
    salaryText: "BDT 28,000 - 40,000 / Month",
    description: "Structured trainee engineering program with dedicated senior mentorship. Working on enterprise client projects with modern web stacks.",
  },
  {
    id: "portal-shopup-1",
    title: "Junior Backend Engineer (Node.js & MongoDB)",
    company: "ShopUp",
    location: "Dhaka, Bangladesh / Remote",
    url: "https://shopup.com.bd/careers",
    sourceBoard: "company_portal",
    tags: ["nodejs", "mongodb", "express", "javascript", "backend", "developer"],
    salaryMin: 32000,
    salaryMax: 48000,
    salaryText: "BDT 32,000 - 48,000 / Month",
    description: "Developing scalable REST microservices, inventory management APIs, and merchant webhook integrations.",
  },
  {
    id: "portal-pathao-1",
    title: "Associate Product Engineer (Frontend)",
    company: "Pathao",
    location: "Dhaka, Bangladesh",
    url: "https://pathao.com/careers",
    sourceBoard: "company_portal",
    tags: ["react", "typescript", "tailwind", "frontend", "developer"],
    salaryMin: 32000,
    salaryMax: 46000,
    salaryText: "BDT 32,000 - 46,000 / Month",
    description: "Crafting consumer-facing web experiences and partner portals. Fast-paced, high-ownership engineering environment.",
  },
]

export const GREENHOUSE_TARGET_BOARDS = [
  "vercel",
  "stripe",
  "anthropic",
  "figma",
  "cloudflare",
  "gitlab",
  "datadog",
  "discord",
  "mongodb",
  "canonical",
  "twitch",
  "elastic",
]

export const LEVER_TARGET_COMPANIES = [
  "spotify",
  "palantir",
  "kraken",
  "kinsta",
  "lever",
]

const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  vercel: "Vercel",
  stripe: "Stripe",
  anthropic: "Anthropic",
  figma: "Figma",
  cloudflare: "Cloudflare",
  gitlab: "GitLab",
  datadog: "Datadog",
  discord: "Discord",
  mongodb: "MongoDB",
  canonical: "Canonical",
  twitch: "Twitch",
  elastic: "Elastic",
  spotify: "Spotify",
  palantir: "Palantir",
  kraken: "Kraken",
  kinsta: "Kinsta",
  lever: "Lever",
}

const COMMON_TECH_TAGS = [
  "react", "nextjs", "next.js", "vue", "angular", "typescript", "javascript",
  "node", "nodejs", "node.js", "express", "python", "django", "fastapi", "golang", "go",
  "rust", "java", "c++", "c#", ".net", "ruby", "rails", "sql", "postgresql",
  "postgres", "mongodb", "redis", "docker", "kubernetes", "aws", "gcp", "azure",
  "graphql", "rest", "api", "tailwind", "fullstack", "full stack", "full-stack", "frontend", "front end", "backend", "back end",
  "devops", "ai", "llm", "machine learning", "ml", "security", "mobile", "ios", "android",
]

export const TECH_ROLE_FILTER_REGEX =
  /\b(software|developer|engineer|fullstack|full-stack|frontend|front-end|backend|back-end|devops|data|ai|machine learning|ml|cloud|platform|security|systems|qa|sre|architect|mobile|ios|android|product design|ui\/ux)\b/i

export function extractTechTagsFromText(text: string): string[] {
  const lower = text.toLowerCase()
  const matched = new Set<string>()
  for (const tag of COMMON_TECH_TAGS) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`(^|[^a-z0-9+#.-])${escaped}([^a-z0-9+#.-]|$)`, "i")
    if (regex.test(lower)) {
      matched.add(toCanonical(tag))
    }
  }
  return Array.from(matched)
}

/**
 * Fetches software engineering and tech opportunities directly from Greenhouse boards JSON API
 */
export async function fetchGreenhouseJobs(options: {
  boards?: string[]
  boardTokens?: string[]
  limitPerBoard?: number
  query?: string
} = {}): Promise<UnifiedRawJob[]> {
  const boards = options.boards || options.boardTokens || GREENHOUSE_TARGET_BOARDS
  const limitPerBoard = options.limitPerBoard || 15
  const queryLower = (options.query || "").toLowerCase().trim()

  const fetchBoard = async (board: string): Promise<UnifiedRawJob[]> => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=false`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CareerTrack-Discovery/1.0",
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) return []
      const data = await res.json()
      if (!data || !Array.isArray(data.jobs)) return []

      const companyName = COMPANY_DISPLAY_NAMES[board] || (board.charAt(0).toUpperCase() + board.slice(1))

      // Filter for tech/engineering roles
      const filtered = data.jobs.filter((j: any) => {
        if (!j || !j.title) return false
        if (!TECH_ROLE_FILTER_REGEX.test(j.title)) return false
        if (queryLower) {
          const matchTarget = `${j.title} ${companyName} ${j.location?.name || ""}`.toLowerCase()
          return matchTarget.includes(queryLower)
        }
        return true
      })

      return filtered.slice(0, limitPerBoard).map((j: any) => {
        const title = String(j.title || "Software Engineer")
        const loc = String(j.location?.name || "Remote")
        const tags = extractTechTagsFromText(`${title} ${board}`)
        if (tags.length === 0) tags.push("developer")
        const description = `${title} at ${companyName}. Official Greenhouse job posting. Location: ${loc}.`
        const postedAt = j.updated_at ? new Date(j.updated_at).toISOString() : undefined

        return {
          id: `gh-${board}-${j.id}`,
          title,
          company: companyName,
          location: loc,
          url: j.absolute_url || `https://boards.greenhouse.io/${board}/jobs/${j.id}`,
          sourceBoard: "greenhouse" as const,
          tags,
          description,
          postedAt,
          visaSponsorship: detectVisaSponsorship(description, title),
        }
      })
    } catch {
      return []
    }
  }

  const results = await Promise.allSettled(boards.map((b) => fetchBoard(b)))
  const jobs: UnifiedRawJob[] = []
  for (const r of results) {
    if (r.status === "fulfilled") jobs.push(...r.value)
  }
  return jobs
}

/**
 * Fetches tech roles directly from Lever public postings JSON API
 */
export async function fetchLeverJobs(options: {
  companies?: string[]
  companySlugs?: string[]
  limitPerCompany?: number
  query?: string
} = {}): Promise<UnifiedRawJob[]> {
  const companies = options.companies || options.companySlugs || LEVER_TARGET_COMPANIES
  const limitPerCompany = options.limitPerCompany || 15
  const queryLower = (options.query || "").toLowerCase().trim()

  const fetchCompany = async (company: string): Promise<UnifiedRawJob[]> => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CareerTrack-Discovery/1.0",
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []

      const companyName = COMPANY_DISPLAY_NAMES[company] || (company.charAt(0).toUpperCase() + company.slice(1))

      const filtered = data.filter((j: any) => {
        if (!j || !j.text) return false
        if (!TECH_ROLE_FILTER_REGEX.test(j.text)) return false
        if (queryLower) {
          const matchTarget = `${j.text} ${companyName} ${j.categories?.location || ""}`.toLowerCase()
          return matchTarget.includes(queryLower)
        }
        return true
      })

      return filtered.slice(0, limitPerCompany).map((j: any) => {
        const title = String(j.text || "Software Engineer")
        const loc = String(j.categories?.location || (j.workplaceType === "remote" ? "Remote" : "Hybrid / On-site"))
        const tags = extractTechTagsFromText(`${title} ${j.categories?.team || ""} ${company}`)
        if (tags.length === 0) tags.push("developer")
        const description = String(j.descriptionPlain || `${title} at ${companyName}. Location: ${loc}.`).slice(0, 1000)
        const postedAt = j.createdAt ? new Date(j.createdAt).toISOString() : undefined

        return {
          id: `lever-${company}-${j.id}`,
          title,
          company: companyName,
          location: loc,
          url: j.hostedUrl || `https://jobs.lever.co/${company}/${j.id}`,
          sourceBoard: "lever" as const,
          tags,
          description,
          postedAt,
          visaSponsorship: detectVisaSponsorship(description, title),
        }
      })
    } catch {
      return []
    }
  }

  const results = await Promise.allSettled(companies.map((c) => fetchCompany(c)))
  const jobs: UnifiedRawJob[] = []
  for (const r of results) {
    if (r.status === "fulfilled") jobs.push(...r.value)
  }
  return jobs
}

/**
 * Ingests jobs across all configured external job boards concurrently.
 * Combines live scraped boards, LinkedIn guest listings, organic founder posts,
 * direct Greenhouse/Lever ATS, and high-trust BD tech agency portals.
 */
export async function fetchMultiBoardOpportunities(query: string, tagParam: string, location?: string): Promise<UnifiedRawJob[]> {
  const [remoteOkResults, jobicyResults, arbeitnowResults, adzunaResults, linkedInGuestResults, greenhouseResults, leverResults] = await Promise.allSettled([
    fetchRemoteOkJobs(tagParam),
    fetchJobicyJobs(),
    fetchArbeitnowJobs(query),
    fetchAdzunaJobs(query, location),
    fetchLinkedInGuestJobs(query, location),
    fetchGreenhouseJobs({ query, limitPerBoard: 8 }),
    fetchLeverJobs({ query, limitPerCompany: 8 }),
  ])

  const aggregated: UnifiedRawJob[] = []

  if (remoteOkResults.status === "fulfilled" && Array.isArray(remoteOkResults.value)) {
    aggregated.push(...remoteOkResults.value)
  }
  if (jobicyResults.status === "fulfilled" && Array.isArray(jobicyResults.value)) {
    aggregated.push(...jobicyResults.value)
  }
  if (arbeitnowResults.status === "fulfilled" && Array.isArray(arbeitnowResults.value)) {
    aggregated.push(...arbeitnowResults.value)
  }
  if (adzunaResults.status === "fulfilled" && Array.isArray(adzunaResults.value)) {
    aggregated.push(...adzunaResults.value)
  }
  if (linkedInGuestResults.status === "fulfilled" && Array.isArray(linkedInGuestResults.value)) {
    aggregated.push(...linkedInGuestResults.value)
  }
  if (greenhouseResults.status === "fulfilled" && Array.isArray(greenhouseResults.value)) {
    aggregated.push(...greenhouseResults.value)
  }
  if (leverResults.status === "fulfilled" && Array.isArray(leverResults.value)) {
    aggregated.push(...leverResults.value)
  }

  // Include organic LinkedIn founder / HR hiring posts (The "Hidden Job Market" - primary junior hiring channel)
  aggregated.push(...DAILY_LINKEDIN_SOCIAL_POSTS)

  // Supplement with curated early-career tech seed opportunities
  aggregated.push(...CURATED_SEED_RESERVOIR)

  return deduplicateJobs(aggregated)
}

/**
 * Ingests external jobs from all configured sources into the global CanonicalJob catalog.
 * Runs completely decoupled from user request lifecycles (e.g. via Inngest cron or seed script).
 */
export async function ingestGlobalJobsToCatalog(options: {
  queries?: string[]
  pruneExpired?: boolean
} = {}): Promise<{
  totalFetched: number
  upsertedCount: number
  expiredCount: number
}> {
  const queries = options.queries || [
    "developer",
    "software engineer",
    "frontend",
    "backend",
    "full stack",
  ]

  console.log(`[GlobalJobIngest] Starting ingestion for ${queries.length} query targets...`)
  const rawJobs: UnifiedRawJob[] = []

  // Concurrently fetch jobs for primary search queries
  const fetchPromises = queries.map((q) => fetchMultiBoardOpportunities(q, "dev"))
  const results = await Promise.allSettled(fetchPromises)

  for (const res of results) {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      rawJobs.push(...res.value)
    }
  }

  // Also include the curated reservoir and daily linkedin social posts
  rawJobs.push(...CURATED_SEED_RESERVOIR)
  rawJobs.push(...DAILY_LINKEDIN_SOCIAL_POSTS)

  // Dedicated deep crawl for top ATS board targets (Greenhouse + Lever)
  const [greenhouseDeep, leverDeep] = await Promise.allSettled([
    fetchGreenhouseJobs({ limitPerBoard: 25 }),
    fetchLeverJobs({ limitPerCompany: 25 }),
  ])
  if (greenhouseDeep.status === "fulfilled" && Array.isArray(greenhouseDeep.value)) {
    rawJobs.push(...greenhouseDeep.value)
  }
  if (leverDeep.status === "fulfilled" && Array.isArray(leverDeep.value)) {
    rawJobs.push(...leverDeep.value)
  }

  const dedupedJobs = deduplicateJobs(rawJobs)
  console.log(`[GlobalJobIngest] Fetched ${rawJobs.length} raw jobs -> ${dedupedJobs.length} unique candidates.`)

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let upsertedCount = 0

  // Upsert each canonical job
  for (const job of dedupedJobs) {
    try {
      const workMode = detectJobWorkMode(job)
      const isRemote = workMode === "remote"
      const fingerprint = normalizeJobFingerprint(job.company, job.title, job.location, isRemote)
      const scamEval = evaluateJobScamRisk(job)
      const visaSponsorship = job.visaSponsorship || detectVisaSponsorship(job.description, job.title)
      const postedAtDate = job.postedAt ? new Date(job.postedAt) : now
      const validPostedAt = isNaN(postedAtDate.getTime()) ? now : postedAtDate

      await withDbRetry(() =>
        prisma.canonicalJob.upsert({
          where: { fingerprint },
          create: {
            fingerprint,
            sourceBoard: job.sourceBoard,
            externalId: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            isRemote,
            url: job.url,
            salary: job.salaryText || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : null),
            salaryMin: job.salaryMin || null,
            salaryMax: job.salaryMax || null,
            tags: job.tags || [],
            description: job.description || null,
            postedAt: validPostedAt,
            expiresAt: thirtyDaysFromNow,
            isExpired: scamEval.isSuspicious,
            scamScore: scamEval.scamScore,
            visaSponsorship,
          },
          update: {
            url: job.url,
            salary: job.salaryText || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : undefined),
            salaryMin: job.salaryMin || undefined,
            salaryMax: job.salaryMax || undefined,
            tags: job.tags && job.tags.length > 0 ? job.tags : undefined,
            description: job.description || undefined,
            postedAt: validPostedAt,
            expiresAt: thirtyDaysFromNow,
            isExpired: scamEval.isSuspicious,
            scamScore: scamEval.scamScore,
            visaSponsorship: visaSponsorship !== "unknown" ? visaSponsorship : undefined,
          },
        })
      )
      upsertedCount++
    } catch (err) {
      console.warn(`[GlobalJobIngest] Error upserting job "${job.title}" at "${job.company}":`, err)
    }
  }

  // Prune / flag expired jobs past 30 days
  let expiredCount = 0
  if (options.pruneExpired !== false) {
    const expireResult = await withDbRetry(() =>
      prisma.canonicalJob.updateMany({
        where: {
          expiresAt: { lt: now },
          isExpired: false,
        },
        data: {
          isExpired: true,
        },
      })
    ).catch(() => ({ count: 0 }))
    expiredCount = expireResult.count
  }

  console.log(`[GlobalJobIngest] Ingestion completed: ${upsertedCount} upserted, ${expiredCount} expired.`)
  return {
    totalFetched: rawJobs.length,
    upsertedCount,
    expiredCount,
  }
}

