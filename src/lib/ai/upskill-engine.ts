import { toCanonical, CANONICAL_ALIASES } from "@/lib/ai/knowledge-graph"

export type GapCategory = "hard" | "domain" | "tooling" | "soft" | "credential"
export type GapPriority = "Critical" | "High" | "Medium" | "Low"
export type GapProvenance = "recorded_gap" | "inferred_from_jd"

export interface JobSkillSource {
  id: string
  title: string
  company: string
  fitScore?: number | null // 0 - 100
  explicitSkills?: string[]
  description?: string
  notes?: string
  recordedGaps?: string[]
}

export interface ExtractedGap {
  name: string
  canonical: string
  category: GapCategory
  count: number // Number of jobs mentioning it
  jobOccurrences?: number
  weightedScore: number // sum of ((100 - fitScore) / 100) * occurrences
  provenance: GapProvenance
  sampleJobs: string[]
}

export interface HeatmapItem extends ExtractedGap {
  priority: GapPriority
  provenanceDescription: string
}

export interface LearningResource {
  title: string
  url: string
  reason: string
  type: "course" | "docs" | "book" | "hands-on"
}

export interface LearningRoadmapItem {
  skill: string
  canonical: string
  priority: GapPriority
  category: GapCategory
  estimatedHours: string
  studyDirection: string
  resources: LearningResource[]
}

/**
 * Categorizes a skill into hard, domain, tooling, soft, or credential
 */
export function categorizeSkill(nameOrCanonical: string): GapCategory {
  const lower = nameOrCanonical.toLowerCase()

  if (/certif|cka|ckad|solutions architect|cissp|pmp/i.test(lower)) {
    return "credential"
  }
  if (
    /leader|communicat|cross-functional|mentor|collaborat|presentat|stakeholder|manag/i.test(
      lower
    )
  ) {
    return "soft"
  }
  if (
    /domain|fintech|health|banking|e-commerce|trading|crypto|climate|security|compliance/i.test(
      lower
    )
  ) {
    return "domain"
  }
  if (
    /kubernetes|docker|terraform|aws|gcp|azure|ci\/cd|cicd|github actions|prometheus|datadog|helm|ansible|linux|observability/i.test(
      lower
    )
  ) {
    return "tooling"
  }

  return "hard"
}

/**
 * Extracts and canonicalizes technical & domain skills from raw text or job descriptions
 */
export function extractSkillsFromText(text: string): string[] {
  if (!text) return []
  const found = new Set<string>()

  // 1. Direct canonical aliases lookup
  for (const [alias, canonical] of Object.entries(CANONICAL_ALIASES)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i")
    if (regex.test(text)) {
      found.add(canonical)
    }
  }

  // 2. Common domain & soft skill tokens
  const patterns: Array<{ regex: RegExp; canonical: string }> = [
    { regex: /\bfintech\b/i, canonical: "fintech-domain" },
    { regex: /\bdistributed\s+systems?\b/i, canonical: "distributed-systems" },
    { regex: /\bterraform\b/i, canonical: "terraform" },
    { regex: /\bkafka\b/i, canonical: "kafka" },
    { regex: /\bcross-functional\s+leadership\b/i, canonical: "cross-functional-leadership" },
    { regex: /\bleadership\b/i, canonical: "cross-functional-leadership" },
    { regex: /\bci[\s/_-]?cd\b/i, canonical: "cicd" },
  ]

  for (const { regex, canonical } of patterns) {
    if (regex.test(text)) {
      found.add(canonical)
    }
  }

  return [...found]
}

/**
 * Extracts skills across job sources with weight calculation and provenance tracking
 */
