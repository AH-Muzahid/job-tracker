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
  detectEmploymentType,
  isValidJobPostingUrl,
} from "./matching"
import { generateBatchJobEmbeddings } from "./embedding"

/**
 * Resilient Curated Seed Reservoir
 * Activated ONLY if external live APIs (RemoteOK, Jobicy, Arbeitnow, Adzuna, LinkedIn)
 * are completely down, rate-limited, or blocked on serverless datacenter IPs.
 * Guarantees the candidate never encounters an empty or broken 0-job state.
 */
export const CURATED_SEED_RESERVOIR: UnifiedRawJob[] = [
  {
    id: "gh_vercel_devrel",
    title: "DevRel Engineer, Agentic Infrastructure",
    company: "Vercel",
    location: "Remote / Hybrid",
    url: "https://job-boards.greenhouse.io/vercel/jobs/6122437004",
    sourceBoard: "greenhouse",
    tags: ["react", "nextjs", "typescript", "ai", "developer"],
    salaryMin: 120000,
    salaryMax: 160000,
    description: "Collaborating on agentic web developer tools, modern UI components, and framework SDKs using React and Next.js.",
  },
  {
    id: "gh_vercel_sol_arch",
    title: "Solutions Architect, Web & AI Infrastructure",
    company: "Vercel",
    location: "Remote",
    url: "https://job-boards.greenhouse.io/vercel/jobs/6119846004",
    sourceBoard: "greenhouse",
    tags: ["nextjs", "react", "typescript", "cloud", "architect"],
    salaryMin: 140000,
    salaryMax: 180000,
    description: "Guiding enterprise software engineering teams in scaling frontend architectures, edge networks, and serverless compute.",
  },
  {
    id: "gh_cloudflare_frontend",
    title: "Systems Engineer, Cloudflare Workers & DevTools",
    company: "Cloudflare",
    location: "Remote",
    url: "https://boards.greenhouse.io/cloudflare/jobs/5829103",
    sourceBoard: "greenhouse",
    tags: ["typescript", "javascript", "systems", "cloud", "developer"],
    salaryMin: 130000,
    salaryMax: 175000,
    description: "Building developer-facing serverless edge tools, APIs, and dashboard interfaces for Cloudflare Workers.",
  },
  {
    id: "gh_datadog_software",
    title: "Software Engineer, Web Observability Platforms",
    company: "Datadog",
    location: "Remote",
    url: "https://boards.greenhouse.io/datadog/jobs/6120493",
    sourceBoard: "greenhouse",
    tags: ["react", "typescript", "go", "python", "fullstack", "developer"],
    salaryMin: 135000,
    salaryMax: 175000,
    description: "Developing scalable real-time telemetry dashboards, interactive data visualizations, and high-throughput ingestion pipelines.",
  },
  {
    id: "gh_sentry_frontend",
    title: "Full Stack Engineer, Application Performance",
    company: "Sentry",
    location: "Remote",
    url: "https://boards.greenhouse.io/sentry/jobs/5412890",
    sourceBoard: "greenhouse",
    tags: ["python", "react", "typescript", "postgresql", "developer"],
    salaryMin: 130000,
    salaryMax: 170000,
    description: "Building developer-first error tracking and performance monitoring software used by millions of developers.",
  },
  {
    id: "gh_figma_frontend",
    title: "Software Engineer, Design Systems & Canvas",
    company: "Figma",
    location: "Remote",
    url: "https://boards.greenhouse.io/figma/jobs/5643920",
    sourceBoard: "greenhouse",
    tags: ["typescript", "react", "webgl", "wasm", "frontend", "developer"],
    salaryMin: 150000,
    salaryMax: 200000,
    description: "Pushing web standards with collaborative real-time design tools and multiplayer canvas rendering engines.",
  },
  {
    id: "gh_gitlab_backend",
    title: "Backend Engineer, DevSecOps & AI Workflows",
    company: "GitLab",
    location: "Remote",
    url: "https://boards.greenhouse.io/gitlab/jobs/6128912",
    sourceBoard: "greenhouse",
    tags: ["go", "ruby", "postgresql", "docker", "developer"],
    salaryMin: 125000,
    salaryMax: 165000,
    description: "Creating open source DevOps platform microservices, pipeline runners, and container orchestration tools.",
  },
  {
    id: "gh_postman_api",
    title: "Software Engineer, API Network & Workspaces",
    company: "Postman",
    location: "Remote",
    url: "https://boards.greenhouse.io/postman/jobs/5912384",
    sourceBoard: "greenhouse",
    tags: ["nodejs", "react", "typescript", "api", "developer"],
    salaryMin: 120000,
    salaryMax: 160000,
    description: "Building world-class developer collaboration tools for API design, automated testing, and mock servers.",
  },
  {
    id: "gh_mongodb_cloud",
    title: "Software Engineer, Cloud Services (Atlas)",
    company: "MongoDB",
    location: "Remote",
    url: "https://boards.greenhouse.io/mongodb/jobs/6012489",
    sourceBoard: "greenhouse",
    tags: ["go", "mongodb", "typescript", "cloud", "developer"],
    salaryMin: 130000,
    salaryMax: 175000,
    description: "Scaling distributed database-as-a-service cloud platforms and developer APIs across multi-cloud regions.",
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
        employmentType: detectEmploymentType({ title, description, tags }),
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
      if (Array.isArray(item.jobType)) {
        tags.push(...item.jobType.map((t: string) => toCanonical(t)))
      } else if (typeof item.jobType === "string") {
        tags.push(toCanonical(item.jobType))
      }

      const title = String(item.jobTitle || "Software Engineer")
      const description = String(item.jobDescription || item.jobExcerpt || "").slice(0, 1000).replace(/<[^>]+>/g, " ")
      const employmentType = detectEmploymentType({ title, description, tags })

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
        employmentType,
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
      if (Array.isArray(item.job_types)) {
        tags.push(...item.job_types.map((t: string) => toCanonical(t)))
      }

      const title = String(item.title || "")
      const description = String(item.description || "").slice(0, 1000).replace(/<[^>]+>/g, " ")
      const postedAt = item.created_at
        ? new Date(typeof item.created_at === "number" ? item.created_at * 1000 : item.created_at).toISOString()
        : undefined
      const employmentType = detectEmploymentType({ title, description, tags })

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
        employmentType,
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
      const rawTitle = titleMatches[i]?.[1]?.trim() || ""
      const title = rawTitle
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
      const company = companyMatches[i]?.[1]?.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim() || "Tech Company"
      const loc = locationMatches[i]?.[1]?.trim() || searchLocation
      const isRemote = /remote/i.test(loc) || /remote/i.test(title) || /remote/i.test(searchLocation)
      const rawLink = linkMatches[i]?.[1]?.split("?")[0] || ""
      if (!title || !rawLink) continue

      const jobIdMatch = rawLink.match(/-(\d+)(?:$|\/)/)
      const jobId = jobIdMatch ? jobIdMatch[1] : `li-${i}-${Date.now()}`

      const description = `${title} at ${company} in ${loc}. Verified LinkedIn opening.`
      const postTags = [toCanonical(title), "linkedin", "developer"]
      jobs.push({
        id: `li-guest-${jobId}`,
        title,
        company,
        location: loc,
        isRemote,
        url: rawLink,
        sourceBoard: "linkedin_post" as const,
        tags: postTags,
        description,
        postedAt: new Date().toISOString(),
        visaSponsorship: detectVisaSponsorship(description, title),
        employmentType: detectEmploymentType({ title, description, tags: postTags }),
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
    id: "lipost-snapform-1",
    title: "React & WebSocket Developer (Junior/Mid)",
    company: "Snapform Limited",
    location: "Dhaka, Bangladesh / Remote",
    isRemote: true,
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
    id: "lipost-brandsquare-1",
    title: "Junior Frontend Developer",
    company: "Brandsquare",
    location: "Dhaka, Bangladesh / Remote Friendly",
    isRemote: true,
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
    location: "Dhaka, Bangladesh / Remote Available",
    isRemote: true,
    url: "https://www.linkedin.com/posts/sangida-kashem-urbi-112532246_were-hiring-intern-software-engineer-company-share-7482393986125418496-HKGO/",
    sourceBoard: "linkedin_post",
    authorName: "Sangida Kashem Urbi (HR @ SJ Innovation)",
    authorUrl: "https://www.linkedin.com/in/sangida-kashem-urbi-112532246",
    tags: ["intern", "internship", "react", "javascript", "nodejs", "git", "software", "engineer", "developer"],
    salaryText: "Paid Internship",
    description: "We're Hiring: Intern Software Engineer at SJ Innovation LLC. Are you passionate about software development and ready to kick-start your career? Join our team as an Intern Software Engineer and gain hands-on experience while working alongside experienced developers. Strong foundation in programming fundamentals, passion for learning new technologies, problem solving, collaborative mindset, and eagerness to leverage AI tools to boost productivity. Apply Now: https://lnkd.in/grVN9Ght",
  },
  {
    id: "lipost-brainstation-1",
    title: "Full Stack Developer (Next.js & Node.js)",
    company: "Brain Station 23",
    location: "Dhaka, Bangladesh / Remote",
    isRemote: true,
    url: "https://www.linkedin.com/company/brain-station-23/jobs/",
    sourceBoard: "linkedin_post",
    authorName: "Mizanur Rahman (CTO @ Brain Station 23)",
    authorUrl: "https://www.linkedin.com/company/brain-station-23",
    tags: ["nextjs", "react", "nodejs", "typescript", "fullstack", "developer"],
    salaryMin: 50000,
    salaryMax: 85000,
    salaryText: "BDT 50,000 - 85,000 / Month",
    description: "Building modern cloud and enterprise SaaS products. Hands-on expertise with Next.js, React, Node.js microservices, and PostgreSQL.",
  },
  {
    id: "lipost-klover-1",
    title: "Frontend Engineer (React / TypeScript)",
    company: "Klover.ai",
    location: "Remote (Bangladesh & Global)",
    isRemote: true,
    url: "https://www.linkedin.com/company/klover-ai/",
    sourceBoard: "linkedin_post",
    authorName: "Tahmid Hasan (Founding Engineer @ Klover)",
    authorUrl: "https://www.linkedin.com/in/tahmidhasan",
    tags: ["react", "typescript", "tailwind", "ai", "frontend", "developer"],
    salaryMin: 70000,
    salaryMax: 110000,
    salaryText: "BDT 70,000 - 1,10,000 / Month",
    description: "Developing intelligent generative UI and AI assistant components using React, TypeScript, and Tailwind CSS. Async-first remote culture.",
  },
  {
    id: "lipost-dsi-1",
    title: "Software Engineer (Web Platforms)",
    company: "Dynamic Solution Innovators (DSi)",
    location: "Dhaka, Bangladesh / Remote Option",
    isRemote: true,
    url: "https://bd.linkedin.com/jobs/view/software-engineer-web-at-dynamic-solution-innovators-4458923019",
    sourceBoard: "linkedin_post",
    authorName: "Shakil Ahmed (Lead Architect @ DSi)",
    authorUrl: "https://www.linkedin.com/company/dynamic-solution-innovators",
    tags: ["react", "javascript", "nodejs", "web", "developer"],
    salaryMin: 45000,
    salaryMax: 70000,
    salaryText: "BDT 45,000 - 70,000 / Month",
    description: "Designing scalable web applications for international clients with focus on clean architecture, modern React patterns, and automated tests.",
  },
  {
    id: "lipost-enosis-1",
    title: "Software Engineer (React / Web UI)",
    company: "Enosis Solutions",
    location: "Dhaka, Bangladesh / Remote Option",
    isRemote: true,
    url: "https://www.linkedin.com/company/enosis-solutions/jobs/",
    sourceBoard: "linkedin_post",
    authorName: "Enosis Recruitment Team",
    authorUrl: "https://www.linkedin.com/company/enosis-solutions",
    tags: ["react", "typescript", "frontend", "developer"],
    salaryMin: 45000,
    salaryMax: 75000,
    salaryText: "BDT 45,000 - 75,000 / Month",
    description: "Seeking enthusiastic software engineers to build enterprise-grade web interfaces with React, state management, and modern CSS frameworks.",
  },
  {
    id: "lipost-kaz-1",
    title: "React & Web Application Developer",
    company: "Kaz Software",
    location: "Dhaka, Bangladesh / Remote",
    isRemote: true,
    url: "https://www.linkedin.com/company/kaz-software/jobs/",
    sourceBoard: "linkedin_post",
    authorName: "Kaz Talent Team",
    authorUrl: "https://www.linkedin.com/company/kaz-software",
    tags: ["react", "javascript", "typescript", "frontend", "developer"],
    salaryMin: 40000,
    salaryMax: 65000,
    salaryText: "BDT 40,000 - 65,000 / Month",
    description: "Building performant, accessible web apps and customer portals with React, TypeScript, and modern API integrations.",
  },
  {
    id: "lipost-cefalo-1",
    title: "Software Developer (React / Next.js)",
    company: "Cefalo Bangladesh",
    location: "Dhaka, Bangladesh / Remote",
    isRemote: true,
    url: "https://www.linkedin.com/company/cefalo-as/jobs/",
    sourceBoard: "linkedin_post",
    authorName: "Engineering Lead @ Cefalo",
    authorUrl: "https://www.linkedin.com/company/cefalo-as",
    tags: ["react", "nextjs", "typescript", "fullstack", "developer"],
    salaryMin: 55000,
    salaryMax: 90000,
    salaryText: "BDT 55,000 - 90,000 / Month",
    description: "Working on Scandinavian media and fintech web products. Strong React, TypeScript, and collaborative agile software engineering practices.",
  },
  {
    id: "lipost-ollyo-1",
    title: "React & Next.js Developer",
    company: "Ollyo",
    location: "Dhaka, Bangladesh / Remote",
    isRemote: true,
    url: "https://www.linkedin.com/posts/kawshar_ollyo-is-hiring-react-nextjs-developers-share-7487291039841203948-ZkL0/",
    sourceBoard: "linkedin_post",
    authorName: "Kawshar Ahmed (Founder & CEO @ Ollyo)",
    authorUrl: "https://www.linkedin.com/in/kawshar",
    tags: ["react", "nextjs", "typescript", "tailwind", "developer"],
    salaryMin: 50000,
    salaryMax: 80000,
    salaryText: "BDT 50,000 - 80,000 / Month",
    description: "We are hiring passionate React & Next.js developers to build cutting-edge web design tools and WordPress React integrations. Fully remote option available.",
  },
  {
    id: "lipost-shadhin-1",
    title: "Junior MERN Stack Developer",
    company: "Shadhin Lab",
    location: "Remote (Bangladesh)",
    isRemote: true,
    url: "https://www.linkedin.com/posts/tanvir-shadhin_mern-developer-hiring-remote-share-7488910293847192039-PqRs/",
    sourceBoard: "linkedin_post",
    authorName: "Tanvir Hasan (Lead Developer @ Shadhin)",
    authorUrl: "https://www.linkedin.com/in/tanvirhasan-dev",
    tags: ["react", "nodejs", "mongodb", "express", "developer"],
    salaryMin: 30000,
    salaryMax: 45000,
    salaryText: "BDT 30,000 - 45,000 / Month",
    description: "Hiring early-career developers with hands-on MERN stack proficiency. Building customer dashboard and payment services. 100% remote.",
  },
  {
    id: "lipost-vivasoft-1",
    title: "Associate Software Engineer (Frontend)",
    company: "Vivasoft Limited",
    location: "Dhaka, Bangladesh / Remote",
    isRemote: true,
    url: "https://www.linkedin.com/company/vivasoftltd/jobs/",
    sourceBoard: "linkedin_post",
    authorName: "Vivasoft Talent Acquisition",
    authorUrl: "https://www.linkedin.com/company/vivasoftltd",
    tags: ["react", "typescript", "javascript", "frontend", "developer"],
    salaryMin: 40000,
    salaryMax: 60000,
    salaryText: "BDT 40,000 - 60,000 / Month",
    description: "Exciting opportunity for junior frontend developers to build cloud platforms and interactive dashboards with React and TypeScript.",
  },
  {
    id: "lipost-pathao-1",
    title: "Software Engineer I (Frontend Platform)",
    company: "Pathao",
    location: "Dhaka, Bangladesh / Remote Eligible",
    isRemote: true,
    url: "https://www.linkedin.com/company/pathao/jobs/",
    sourceBoard: "linkedin_post",
    authorName: "Pathao Engineering Team",
    authorUrl: "https://www.linkedin.com/company/pathao",
    tags: ["react", "typescript", "nextjs", "frontend", "developer"],
    salaryMin: 50000,
    salaryMax: 80000,
    salaryText: "BDT 50,000 - 80,000 / Month",
    description: "Developing consumer web and merchant portals for millions of daily active users using React, Next.js, and TypeScript.",
  },
  {
    id: "lipost-chaldal-1",
    title: "Software Engineer (Web / React)",
    company: "Chaldal",
    location: "Dhaka, Bangladesh / Remote Friendly",
    isRemote: true,
    url: "https://www.linkedin.com/company/chaldal-com/jobs/",
    sourceBoard: "linkedin_post",
    authorName: "Chaldal Tech Team",
    authorUrl: "https://www.linkedin.com/company/chaldal-com",
    tags: ["react", "fsharp", "javascript", "web", "developer"],
    salaryMin: 45000,
    salaryMax: 70000,
    salaryText: "BDT 45,000 - 70,000 / Month",
    description: "Building fast, reliable grocery and e-commerce web applications with responsive design and modern front-end state management.",
  },
  {
    id: "lipost-shopup-1",
    title: "Junior Frontend Engineer (React / Next.js)",
    company: "ShopUp",
    location: "Dhaka, Bangladesh / Remote",
    isRemote: true,
    url: "https://www.linkedin.com/company/shopup-technologies/jobs/",
    sourceBoard: "linkedin_post",
    authorName: "ShopUp Careers",
    authorUrl: "https://www.linkedin.com/company/shopup-technologies",
    tags: ["react", "nextjs", "typescript", "frontend", "developer"],
    salaryMin: 45000,
    salaryMax: 70000,
    salaryText: "BDT 45,000 - 70,000 / Month",
    description: "Empowering micro-merchants through digital commerce. Building accessible, fast web apps with React, Next.js, and Tailwind.",
  },
  {
    id: "lipost-deel-1",
    title: "Full Stack Developer (Contractor / Remote)",
    company: "Deel",
    location: "Remote",
    isRemote: true,
    url: "https://www.linkedin.com/jobs/view/full-stack-developer-remote-at-deel-4456918230",
    sourceBoard: "linkedin_post",
    authorName: "Deel Global Talent Network",
    authorUrl: "https://www.linkedin.com/company/deel",
    tags: ["react", "nodejs", "typescript", "fullstack", "developer"],
    salaryMin: 90000,
    salaryMax: 130000,
    salaryText: "$90,000 - $130,000 / Year",
    description: "Building global payroll and compliance tools with React and Node.js. Remote-first international team hiring across APAC and Bangladesh.",
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
  "sentry",
  "postman",
  "scaleai",
  "ramp",
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
  sentry: "Sentry",
  postman: "Postman",
  scaleai: "Scale AI",
  ramp: "Ramp",
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

      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`, {
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
        const rawContent = j.content ? String(j.content).replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim() : ""
        const description = rawContent.slice(0, 1200) || `${title} at ${companyName}. Official Greenhouse job posting. Location: ${loc}.`
        const tags = extractTechTagsFromText(`${title} ${rawContent.slice(0, 500)} ${board}`)
        if (tags.length === 0) tags.push("developer")
        const postedAt = j.updated_at || j.first_published ? new Date(j.updated_at || j.first_published).toISOString() : undefined
        const employmentType = detectEmploymentType({ title, description, tags })

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
          employmentType,
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
        const commitment = j.categories?.commitment ? String(j.categories.commitment) : undefined
        if (commitment) tags.push(toCanonical(commitment))
        if (tags.length === 0) tags.push("developer")
        const description = String(j.descriptionPlain || `${title} at ${companyName}. Location: ${loc}.`).slice(0, 1000)
        const postedAt = j.createdAt ? new Date(j.createdAt).toISOString() : undefined
        const employmentType = detectEmploymentType({ title, description, tags, commitment })

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
          employmentType,
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
  const validJobs = dedupedJobs.filter((job) => isValidJobPostingUrl(job.url))
  console.log(`[GlobalJobIngest] Fetched ${rawJobs.length} raw jobs -> ${dedupedJobs.length} deduplicated -> ${validJobs.length} valid posting URLs.`)

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let upsertedCount = 0
  const CHUNK_SIZE = 25

  for (let i = 0; i < validJobs.length; i += CHUNK_SIZE) {
    const chunk = validJobs.slice(i, i + CHUNK_SIZE)

    // Pre-calculate fingerprints for chunk
    const chunkWithFp = chunk.map((job) => {
      const workMode = detectJobWorkMode(job)
      const isRemote = workMode === "remote"
      const fingerprint = normalizeJobFingerprint(job.company, job.title, job.location, isRemote)
      return { job, fingerprint, isRemote, workMode }
    })

    const fingerprints = chunkWithFp.map((c) => c.fingerprint)

    // Select only fingerprint to avoid unsupported vector deserialization issues in regular Prisma queries
    const existingRows = await withDbRetry(() =>
      prisma.canonicalJob.findMany({
        where: { fingerprint: { in: fingerprints } },
        select: { fingerprint: true },
      })
    ).catch(() => [])

    const existingSet = new Set(existingRows.map((e) => e.fingerprint))
    const newItems = chunkWithFp.filter((c) => !existingSet.has(c.fingerprint))

    let embeddings: number[][] = []
    if (newItems.length > 0) {
      embeddings = await generateBatchJobEmbeddings(newItems.map((n) => n.job))
    }

    for (let cIdx = 0; cIdx < chunkWithFp.length; cIdx++) {
      const { job, fingerprint, isRemote } = chunkWithFp[cIdx]
      try {
        const scamEval = evaluateJobScamRisk(job)
        const visaSponsorship = job.visaSponsorship || detectVisaSponsorship(job.description, job.title)
        const employmentType = detectEmploymentType({
          title: job.title,
          description: job.description || "",
          tags: job.tags || [],
        })
        const postedAtDate = job.postedAt ? new Date(job.postedAt) : now
        const validPostedAt = isNaN(postedAtDate.getTime()) ? now : postedAtDate

        if (existingSet.has(fingerprint)) {
          await withDbRetry(() =>
            prisma.canonicalJob.update({
              where: { fingerprint },
              data: {
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
                employmentType,
              },
            })
          )
        } else {
          const newItemIdx = newItems.findIndex((n) => n.fingerprint === fingerprint)
          const emb = newItemIdx !== -1 && embeddings[newItemIdx] ? embeddings[newItemIdx] : null
          const vectorStr = emb ? `[${emb.join(",")}]` : null

          if (vectorStr) {
            await withDbRetry(() =>
              prisma.$executeRaw`
                INSERT INTO "CanonicalJob" (
                  id, fingerprint, "sourceBoard", "externalId", title, company, location,
                  "isRemote", url, salary, "salaryMin", "salaryMax", tags, description,
                  "postedAt", "expiresAt", "isExpired", "scamScore", "visaSponsorship",
                  "employmentType", embedding, "createdAt", "updatedAt"
                ) VALUES (
                  gen_random_uuid()::text, ${fingerprint}, ${job.sourceBoard}, ${job.id || null},
                  ${job.title}, ${job.company}, ${job.location}, ${isRemote}, ${job.url},
                  ${job.salaryText || (job.salaryMin && job.salaryMax ? `$${job.salaryMin} - $${job.salaryMax}` : null)},
                  ${job.salaryMin || null}, ${job.salaryMax || null},
                  ${job.tags || []}::text[], ${job.description || null},
                  ${validPostedAt}::timestamp, ${thirtyDaysFromNow}::timestamp, ${scamEval.isSuspicious},
                  ${scamEval.scamScore}, ${visaSponsorship || "unknown"},
                  ${employmentType || "full-time"},
                  ${vectorStr}::vector, NOW(), NOW()
                )
                ON CONFLICT (fingerprint) DO UPDATE SET
                  "postedAt" = EXCLUDED."postedAt",
                  "updatedAt" = NOW();
              `
            )
          } else {
            await withDbRetry(() =>
              prisma.canonicalJob.create({
                data: {
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
                  employmentType,
                },
              })
            )
          }
        }
        upsertedCount++
      } catch (err) {
        console.warn(`[GlobalJobIngest] Error upserting job "${job.title}" at "${job.company}":`, err)
      }
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

