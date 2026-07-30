export interface StatusChange {
  id: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
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