export function extractSkillsFromJobData(jobs: JobSkillSource[]): ExtractedGap[] {
  const gapMap = new Map<
    string,
    {
      name: string
      canonical: string
      category: GapCategory
      count: number
      weightedScore: number
      hasRecordedGap: boolean
      sampleJobs: Set<string>
    }
  >()

  for (const job of jobs) {
    // Weight per job: (100 - fitScore) / 100. Default fitScore 50 if unspecified.
    const fit = typeof job.fitScore === "number" ? Math.max(0, Math.min(100, job.fitScore)) : 50
    const weight = (100 - fit) / 100

    const seenThisJob = new Map<string, { name: string; isRecordedGap: boolean }>()

    // Priority 1: recorded explicit gaps
    if (job.recordedGaps && job.recordedGaps.length > 0) {
      for (const gapName of job.recordedGaps) {
        const canonical = toCanonical(gapName) || gapName.toLowerCase().trim()
        seenThisJob.set(canonical, { name: gapName, isRecordedGap: true })
      }
    }

    // Priority 2: explicit required skills
    if (job.explicitSkills && job.explicitSkills.length > 0) {
      for (const skillName of job.explicitSkills) {
        const canonical = toCanonical(skillName) || skillName.toLowerCase().trim()
        if (!seenThisJob.has(canonical)) {
          seenThisJob.set(canonical, { name: skillName, isRecordedGap: false })
        }
      }
    }

    // Priority 3: inferred skills from job description or notes
    const descText = `${job.title} ${job.description || ""} ${job.notes || ""}`
    const inferred = extractSkillsFromText(descText)
    for (const canonical of inferred) {
      if (!seenThisJob.has(canonical)) {
        seenThisJob.set(canonical, { name: canonical.replace(/-/g, " "), isRecordedGap: false })
      }
    }

    // Now record all unique skills for this job
    for (const [canonical, { name, isRecordedGap }] of seenThisJob.entries()) {
      const existing = gapMap.get(canonical) || {
        name,
        canonical,
        category: categorizeSkill(name),
        count: 0,
        weightedScore: 0,
        hasRecordedGap: false,
        sampleJobs: new Set<string>(),
      }

      existing.count += 1
      existing.weightedScore += weight
      if (isRecordedGap) existing.hasRecordedGap = true
      if (job.company) existing.sampleJobs.add(job.company)
      gapMap.set(canonical, existing)
    }
  }

  return [...gapMap.values()].map((entry) => ({
    name: entry.name,
    canonical: entry.canonical,
    category: entry.category,
    count: entry.count,
    jobOccurrences: entry.count,
    weightedScore: entry.weightedScore,
    provenance: entry.hasRecordedGap ? "recorded_gap" : "inferred_from_jd",
    sampleJobs: [...entry.sampleJobs],
  }))
}

/**
 * Removes any skills from the gap list that the candidate already has in their profile / graph
 */
export function diffSkillsAgainstProfile(
  rawGaps: ExtractedGap[],
  candidateKnownSkills: string[]
): ExtractedGap[] {
  const candidateCanonicalSet = new Set(
    candidateKnownSkills.map((s) => toCanonical(s) || s.toLowerCase().trim())
  )

  return rawGaps.filter((gap) => {
    if (candidateCanonicalSet.has(gap.canonical)) return false
    // Also check if any known skill is an exact substring or substring match
    for (const known of candidateCanonicalSet) {
      if (gap.canonical === known || gap.canonical.includes(known) || known.includes(gap.canonical)) {
        return false
      }
    }
    return true
  })
}

/**
 * Builds the prioritized Gap Heatmap (Critical, High, Medium, Low)
 */
export function calculateGapHeatmap(gaps: ExtractedGap[]): HeatmapItem[] {
  // Sort descending by weighted score and count
  const sorted = [...gaps].sort((a, b) => {
    if (b.weightedScore !== a.weightedScore) return b.weightedScore - a.weightedScore
    return b.count - a.count
  })

  return sorted.map((gap) => {
    let priority: GapPriority = "Low"

    if (gap.weightedScore >= 2.0 || gap.count >= 4) {
      priority = "Critical"
    } else if (gap.weightedScore >= 1.0 || gap.count >= 2) {
      priority = "High"
    } else if (gap.weightedScore >= 0.5 || gap.count === 2) {
      priority = "Medium"
    } else {
      priority = "Low"
    }

    const provenanceDescription =
      gap.provenance === "recorded_gap"
        ? `${gap.count} jobs (${gap.count} recorded gap)`
        : `${gap.count} jobs (inferred from requirements)`

    return {
      ...gap,
      priority,
      provenanceDescription,
    }
  })
}

