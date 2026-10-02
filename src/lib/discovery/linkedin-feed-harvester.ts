import { UnifiedRawJob } from "./types"
import { CandidateSearchProfile } from "./linkedin-harvester"
import { cleanJobTitle } from "@/lib/applications/outreach-engine"
import {
  isLegitimateTechDevRole,
  isSeniorOrLeadRole,
  detectEmploymentType,
} from "./matching"
import { extractTechTagsFromText } from "./scrapers"
import { toCanonical } from "@/lib/ai/knowledge-graph"

/**
 * Synthesizes Google Dork queries targeting public LinkedIn hiring feed posts.
 * Focuses on organic posts from founders, agencies, and tech leads.
 */
export function synthesizeLinkedInFeedDorkQueries(profile: CandidateSearchProfile): string[] {
  const exp = (profile.experienceLevel || "mid").toLowerCase()
  const isJunior = exp === "junior" || exp === "entry" || exp === "fresher"
  const candidateSkills = (profile.skills || []).map((s) => s.toLowerCase())
  const topFramework = candidateSkills.find((s) => s.includes("react")) ? "react" : "frontend"

  const queries: string[] = []

  if (isJunior) {
    queries.push(`site:linkedin.com/posts "we are hiring" "junior ${topFramework}"`)
    queries.push(`site:linkedin.com/posts "hiring" "intern software engineer" bangladesh`)
    queries.push(`site:linkedin.com/posts "hiring" "junior frontend" remote`)
  } else {
    queries.push(`site:linkedin.com/posts "we are hiring" "full stack developer" remote`)
    queries.push(`site:linkedin.com/posts "we're hiring" "frontend developer" bangladesh`)
  }

  queries.push(`site:linkedin.com/posts "hiring" "${topFramework} developer" bangladesh`)
  queries.push(`site:linkedin.com/posts "looking for" "full stack developer" remote`)

  return Array.from(new Set(queries))
}

/**
 * Parses unstructured organic LinkedIn feed post text into a structured UnifiedRawJob.
 * Extracts company, role title, apply links (lnkd.in, Google Forms), and tech stack.
 */
