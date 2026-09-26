import { prisma, withDbRetry } from "@/lib/prisma"
import { extractTechTagsFromText } from "@/lib/discovery/scrapers"
import { getCompanyEnrichment, type CompanyEnrichmentInfo } from "@/lib/discovery/company-enrichment"
import { isFollowUpDue, calculateBusinessDays } from "@/lib/applications/follow-up-engine"

export interface ApplicationPackageItem {
  application: {
    id: string
    userId: string
    companyName: string
    jobTitle: string
    jobUrl?: string | null
    status: string
    source: string
    applicationDate: string
    createdAt: string
    updatedAt: string
    notes?: string | null
    tags: string[]
  }
  techStack: string[]
  resume: {
    hasTailoredResume: boolean
    tailoredResume: unknown | null
    defaultResumeTitle?: string | null
    defaultResumeUrl?: string | null
    atsScore?: number | null
    resumeAdvice?: unknown | null
  }
  coverLetter: {
    hasCoverLetter: boolean
    text?: string | null
    generatedAt?: string | null
  }
  outreach: {
    hasOutreachDraft: boolean
    subject?: string | null
    body?: string | null
    checklist?: string[] | null
    generatedAt?: string | null
  }
  companyIntel: CompanyEnrichmentInfo
  interviewPrep: {
    hasScheduledInterview: boolean
    interviewDate?: string | null
    interviewRound?: string | null
    interviewMeetingUrl?: string | null
    interviewNotes?: string | null
    gapAnalysis?: unknown | null
  }
  negotiation: {
    hasOfferData: boolean
    offerDetails?: unknown | null
  }
  nextBestAction: {
    type: "SUBMIT_APPLICATION" | "SEND_FOLLOWUP" | "AWAIT_RESPONSE" | "PREP_INTERVIEW" | "BENCHMARK_OFFER" | "RETROSPECTIVE" | "PACKAGE_ASSETS"
    title: string
    description: string
    ctaLabel: string
    href: string
    urgency: "urgent" | "high" | "medium" | "low"
  }
  timeline: Array<{
    fromStatus: string | null
    toStatus: string
    changedAt: string
    metadata?: unknown | null
  }>
}

/**
 * Compiles a comprehensive multi-asset campaign dossier for an application.
 */
