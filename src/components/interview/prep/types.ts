export interface PrepNote {
  id: string
  title: string
  content: string
  category: string
  application?: { id: string; companyName: string; jobTitle: string } | null
  createdAt: string
}

export interface InterviewSessionItem {
  id: string
  targetRole: string
  targetCompany: string
  interviewType: string
  language: string
  score: number | null
  verdict: string | null
  dialogue: Array<{ role: string; text: string; timestamp?: string }>
  report: {
    overallScore?: number
    technicalScore?: number
    clarityScore?: number
    verdict?: string
    executiveSummary?: string
    strengths?: string[]
    improvementAreas?: string[]
    starBreakdown?: {
      situation?: string
      task?: string
      action?: string
      result?: string
    }
  } | null
  createdAt: string
}

export interface StudyDiscussionMessage {
  role: "user" | "assistant"
  content: string
  topic?: string
  timestamp: string
}

export type PrepTabType = "study" | "sessions" | "notes"