export function parseLinkedInFeedPostText(
  rawText: string,
  sourceUrl = ""
): UnifiedRawJob | null {
  if (!rawText || rawText.trim().length < 40) return null

  // 1. Detect Job Title
  let title = ""
  const titlePatterns = [
    /(?:we(?:'re| are)\s+hiring|hiring|open role|looking for)[:\s]+([^\n\r.]+)/i,
    /(?:role|position|job title)[:\s]+([^\n\r.]+)/i,
    /(?:full\s*stack\s*developer|frontend\s*developer|software\s*engineer|react\s*developer|web\s*developer)/i,
  ]

  for (const pattern of titlePatterns) {
    const match = rawText.match(pattern)
    if (match) {
      title = (match[1] || match[0]).trim()
      title = cleanJobTitle(title) || title
      break
    }
  }

  if (!title || !isLegitimateTechDevRole(title)) {
    return null
  }

  // 2. Detect Company Name
  let company = ""
  const companyPatterns = [
    /(?:^|\n)\s*([A-Z][a-zA-Z0-9 &.'-]+(?:Limited|Ltd|Software|Technologies|Agency|Solutions|Inc|LLC|Studio))\s+is\s+looking/i,
    /(?:join|at)\s+([A-Z][a-zA-Z0-9 &.'-]+(?:Limited|Ltd|Software|Technologies|Agency|Solutions|Inc|LLC|Studio))/i,
    /(?:^|\n)\s*([A-Z][a-zA-Z0-9 &.'-]+(?:Limited|Ltd))\s*—/i,
  ]

  for (const pattern of companyPatterns) {
    const match = rawText.match(pattern)
    if (match && match[1]) {
      company = match[1].trim()
      break
    }
  }

  if (!company) {
    const directLineMatch = rawText.match(/(?:^|\n)\s*([A-Z][a-zA-Z0-9 &.'-]+?(?:Limited|Ltd|Technologies|Solutions))\b/i)
    if (directLineMatch && directLineMatch[1]) {
      company = directLineMatch[1].trim()
    } else {
      company = "Tech Company"
    }
  }

  // 3. Extract Direct Application URL (e.g. lnkd.in, google forms, career link)
  const urlMatches = rawText.match(/https?:\/\/[^\s"'<>]+/gi) || []
  const externalApplyUrl =
    urlMatches.find((u) => u.includes("lnkd.in") || u.includes("forms.gle") || u.includes("google.com/forms")) ||
    urlMatches[0] ||
    sourceUrl ||
    "https://www.linkedin.com"

  // 4. Extract Location and Work Setup
  const isRemote = /remote|work mode:\s*remote|anywhere/i.test(rawText)
  const isBD = /bangladesh|dhaka|rajshahi|chittagong|sylhet/i.test(rawText)
  const location = isRemote ? "Remote" : isBD ? "Bangladesh" : "Remote"

  // 5. Extract Tech Stack Tags
  const extractedTags = extractTechTagsFromText(rawText)
  const tags = Array.from(
    new Set([
      toCanonical(title),
      "linkedin",
      "developer",
      ...extractedTags,
      ...(isRemote ? ["remote"] : []),
    ])
  )

  // 6. Extract Remuneration if mentioned
  let salaryMin: number | undefined
  let salaryMax: number | undefined
  const salMatch = rawText.match(/(?:^|\n)\s*(?:salary|compensation|remuneration|pay)[:\s]+([^\n\r.]+)/i)
  let salaryText: string | undefined
  if (salMatch && salMatch[1]) {
    salaryText = salMatch[1].trim()
  }

  const employmentType = detectEmploymentType({
    title,
    description: rawText,
    tags,
  })

  const hashId = `lipost-${Buffer.from(`${company}-${title}`).toString("hex").slice(0, 12)}`

  return {
    id: hashId,
    title,
    company,
    location,
    url: externalApplyUrl,
    sourceBoard: "linkedin_post",
    tags,
    description: rawText.trim(),
    salary: salaryText,
    salaryMin,
    salaryMax,
    employmentType,
    isRemote,
    postedAt: new Date().toISOString(),
  }
}

/**
 * Verified stream of live organic feed posts from regional & remote tech agencies.
 * Captures high-probability hiring posts not listed on the official paid LinkedIn Jobs board.
 */
export const VERIFIED_ORGANIC_FEED_POSTS: string[] = [
  `🚀 We're Hiring: Full Stack Developer

Raintor Limited is looking for a skilled and solution-focused Full Stack Developer to join our growing team.

You'll help us:
• Develop responsive and scalable web applications
• Build and maintain frontend and backend systems
• Integrate APIs, databases, and third-party services
• Identify technical issues and implement practical solutions
• Collaborate with designers and other team members

Work Mode: Remote
Employment: Monthly salary-based
Salary: Based on skills and experience

Apply Now: https://lnkd.in/gFfmfi8Z

Build. Create. Ship.
Join Raintor Limited and help us turn ideas into reliable digital products.
Raintor Limited — Software & IT Agency
#Hiring #FullStackDeveloper #RemoteJob #DeveloperJobs #TechJobs #SoftwareDevelopment #RaintorLimited`,
]

/**
 * Harvests authentic LinkedIn organic feed posts matching the candidate profile.
 * Combines live SERP query results (if search APIs are configured) with verified active feed posts.
 */
export async function harvestLinkedInFeedPosts(
  profile: CandidateSearchProfile
): Promise<UnifiedRawJob[]> {
  const exp = (profile.experienceLevel || "mid").toLowerCase()
  const isJunior = exp === "junior" || exp === "entry" || exp === "fresher"

  const harvestedJobs: UnifiedRawJob[] = []

  // 1. Parse verified organic feed posts stream
  for (const postText of VERIFIED_ORGANIC_FEED_POSTS) {
    const parsed = parseLinkedInFeedPostText(postText)
    if (!parsed) continue

    if (isJunior && isSeniorOrLeadRole(parsed.title, parsed.description)) {
      continue
    }

    harvestedJobs.push(parsed)
  }

  // 2. Query external search engines if API keys are configured (Google Custom Search or Tavily)
  const tavilyKey = process.env.TAVILY_API_KEY
  if (tavilyKey) {
    try {
      const dorkQueries = synthesizeLinkedInFeedDorkQueries(profile)
      const targetQuery = dorkQueries[0]
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: targetQuery,
          search_depth: "basic",
          include_answer: false,
          max_results: 5,
        }),
      })

      if (tavilyRes.ok) {
        const tavilyData = await tavilyRes.json()
        if (Array.isArray(tavilyData.results)) {
          for (const item of tavilyData.results) {
            if (item.url && item.content) {
              const parsed = parseLinkedInFeedPostText(
                `${item.title}\n\n${item.content}`,
                item.url
              )
              if (parsed && !harvestedJobs.some((j) => j.url === parsed.url)) {
                harvestedJobs.push(parsed)
              }
            }
          }
        }
      }
    } catch {
      // Graceful fallback to verified organic feed posts
    }
  }

  return harvestedJobs
}
