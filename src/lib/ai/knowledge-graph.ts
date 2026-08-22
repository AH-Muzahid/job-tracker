/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getCachedJson, setCachedJson } from "@/lib/redis"

export type NodeType = "domain" | "skill" | "project" | "metric" | "role" | "education"
export type RelationType = "BELONGS_TO" | "APPLIED_IN" | "ACHIEVED" | "PROVEN_BY" | "REQUIRES" | "CONNECTED_TO"

export interface GraphNode {
  id: string
  type: NodeType
  name: string
  canonicalName: string
  description?: string
  level?: "beginner" | "intermediate" | "advanced" | "expert"
  years?: number
  category?: string
}

export interface GraphEdge {
  source: string // node id
  target: string // node id
  relation: RelationType
  weight?: number
}

export interface CareerGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  summary?: string
}

export interface GraphMatchResult {
  matchScore: number // 0 - 100
  matchedSkills: Array<{
    skill: string
    canonicalName: string
    level?: string
    proofProjects: Array<{
      projectName: string
      role?: string
      metrics: string[]
    }>
  }>
  missingSkills: string[]
  evidencePaths: string[]
}

// Canonical tech alias map for exact semantic deduplication and matching
const CANONICAL_ALIASES: Record<string, string> = {
  golang: "go",
  go: "go",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  ts: "typescript",
  typescript: "typescript",
  js: "javascript",
  javascript: "javascript",
  postgres: "postgresql",
  postgresql: "postgresql",
  psql: "postgresql",
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  aws: "aws",
  "amazon web services": "aws",
  gcp: "gcp",
  "google cloud": "gcp",
  "google cloud platform": "gcp",
  docker: "docker",
  kafka: "kafka",
  redis: "redis",
  graphql: "graphql",
  rest: "rest-api",
  "rest api": "rest-api",
  tailwind: "tailwindcss",
  tailwindcss: "tailwindcss",
  python: "python",
  django: "django",
  fastapi: "fastapi",
  flask: "flask",
  rust: "rust",
  java: "java",
  "spring boot": "spring-boot",
  springboot: "spring-boot",
  mongodb: "mongodb",
  mongo: "mongodb",
  prisma: "prisma-orm",
  "prisma orm": "prisma-orm",
  ci_cd: "cicd",
  "ci/cd": "cicd",
  cicd: "cicd",
  inngest: "inngest",
  microservices: "microservices",
  "system design": "system-design",
  tdd: "tdd",
  "unit testing": "testing",
  vitest: "vitest",
  jest: "jest",
  playwright: "playwright",
  cypress: "cypress",
}

export function toCanonical(name: string): string {
  const clean = name.toLowerCase().trim().replace(/[^a-z0-9_./-]/g, " ")
  const compacted = clean.replace(/\s+/g, " ").trim()
  return CANONICAL_ALIASES[compacted] || compacted
}

/**
 * Deterministically constructs a Career Knowledge Graph from raw resume/profile text
 */