// Curated study resource repository
const CURATED_RESOURCES: Record<
  string,
  {
    resources: LearningResource[]
    estimatedHours: string
    getDirection: (known: string[]) => string
  }
> = {
  kubernetes: {
    estimatedHours: "~20h",
    resources: [
      {
        title: "Kubernetes for Absolute Beginners – KodeKloud",
        url: "https://kodekloud.com/courses/certified-kubernetes-administrator-cka/",
        reason: "Hands-on browser labs; universally recommended for practical mastery",
        type: "course",
      },
      {
        title: "Official Kubernetes Concepts Docs",
        url: "https://kubernetes.io/docs/concepts/",
        reason: "Essential mental model of Pods, Services, Deployments, and Ingress",
        type: "docs",
      },
      {
        title: "The Kubernetes Book – Nigel Poulton",
        url: "https://leanpub.com/the-kubernetes-book",
        reason: "Concise, updated annually with modern production patterns",
        type: "book",
      },
    ],
    getDirection: (known) => {
      if (known.includes("docker")) {
        return "You already know Docker and containerization — skip container fundamentals. Start directly at Pod scheduling, Services, and Deployments. Focus on YAML manifests and kubectl before touching Helm."
      }
      return "Start with container runtime basics, then proceed to Pod manifests, Deployments, Services, and ingress controllers."
    },
  },
  kafka: {
    estimatedHours: "~15h",
    resources: [
      {
        title: "Apache Kafka 101 – Confluent Developer",
        url: "https://developer.confluent.io/courses/apache-kafka-101/",
        reason: "Official interactive course covering topics, partitions, and consumers",
        type: "course",
      },
      {
        title: "Designing Data-Intensive Applications – Martin Kleppmann",
        url: "https://dataintensive.net",
        reason: "Industry gold standard for event streams and partitioning mechanics",
        type: "book",
      },
      {
        title: "Apache Kafka Official Documentation",
        url: "https://kafka.apache.org/documentation/",
        reason: "Comprehensive API reference for producers, consumers, and Kafka Streams",
        type: "docs",
      },
    ],
    getDirection: () =>
      "Focus on topic partitioning, consumer groups, offset commit semantics, and idempotency guarantees in distributed event streaming.",
  },
  terraform: {
    estimatedHours: "~12h",
    resources: [
      {
        title: "HashiCorp Learn Terraform Tutorials",
        url: "https://developer.hashicorp.com/terraform/tutorials",
        reason: "Hands-on step-by-step guides for AWS and cloud resource provisioning",
        type: "course",
      },
      {
        title: "Terraform: Up & Running – Yevgeniy Brikman",
        url: "https://www.terraformupandrunning.com/",
        reason: "Best-practice guide for production modules, state locking, and multi-env setups",
        type: "book",
      },
    ],
    getDirection: () =>
      "Prioritize state management, remote S3 backends with DynamoDB locking, reusable modules, and plan/apply workflows in CI/CD.",
  },
  aws: {
    estimatedHours: "~25h",
    resources: [
      {
        title: "AWS Skill Builder – Solutions Architect Path",
        url: "https://explore.skillbuilder.aws/",
        reason: "Official interactive cloud curriculum and labs from AWS",
        type: "course",
      },
      {
        title: "AWS Well-Architected Framework",
        url: "https://aws.amazon.com/architecture/well-architected/",
        reason: "Architectural whitepapers for reliability, security, and cost efficiency",
        type: "docs",
      },
    ],
    getDirection: () =>
      "Focus on IAM least-privilege policies, VPC subnets & routing, ECS/EKS container workloads, and S3 lifecycle rules.",
  },
  rust: {
    estimatedHours: "~30h",
    resources: [
      {
        title: "The Rust Programming Language Book",
        url: "https://doc.rust-lang.org/book/",
        reason: "The definitive guide to ownership, borrowing, and concurrency in Rust",
        type: "book",
      },
      {
        title: "Rustlings Interactive Exercises",
        url: "https://github.com/rust-lang/rustlings",
        reason: "Small guided exercises to get you used to reading and writing Rust code",
        type: "hands-on",
      },
    ],
    getDirection: () =>
      "Focus on ownership, lifetimes, borrowing checks, pattern matching, and Result/Option error handling before advancing to async Tokio.",
  },
  "distributed-systems": {
    estimatedHours: "~25h",
    resources: [
      {
        title: "Designing Data-Intensive Applications",
        url: "https://dataintensive.net",
        reason: "The indispensable handbook for modern scalable backend systems",
        type: "book",
      },
      {
        title: "MIT 6.824: Distributed Systems Labs",
        url: "https://pdos.csail.mit.edu/6.824/",
        reason: "World-class course lectures and labs on Raft consensus and replication",
        type: "course",
      },
    ],
    getDirection: () =>
      "Study distributed transactions, consensus algorithms (Raft/Paxos), CQRS, event sourcing, and CAP theorem trade-offs.",
  },
}

