export interface StatusChange {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
  metadata?: {
    source?: string
    sender?: string
    subject?: string
    intent?: string
    meetingUrl?: string
    round?: string
    interviewDate?: string
    snippet?: string
    [key: string]: unknown
  } | null
}

export interface TagItem {
  tag: { id: string; name: string }
}

export interface Application {
  id: string
  companyName: string
  jobTitle: string
  jobUrl: string | null
  source: string
  applicationDate: string
  status: string
  notes: string | null
  interviewDate?: string | null
  interviewRound?: string | null
  interviewMeetingUrl?: string | null
  interviewNotes?: string | null
  createdAt: string
  updatedAt: string
  tags: TagItem[]
  statusChanges: StatusChange[]
}

export interface WorkbenchAnalysis {
  id?: string
  applicationId?: string
  matchScore: number
  verdict?: string
  confidence?: string
  redFlags?: string
  whyThisScore?: string[]
  missingGaps?: {
    missingKeywords?: string[]
    missingTools?: string[]
  }
  resumeAdvice?: {
    emphasize?: string[]
    foregroundProjects?: string[]
  }
  rawJd?: string | null
  rawAnalysis?: string | null
  outreachSubject?: string | null
  outreachBody?: string | null
  outreachChecklist?: string[] | null
  outreachGeneratedAt?: string | null
  tailoredResumeJson?: Record<string, unknown> | null
  analyzedAt?: string
}

export type OutreachChannel = "email" | "linkedin_dm" | "linkedin_connect" | "follow_up" | "form_portal"

export interface ScreenerQA {
  question: string
  answer: string
}

export interface ConversionJudgeScore {
  score: number // 0-100
  verdict: "approved" | "rejected"
  critique: string[]
  strengths: string[]
}

export interface OutreachChannelBundle {
  email: { subject: string; body: string }
  linkedin_dm: { subject: string; body: string }
  linkedin_connect: { body: string; charCount: number }
  follow_up: { subject: string; body: string }
  form_portal?: { portalNote: string; screenerAnswers: ScreenerQA[] }
}

export interface OutreachDrafts {
  channel?: OutreachChannel
  strategy?: OutreachChannel
  strategyReason?: string
  conversionScore?: number
  conversionJudge?: ConversionJudgeScore | null
  recommendation?: string
  email?: string
  portalNote?: string
  screenerAnswers?: ScreenerQA[]
  coverLetter?: string
  subjectLines?: string[]
  beforeSendChecklist?: string[]
  channels?: OutreachChannelBundle
  detectedEmail?: string | null
  recommendedChannel?: OutreachChannel
}