export function buildCareerGraphFromText(
  text: string,
  profile?: { targetRoles?: string[] | null; strengths?: string | null; bestProjects?: any } | null
): CareerGraphData {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeMap = new Map<string, GraphNode>()

  function addNode(node: Omit<GraphNode, "canonicalName">): GraphNode {
    const canonical = toCanonical(node.name)
    const existing = nodeMap.get(canonical)
    if (existing) return existing

    const fullNode: GraphNode = {
      ...node,
      canonicalName: canonical,
    }
    nodeMap.set(canonical, fullNode)
    nodes.push(fullNode)
    return fullNode
  }

  function addEdge(sourceId: string, targetId: string, relation: RelationType, weight = 1.0) {
    const exists = edges.some(
      (e) => e.source === sourceId && e.target === targetId && e.relation === relation
    )
    if (!exists) {
      edges.push({ source: sourceId, target: targetId, relation, weight })
    }
  }

  // 1. Domains (Root Clusters)
  const domainBackend = addNode({ id: "dom_backend", type: "domain", name: "Backend & Systems" })
  const domainFrontend = addNode({ id: "dom_frontend", type: "domain", name: "Frontend Architecture" })
  const domainDevOps = addNode({ id: "dom_devops", type: "domain", name: "Cloud & DevOps" })
  const domainData = addNode({ id: "dom_data", type: "domain", name: "Databases & Data" })

  // 2. Skill dictionary lookup in text
  const knownSkills: Array<{ name: string; domainNode: GraphNode; level?: "intermediate" | "advanced" | "expert" }> = [
    { name: "Go", domainNode: domainBackend, level: "advanced" },
    { name: "TypeScript", domainNode: domainFrontend, level: "expert" },
    { name: "JavaScript", domainNode: domainFrontend, level: "expert" },
    { name: "React", domainNode: domainFrontend, level: "expert" },
    { name: "Next.js", domainNode: domainFrontend, level: "expert" },
    { name: "Node.js", domainNode: domainBackend, level: "advanced" },
    { name: "Python", domainNode: domainBackend, level: "intermediate" },
    { name: "PostgreSQL", domainNode: domainData, level: "advanced" },
    { name: "Redis", domainNode: domainData, level: "advanced" },
    { name: "Docker", domainNode: domainDevOps, level: "advanced" },
    { name: "Kubernetes", domainNode: domainDevOps, level: "intermediate" },
    { name: "AWS", domainNode: domainDevOps, level: "intermediate" },
    { name: "Kafka", domainNode: domainBackend, level: "intermediate" },
    { name: "TailwindCSS", domainNode: domainFrontend, level: "expert" },
    { name: "GraphQL", domainNode: domainBackend, level: "intermediate" },
    { name: "Prisma", domainNode: domainData, level: "advanced" },
    { name: "Inngest", domainNode: domainBackend, level: "advanced" },
    { name: "System Design", domainNode: domainBackend, level: "advanced" },
    { name: "Microservices", domainNode: domainBackend, level: "advanced" },
    { name: "CI/CD", domainNode: domainDevOps, level: "advanced" },
    { name: "Vitest", domainNode: domainFrontend, level: "advanced" },
    { name: "Playwright", domainNode: domainFrontend, level: "intermediate" },
  ]

  const lowerText = text.toLowerCase()

  const detectedSkillNodes: GraphNode[] = []
  knownSkills.forEach((ks) => {
    const canonical = toCanonical(ks.name)
    const regex = new RegExp(`\\b${ks.name.replace(".", "\\.")}\\b|\\b${canonical}\\b`, "i")
    if (regex.test(lowerText) || (profile?.strengths && profile.strengths.toLowerCase().includes(canonical))) {
      const skillNode = addNode({
        id: `skill_${canonical}`,
        type: "skill",
        name: ks.name,
        level: ks.level || "advanced",
      })
      detectedSkillNodes.push(skillNode)
      addEdge(skillNode.id, ks.domainNode.id, "BELONGS_TO", 1.0)
    }
  })

  // 3. Extract Projects & Connect to Skills
  if (profile?.bestProjects && Array.isArray(profile.bestProjects)) {
    profile.bestProjects.forEach((proj: any, idx: number) => {
      if (!proj.name) return
      const projNode = addNode({
        id: `proj_${idx}_${toCanonical(proj.name)}`,
        type: "project",
        name: proj.name,
        description: proj.description || "",
      })

      // Link stack to project
      if (proj.stack) {
        const stackTokens = String(proj.stack).split(/[,/| ]+/)
        stackTokens.forEach((t) => {
          const canonical = toCanonical(t)
          const matchedSkill = detectedSkillNodes.find((s) => s.canonicalName === canonical)
          if (matchedSkill) {
            addEdge(matchedSkill.id, projNode.id, "APPLIED_IN", 1.5)
          }
        })
      }
    })
  }

  // 4. Extract Quantifiable Metric Nodes from Resume Bullets
  const metricRegex = /(\d+[%+]|\$\d+[kKmM]?|\b\d+x\b|\b\d+\s*(?:ms|sec|users|req\/s|rps|queries|requests)\b)/gi
  const lines = text.split("\n")
  let metricCounter = 0

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.length > 20 && metricRegex.test(trimmed)) {
      metricCounter++
      if (metricCounter <= 8) {
        const metricNode = addNode({
          id: `metric_${metricCounter}`,
          type: "metric",
          name: trimmed.slice(0, 100),
          description: trimmed,
        })

        // Connect metric to skills mentioned in that exact bullet
        detectedSkillNodes.forEach((s) => {
          if (trimmed.toLowerCase().includes(s.name.toLowerCase()) || trimmed.toLowerCase().includes(s.canonicalName)) {
            addEdge(s.id, metricNode.id, "PROVEN_BY", 2.0)
          }
        })
      }
    }
  })

  return {
    nodes,
    edges,
    summary: `Extracted ${detectedSkillNodes.length} key competencies across ${nodes.filter((n) => n.type === "project").length} projects.`,
  }
}

/**
 * Traverses the Career Knowledge Graph against a Job Description to find exact matches & proof paths
 */