export async function compileApplicationPackage(
  userId: string,
  applicationId: string
): Promise<ApplicationPackageItem | null> {
  const application = await withDbRetry(() =>
    prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
      include: {
        company: true,
        analysis: true,
        statusChanges: {
          orderBy: { changedAt: "desc" },
          take: 10,
        },
        tags: {
          include: { tag: true },
        },
      },
    })
  )

  if (!application) {
    return null
  }

  // Fetch candidate's default resume if present
  const defaultResume = await withDbRetry(async () => {
    try {
      if (!prisma.resume?.findFirst) return null
      return await prisma.resume.findFirst({
        where: { userId, isDefault: true },
        select: { id: true, title: true, fileName: true, fileUrl: true },
      })
    } catch {
      return null
    }
  })

  const analysis = application.analysis

  // 1. Tech Stack Extraction (analysis keywords + JD text extraction + tags)
  const techStackSet = new Set<string>()

  if (analysis?.jdKeywords && Array.isArray(analysis.jdKeywords)) {
    for (const kw of analysis.jdKeywords) {
      if (typeof kw === "string" && kw.trim()) {
        techStackSet.add(kw.trim())
      }
    }
  }

  const rawJdSnippet = analysis?.rawJd || application.notes || application.jobTitle
  const extractedTags = extractTechTagsFromText(rawJdSnippet)
  for (const t of extractedTags) {
    techStackSet.add(t)
  }

  if (application.tags && Array.isArray(application.tags)) {
    for (const appTag of application.tags) {
      if (appTag?.tag?.name) {
        techStackSet.add(appTag.tag.name)
      }
    }
  }

  const techStack = Array.from(techStackSet).slice(0, 15)

  // 2. Cover letter resolution
  let coverLetterText: string | null = null
  if (analysis?.applyStrategy && typeof analysis.applyStrategy === "object" && "coverLetter" in analysis.applyStrategy) {
    coverLetterText = (analysis.applyStrategy as { coverLetter?: string }).coverLetter || null
  }
  if (!coverLetterText && analysis?.rawAnalysis) {
    // If cover letter was embedded in raw analysis
    const clMatch = analysis.rawAnalysis.match(/(?:cover letter|dear hiring manager)[\s\S]*?(?=\n\n(?:---|#)|\$)/i)
    if (clMatch) {
      coverLetterText = clMatch[0].trim()
    }
  }

  // 3. Company intelligence enrichment
  const companyIntel = getCompanyEnrichment(
    application.company?.name || application.companyName,
    {
      description: analysis?.rawJd || undefined,
    }
  )

  // 4. Next Best Action determination
  const normStatus = (application.status || "").toLowerCase().trim()
  let nextBestAction: ApplicationPackageItem["nextBestAction"]

  if (normStatus === "staged") {
    nextBestAction = {
      type: "SUBMIT_APPLICATION",
      title: "Review & Submit Staged Application",
      description: "Tailored resume highlights, cover letter, and LinkedIn pitch are pre-assembled.",
      ctaLabel: "Submit Application",
      href: `/applications/${application.id}`,
      urgency: "high",
    }
  } else if (normStatus === "applied" || normStatus === "assessment") {
    if (isFollowUpDue(application)) {
      const refDate = application.applicationDate || application.updatedAt || application.createdAt
      const days = calculateBusinessDays(refDate)
      nextBestAction = {
        type: "SEND_FOLLOWUP",
        title: `Dispatch Follow-Up (${days} business days silent)`,
        description: "Application is dormant past the 5-day SLA. 1-click tailored email draft is ready.",
        ctaLabel: "Review & Send Follow-Up",
        href: `/applications/${application.id}?tab=outreach`,
        urgency: "urgent",
      }
    } else {
      nextBestAction = {
        type: "AWAIT_RESPONSE",
        title: "Awaiting Recruiter Response",
        description: "Application is inside normal review window. Autonomous follow-up triggers after 5 days.",
        ctaLabel: "View Timeline",
        href: `/applications/${application.id}`,
        urgency: "low",
      }
    }
  } else if (normStatus === "interview") {
    const roundName = application.interviewRound || "Interview"
    nextBestAction = {
      type: "PREP_INTERVIEW",
      title: `Practice for ${roundName}`,
      description: "Launch Interview Lab with AI mock questions tailored to your identified knowledge gaps.",
      ctaLabel: "Launch Mock Interview",
      href: `/interview-prep?applicationId=${application.id}`,
      urgency: "urgent",
    }
  } else if (normStatus === "offer") {
    nextBestAction = {
      type: "BENCHMARK_OFFER",
      title: "Benchmark Offer & Review Counter-Offer Strategy",
      description: "Review market percentile benchmarks and 3-tiered counter-offer talking points.",
      ctaLabel: "Review Negotiation Strategy",
      href: `/applications/${application.id}?tab=negotiate`,
      urgency: "high",
    }
  } else if (normStatus === "rejected") {
    nextBestAction = {
      type: "RETROSPECTIVE",
      title: "Feed Learnings to Career Brain",
      description: "Application closed. Weaknesses and interview notes indexed for future matching.",
      ctaLabel: "Explore Similar Opportunities",
      href: "/discovery",
      urgency: "low",
    }
  } else {
    nextBestAction = {
      type: "PACKAGE_ASSETS",
      title: "Tailor Application Package",
      description: "Generate tailored resume highlights and cover letter for this role.",
      ctaLabel: "Package Collateral",
      href: `/applications/${application.id}`,
      urgency: "medium",
    }
  }

  // 5. Authentic ATS / Match Score resolution
  let resolvedAtsScore: number | null = analysis?.matchScore ?? null
  if (!resolvedAtsScore && application.notes) {
    const notesMatch = application.notes.match(/Fit Score:\s*(\d+)%/i)
    if (notesMatch) {
      resolvedAtsScore = parseInt(notesMatch[1], 10)
    }
  }
  if (!resolvedAtsScore) {
    try {
      const match = await prisma.userJobMatch.findFirst({
        where: {
          userId,
          OR: [
            ...(application.jobUrl ? [{ job: { url: application.jobUrl } }] : []),
            {
              job: {
                company: { equals: application.companyName, mode: "insensitive" },
                title: { equals: application.jobTitle, mode: "insensitive" },
              },
            },
          ],
        },
        select: { fitScore: true },
      })
      if (match?.fitScore) {
        resolvedAtsScore = match.fitScore
      }
    } catch {
      // ignore
    }
  }

  // 6. Build Final Package Dossier
  return {
    application: {
      id: application.id,
      userId: application.userId,
      companyName: application.companyName,
      jobTitle: application.jobTitle,
      jobUrl: application.jobUrl,
      status: application.status,
      source: application.source,
      applicationDate: application.applicationDate.toISOString(),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      notes: application.notes,
      tags: application.tags.map((t) => t.tag.name),
    },
    techStack,
    resume: {
      hasTailoredResume: Boolean(analysis?.tailoredResumeJson),
      tailoredResume: analysis?.tailoredResumeJson || null,
      defaultResumeTitle: defaultResume?.title || defaultResume?.fileName || null,
      defaultResumeUrl: defaultResume?.fileUrl || null,
      atsScore: resolvedAtsScore,
      resumeAdvice: analysis?.resumeAdvice || null,
    },
    coverLetter: {
      hasCoverLetter: Boolean(coverLetterText),
      text: coverLetterText,
      generatedAt: (analysis?.analyzedAt || analysis?.outreachGeneratedAt)?.toISOString() || null,
    },
    outreach: {
      hasOutreachDraft: Boolean(analysis?.outreachSubject || analysis?.outreachBody),
      subject: analysis?.outreachSubject || null,
      body: analysis?.outreachBody || null,
      checklist: Array.isArray(analysis?.outreachChecklist)
        ? (analysis?.outreachChecklist as string[])
        : null,
      generatedAt: analysis?.outreachGeneratedAt?.toISOString() || null,
    },
    companyIntel,
    interviewPrep: {
      hasScheduledInterview: Boolean(application.interviewDate),
      interviewDate: application.interviewDate?.toISOString() || null,
      interviewRound: application.interviewRound || null,
      interviewMeetingUrl: application.interviewMeetingUrl || null,
      interviewNotes: application.interviewNotes || null,
      gapAnalysis: analysis?.gapAnalysis || null,
    },
    negotiation: {
      hasOfferData: Boolean(application.offerDetails),
      offerDetails: application.offerDetails || null,
    },
    nextBestAction,
    timeline: application.statusChanges.map((sc) => ({
      fromStatus: sc.fromStatus,
      toStatus: sc.toStatus,
      changedAt: sc.changedAt.toISOString(),
      metadata: sc.metadata,
    })),
  }
}
