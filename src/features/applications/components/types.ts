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
}

export interface OutreachDrafts {
  recommendation?: string
  email?: string
  coverLetter?: string
  subjectLines?: string[]
  beforeSendChecklist?: string[]
}