/**
 * Generates actionable learning roadmap for identified skill gaps
 */
export function generateLearningRoadmap(
  heatmapGaps: HeatmapItem[] | ExtractedGap[],
  candidateKnownSkills: string[]
): LearningRoadmapItem[] {
  const targetGaps = heatmapGaps.slice(0, 5) // Top 5 priority gaps
  const knownCanonical = candidateKnownSkills.map(
    (s) => toCanonical(s) || s.toLowerCase().trim()
  )

  return targetGaps.map((gap) => {
    const priority: GapPriority =
      "priority" in gap && typeof (gap as HeatmapItem).priority === "string"
        ? (gap as HeatmapItem).priority
        : "High"
    const curated = CURATED_RESOURCES[gap.canonical]

    if (curated) {
      return {
        skill: gap.name,
        canonical: gap.canonical,
        priority,
        category: gap.category,
        estimatedHours: curated.estimatedHours,
        studyDirection: curated.getDirection(knownCanonical),
        resources: curated.resources,
      }
    }

    // Fallback dynamic resources for arbitrary gaps
    const displayName = gap.name.charAt(0).toUpperCase() + gap.name.slice(1)
    return {
      skill: displayName,
      canonical: gap.canonical,
      priority,
      category: gap.category,
      estimatedHours: "~15h",
      studyDirection: `Build practical familiarity with ${displayName} by exploring core concepts, creating a sandbox project, and reviewing production architecture guidelines.`,
      resources: [
        {
          title: `${displayName} Official Documentation`,
          url: `https://www.google.com/search?q=${encodeURIComponent(gap.name + " official documentation")}`,
          reason: "Primary source for architecture, syntax, and getting-started tutorials",
          type: "docs",
        },
        {
          title: `Awesome ${displayName} Curated Resources`,
          url: `https://github.com/search?q=${encodeURIComponent("awesome " + gap.name)}`,
          reason: "Community curated lists of best-practice libraries, articles, and guides",
          type: "hands-on",
        },
      ],
    }
  })
}

/**
 * Targeted mode: Instant skill gap analysis for a single job description
 */
export function analyzeJobSkillGapsTargeted(
  jobDescription: string,
  candidateKnownSkills: string[]
): {
  missingSkills: Array<{ name: string; canonical: string; category: GapCategory }>
  coveredSkills: Array<{ name: string; canonical: string }>
} {
  const extracted = extractSkillsFromText(jobDescription)
  const candidateCanonicalSet = new Set(
    candidateKnownSkills.map((s) => toCanonical(s) || s.toLowerCase().trim())
  )

  const missingSkills: Array<{ name: string; canonical: string; category: GapCategory }> = []
  const coveredSkills: Array<{ name: string; canonical: string }> = []

  for (const canonical of extracted) {
    if (candidateCanonicalSet.has(canonical)) {
      coveredSkills.push({ name: canonical.replace(/-/g, " "), canonical })
    } else {
      missingSkills.push({
        name: canonical.replace(/-/g, " "),
        canonical,
        category: categorizeSkill(canonical),
      })
    }
  }

  return { missingSkills, coveredSkills }
}