export function traverseGraphForJD(
  graph: CareerGraphData,
  jdText: string,
  requiredSkillsList?: string[]
): GraphMatchResult {
  const jdLower = jdText.toLowerCase()
  const matchedSkills: GraphMatchResult["matchedSkills"] = []
  const missingSkills: string[] = []
  const evidencePaths: string[] = []

  const skillNodes = graph.nodes.filter((n) => n.type === "skill")
  const projectNodes = graph.nodes.filter((n) => n.type === "project")
  const metricNodes = graph.nodes.filter((n) => n.type === "metric")

  // Check required skills
  const targetTokens = requiredSkillsList && requiredSkillsList.length > 0
    ? requiredSkillsList
    : Object.keys(CANONICAL_ALIASES)

  const matchedSet = new Set<string>()

  targetTokens.forEach((token) => {
    const canonical = toCanonical(token)
    const isInJD = jdLower.includes(token.toLowerCase()) || jdLower.includes(canonical)
    if (!isInJD) return

    const userSkillNode = skillNodes.find((s) => s.canonicalName === canonical)
    if (userSkillNode) {
      if (matchedSet.has(canonical)) return
      matchedSet.add(canonical)

      // Traverse graph edges to find linked projects
      const appliedInEdges = graph.edges.filter(
        (e) => e.source === userSkillNode.id && e.relation === "APPLIED_IN"
      )
      const provenByEdges = graph.edges.filter(
        (e) => e.source === userSkillNode.id && e.relation === "PROVEN_BY"
      )

      const proofProjects: Array<{ projectName: string; role?: string; metrics: string[] }> = []

      appliedInEdges.forEach((e) => {
        const proj = projectNodes.find((p) => p.id === e.target)
        if (proj) {
          proofProjects.push({
            projectName: proj.name,
            role: proj.description,
            metrics: [],
          })
        }
      })

      const metricsList: string[] = []
      provenByEdges.forEach((e) => {
        const met = metricNodes.find((m) => m.id === e.target)
        if (met) {
          metricsList.push(met.name)
        }
      })

      matchedSkills.push({
        skill: userSkillNode.name,
        canonicalName: userSkillNode.canonicalName,
        level: userSkillNode.level,
        proofProjects,
      })

      if (proofProjects.length > 0) {
        evidencePaths.push(
          `✓ [${userSkillNode.name}] applied in [${proofProjects[0].projectName}]${metricsList.length > 0 ? ` with evidence: "${metricsList[0]}"` : ""}`
        )
      } else if (metricsList.length > 0) {
        evidencePaths.push(`✓ [${userSkillNode.name}] proven by: "${metricsList[0]}"`)
      } else {
        evidencePaths.push(`✓ [${userSkillNode.name}] verified in skill repository (${userSkillNode.level || "competent"})`)
      }
    } else if (requiredSkillsList && requiredSkillsList.includes(token)) {
      if (!missingSkills.includes(token)) {
        missingSkills.push(token)
      }
    }
  })

  // Calculate Match Score
  const totalConsidered = matchedSkills.length + missingSkills.length
  const rawScore = totalConsidered > 0 ? Math.round((matchedSkills.length / totalConsidered) * 100) : 75
  const matchScore = Math.min(Math.max(rawScore, 20), 98)

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    evidencePaths,
  }
}

/**
 * Retrieves the user's cached Career Knowledge Graph from Redis or PostgreSQL
 */
export async function getCachedKnowledgeGraph(userId: string): Promise<CareerGraphData | null> {
  const cacheKey = `user:knowledge-graph:${userId}`
  const cached = await getCachedJson<CareerGraphData>(cacheKey)
  if (cached) return cached

  try {
    const record = await withDbRetry(() =>
      prisma.careerKnowledgeGraph.findUnique({
        where: { userId },
      })
    )

    if (record && record.nodes) {
      const graphData: CareerGraphData = {
        nodes: record.nodes as unknown as GraphNode[],
        edges: record.edges as unknown as GraphEdge[],
        summary: record.summary || undefined,
      }
      void setCachedJson(cacheKey, graphData, 3600)
      return graphData
    }
  } catch (err) {
    console.error("Error retrieving knowledge graph from DB:", err)
  }

  return null
}

/**
 * Saves and updates the user's Career Knowledge Graph in PostgreSQL and Redis
 */
export async function saveKnowledgeGraph(userId: string, graph: CareerGraphData): Promise<boolean> {
  try {
    await withDbRetry(() =>
      prisma.careerKnowledgeGraph.upsert({
        where: { userId },
        create: {
          userId,
          nodes: graph.nodes as any,
          edges: graph.edges as any,
          summary: graph.summary || null,
        },
        update: {
          nodes: graph.nodes as any,
          edges: graph.edges as any,
          summary: graph.summary || null,
        },
      })
    )

    void setCachedJson(`user:knowledge-graph:${userId}`, graph, 3600)
    return true
  } catch (err) {
    console.error("Error saving knowledge graph to DB:", err)
    return false
  }
}
