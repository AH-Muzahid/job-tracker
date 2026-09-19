export interface PhaseDefinition {
  phaseTitle: string
  instruction: string
}

export function getTurnArchetypePhase({
  interviewType,
  currentCandidateTurn,
  targetTurnCount,
  interviewerName,
  targetRole,
  targetCompany,
}: {
  interviewType: "Technical" | "Behavioral" | "System Design" | "Leadership" | "General"
  currentCandidateTurn: number
  targetTurnCount: number
  interviewerName: string
  targetRole: string
  targetCompany: string
}): PhaseDefinition {
  if (currentCandidateTurn >= targetTurnCount) {
    return {
      phaseTitle: "Wrap-Up & Closing Sign-Off",
      instruction: `
STAGE: FINAL WRAP-UP & CONCLUSION (CRITICAL RULE):
- THIS IS THE END OF THE INTERVIEW. DO NOT ASK ANY MORE QUESTIONS!
- Warmly thank the candidate for their time, highlight that they communicated their points well, and state that the interview is now concluded.
- Verbal cues: "That brings us to the end of our interview today! Thank you so much for your time and thoughtful responses. I am preparing your performance evaluation report now." / (বাংলায়: "চমৎকার! আমাদের আজকের ইন্টারভিউ সেশন এখানেই শেষ হচ্ছে। আপনার মূল্যবান সময় ও চমৎকার উত্তরের জন্য অনেক ধন্যবাদ। আমি এখন আপনার ইভ্যালুয়েশন রিপোর্ট রেডি করছি।")`,
    }
  }

  // Determine stage progression index (0 to 3)
  const normalizedIndex =
    targetTurnCount <= 4
      ? Math.min(currentCandidateTurn, targetTurnCount - 1)
      : Math.min(Math.floor((currentCandidateTurn / (targetTurnCount - 1)) * 4), 3)

  switch (interviewType) {
    case "Behavioral": {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Background & Role Motivation",
          instruction: `
STAGE 1/4 (BEHAVIORAL - INTRODUCTION & MOTIVATION):
- Greet the candidate in 1 short sentence, introduce yourself as ${interviewerName}, and ask them to share their professional background and what motivated them to pursue the ${targetRole} opportunity at ${targetCompany}.`,
        },
        {
          phaseTitle: "STAR: Situation & High Stakes Challenge",
          instruction: `
STAGE 2/4 (BEHAVIORAL - SITUATION & TASK UNDER PRESSURE):
- Acknowledge their intro in 3-4 words.
- Ask for a concrete high-stakes situation: a project with an impossible deadline, severe resource constraint, or conflicting stakeholder priorities. Ask what specific goal they were tasked with delivering.`,
        },
        {
          phaseTitle: "STAR: Action & Conflict Resolution",
          instruction: `
STAGE 3/4 (BEHAVIORAL - PERSONAL ACTION & DISAGREEMENT):
- Acknowledge their situation in 3-4 words.
- Probe the specific personal actions THEY took: how did they handle pushback, disagreement with teammates/leaders, or uncertainty? Do not accept "we did", insist on what *they* individually drove.`,
        },
        {
          phaseTitle: "STAR: Result, Impact & Reflection",
          instruction: `
STAGE 4/4 (BEHAVIORAL - QUANTIFIED IMPACT & RETROSPECTIVE):
- Acknowledge their action in 3-4 words.
- Ask for the measurable, quantifiable outcome of their work and what critical lesson they learned that changed how they work today.`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }

    case "System Design": {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Requirements & Scope Formulation",
          instruction: `
STAGE 1/4 (SYSTEM DESIGN - REQUIREMENTS & CAPACITY ESTIMATION):
- Greet candidate in 1 sentence as ${interviewerName}.
- Pose a high-scale distributed system problem relevant to ${targetRole} at ${targetCompany} (e.g. real-time event ingestion, globally distributed feed, distributed lock manager, or notification engine).
- Ask them to clarify functional vs non-functional requirements and state scale assumptions (QPS, throughput, latency targets).`,
        },
        {
          phaseTitle: "High-Level Architecture & Core Data Entities",
          instruction: `
STAGE 2/4 (SYSTEM DESIGN - HIGH-LEVEL ARCHITECTURE & STORAGE):
- Acknowledge their scope in 3-4 words.
- Ask them to outline the end-to-end architecture: client entrypoints, load balancers, API gateways, core microservices, and database models (SQL vs NoSQL trade-offs).`,
        },
        {
          phaseTitle: "Data Partitioning & Bottleneck Mitigation",
          instruction: `
STAGE 3/4 (SYSTEM DESIGN - DEEP DIVE & SCALING BOTTLENECKS):
- Acknowledge their architectural choices.
- Challenge them on scaling bottlenecks: how will they partition/shard data, prevent hot spots, handle cache invalidation, and ensure read-after-write consistency?`,
        },
        {
          phaseTitle: "Failure Modes, Resiliency & Observability",
          instruction: `
STAGE 4/4 (SYSTEM DESIGN - FAULT TOLERANCE & CHAOS RESILIENCY):
- Acknowledge their scaling approach.
- Push on failure scenarios: what happens during a regional database failover, network partition, or cascade downstream failure? How do they ensure circuit breaking, rate limiting, and 99.99% availability?`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }

    case "Leadership": {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Leadership Philosophy & Engineering Culture",
          instruction: `
STAGE 1/4 (LEADERSHIP - VISION & CULTURE):
- Greet candidate in 1 sentence as ${interviewerName}.
- Ask them about their core leadership philosophy: how do they build high-trust engineering culture, maintain high technical bars, and empower engineers?`,
        },
        {
          phaseTitle: "Mentorship & Performance Management",
          instruction: `
STAGE 2/4 (LEADERSHIP - PEOPLE & MENTORSHIP):
- Acknowledge their philosophy.
- Ask about a specific instance where they coached a struggling engineer or handled an underperforming team member during a high-stress delivery timeline.`,
        },
        {
          phaseTitle: "Cross-Functional Influence & Stakeholder Conflict",
          instruction: `
STAGE 3/4 (LEADERSHIP - INFLUENCE & CONFLICT):
- Acknowledge their answer.
- Ask about navigating intense cross-functional disagreement with Product or Executive leadership when engineering health and business demands clashed.`,
        },
        {
          phaseTitle: "Technical Debt vs Velocity Strategy",
          instruction: `
STAGE 4/4 (LEADERSHIP - ARCHITECTURAL STRATEGY & DEBT):
- Acknowledge their answer.
- Ask how they systematically prioritize and negotiate legacy refactoring and tech debt reduction against rapid roadmap feature pressure.`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }

    case "General": {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Career Journey & Role Alignment",
          instruction: `
STAGE 1/4 (GENERAL - JOURNEY & ALIGNMENT):
- Greet candidate in 1 sentence as ${interviewerName}.
- Ask them to walk through key turning points in their career and why this ${targetRole} role at ${targetCompany} is the ideal next step.`,
        },
        {
          phaseTitle: "Key Accomplishments & Strengths",
          instruction: `
STAGE 2/4 (GENERAL - SIGNATURE ACHIEVEMENT):
- Acknowledge their intro in 3-4 words.
- Ask them to highlight their proudest technical or project achievement and the specific capabilities that enabled them to succeed.`,
        },
        {
          phaseTitle: "Navigating Failure & Technical Adversity",
          instruction: `
STAGE 3/4 (GENERAL - RESILIENCE & OWNERSHIP):
- Acknowledge their achievement.
- Ask about an instance where a major initiative failed, a production bug slipped through, or an assumption was wrong. How did they take ownership and bounce back?`,
        },
        {
          phaseTitle: "Team Collaboration & Values",
          instruction: `
STAGE 4/4 (GENERAL - CULTURE FIT & TEAM DYNAMICS):
- Acknowledge their response.
- Ask how they foster collaboration, handle constructive code reviews, and contribute to high-performing team dynamics.`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }

    case "Technical":
    default: {
      const stages: PhaseDefinition[] = [
        {
          phaseTitle: "Core Fundamentals & Stack Warm-up",
          instruction: `
STAGE 1/4 (TECHNICAL - CORE STACK & CONCURRENCY):
- Greet the candidate in 1 sentence, introduce yourself as ${interviewerName}, and dive directly into a foundational question on their primary stack for ${targetRole} (e.g. event loop/concurrency, memory management, database indexing, or state flow).`,
        },
        {
          phaseTitle: "Algorithmic & Component Architecture",
          instruction: `
STAGE 2/4 (TECHNICAL - IMPLEMENTATION & ALGORITHMS):
- Acknowledge their response in 3-4 words.
- Pose a concrete implementation problem (e.g. designing an in-memory TTL cache, rate limiter token bucket, debounce/throttle mechanism, or recursive tree traversal). Ask for their algorithmic choices and trade-offs.`,
        },
        {
          phaseTitle: "Edge Cases, Race Conditions & Complexity",
          instruction: `
STAGE 3/4 (TECHNICAL - EDGE CASES & HARDENING):
- Acknowledge their design.
- Probe the edge cases: what happens under concurrent writes, race conditions, network failures, or unhandled exceptions? What is the Big-O time and space complexity?`,
        },
        {
          phaseTitle: "Live Incident Debugging & Performance Triage",
          instruction: `
STAGE 4/4 (TECHNICAL - PRODUCTION TRIAGE & OPTIMIZATION):
- Acknowledge their analysis.
- Transition to a live triage scenario: "Your service is experiencing a 99th-percentile latency spike and intermittent 504 errors in production." Ask for their step-by-step diagnostic and remediation process.`,
        },
      ]
      return stages[normalizedIndex] || stages[0]
    }
  }
}
